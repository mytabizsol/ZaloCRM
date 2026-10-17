import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';
import { randomUUID } from 'node:crypto';
import { runFollowupRules } from './followup-engine.js';

type Rule = { id:string; name:string; enabled:boolean; stage:string; inactiveDays:number; action:'flag' };
function normalize(input: unknown): Rule[] {
  if (!Array.isArray(input) || input.length > 30) throw Error('Too many rules');
  return input.map((r:any) => {
    if (!r || typeof r.name!=='string' || !r.name.trim() || r.name.length>100 ||
      typeof r.enabled!=='boolean' || !['new','contacted','interested','any'].includes(r.stage) ||
      !Number.isInteger(r.inactiveDays) || r.inactiveDays<1 || r.inactiveDays>365 || r.action!=='flag')
      throw Error('Invalid rule');
    return {id:typeof r.id==='string'&&r.id.length<61?r.id:randomUUID(),name:r.name.trim(),
      enabled:r.enabled,stage:r.stage,inactiveDays:r.inactiveDays,action:'flag' as const};
  });
}
export async function workflowRoutes(app:FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  async function read(orgId:string):Promise<Rule[]> {
    const s=await prisma.appSetting.findFirst({where:{orgId,settingKey:'crm_workflow_rules_v1'}});
    return s?.valuePlain ? normalize(JSON.parse(s.valuePlain)) : [];
  }
  app.get('/api/v1/automation/rules', async req=>({rules:await read(req.user!.orgId)}));
  app.put('/api/v1/automation/rules',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    let rules:Rule[];
    try {rules=normalize((req.body as any)?.rules);} catch {return reply.code(400).send({error:'Invalid rules'});}
    const orgId=req.user!.orgId, settingKey='crm_workflow_rules_v1';
    await prisma.appSetting.upsert({where:{orgId_settingKey:{orgId,settingKey}},
      create:{orgId,settingKey,valuePlain:JSON.stringify(rules)},
      update:{valuePlain:JSON.stringify(rules)}});
    return {rules};
  });
  app.get('/api/v1/automation/preview',async req=>{
    const rules=(await read(req.user!.orgId)).filter(r=>r.enabled);
    const results=await Promise.all(rules.map(async r=>({...r,matchedContacts:
      await prisma.contact.count({where:{orgId:req.user!.orgId,
        status:r.stage==='any'?{in:['new','contacted','interested']}:r.stage,
        updatedAt:{lt:new Date(Date.now()-r.inactiveDays*86400000)}}})})));
    return {results,execution:'preview-only'};
  });
  // Owner/admin can run manually; production scheduler processes enabled rules daily.
  app.post('/api/v1/automation/run', {preHandler: requireRole('owner','admin')}, async (req,reply) => {
    try {
      const rules = await read(req.user!.orgId);
      const stats = await runFollowupRules(req.user!.orgId, rules, req.user!.id);
      return reply.send(stats);
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({error:'Execution failed'});
    }
  });
  app.get('/api/v1/automation/history', async req => {
    const activities = await prisma.activityLog.findMany({
      where: {orgId:req.user!.orgId,action:'automation.followup'},
      select: {id:true,entityId:true,details:true,createdAt:true},
      orderBy: {createdAt:'desc'},take:100,
    });
    return {activities};
  });
}
