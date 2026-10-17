import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';

type JournalDraft = {
  id:string; text:string; images:string[]; createdAt:string; updatedAt:string;
};
const setting=(userId:string)=>'myta_zalo_journal_drafts_'+userId;
function validate(input:unknown):JournalDraft[]{
  if(!Array.isArray(input)||input.length>30)throw Error('Too many drafts');
  return input.map((draft:any)=>{
    if(!draft || typeof draft.text!=='string' || draft.text.length>5000 ||
      !draft.text.trim() && (!Array.isArray(draft.images)||!draft.images.length)) throw Error('Invalid content');
    if(!Array.isArray(draft.images)||draft.images.length>9 ||
      draft.images.some((url:unknown)=>typeof url!=='string'||url.length>2048||!/^https:\/\//.test(url)))throw Error('Invalid images');
    const id=typeof draft.id==='string'&&/^[\w-]{1,70}$/.test(draft.id)?draft.id:randomUUID();
    const now=new Date().toISOString();
    return {id,text:draft.text.trim(),images:draft.images,
      createdAt:typeof draft.createdAt==='string' && !Number.isNaN(Date.parse(draft.createdAt))?draft.createdAt:now,
      updatedAt:now};
  });
}
export async function journalDraftRoutes(app:FastifyInstance) {
  app.addHook('preHandler',authMiddleware);
  app.get('/api/v1/journal/drafts',async req=>{
    const orgId=req.user!.orgId,settingKey=setting(req.user!.id);
    const item=await prisma.appSetting.findUnique({where:{orgId_settingKey:{orgId,settingKey}}});
    return {drafts:item?.valuePlain?JSON.parse(item.valuePlain):[],
      canPublishPersonal:false,
      explanation:'The installed unofficial Zalo SDK has no verified personal timeline publishing API.'};
  });
  app.put('/api/v1/journal/drafts',async(req,reply)=>{
    let drafts:JournalDraft[];
    try{drafts=validate((req.body as any)?.drafts);}
    catch{return reply.code(400).send({error:'Tối đa 30 bản nháp, 5000 ký tự/bài, 9 ảnh HTTPS/bài'});}
    const orgId=req.user!.orgId,settingKey=setting(req.user!.id);
    await prisma.appSetting.upsert({where:{orgId_settingKey:{orgId,settingKey}},
      create:{orgId,settingKey,valuePlain:JSON.stringify(drafts)},
      update:{valuePlain:JSON.stringify(drafts)}});
    return {drafts};
  });
}
