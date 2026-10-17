import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';

type Snippet = { id: string; title: string; text: string };
const settingKey = 'crm_quick_replies_v1';
const defaults: Snippet[] = [
  { id: 'greeting', title: 'Chào khách', text: 'Xin chào {{name}}! Em có thể hỗ trợ mình thông tin gì ạ?' },
  { id: 'request', title: 'Xin thông tin', text: 'Anh/chị vui lòng chia sẻ nhu cầu và số điện thoại để bên em tư vấn chi tiết nhé.' },
  { id: 'ack', title: 'Xác nhận', text: 'Em đã nhận được thông tin. Em sẽ kiểm tra và phản hồi sớm nhất có thể.' },
  { id: 'thanks', title: 'Cảm ơn', text: 'Cảm ơn anh/chị đã liên hệ và quan tâm đến dịch vụ của bên em!' },
];
function validate(input:unknown):Snippet[] {
  if (!Array.isArray(input) || input.length>30) throw Error('Invalid template list');
  const ids = new Set<string>();
  return input.map((s:any)=>{
    if (!s || typeof s.title!=='string' || typeof s.text!=='string' ||
      !s.title.trim() || s.title.length>70 || !s.text.trim() || s.text.length>1500)
      throw Error('Invalid template data');
    const id=typeof s.id==='string' && /^[a-zA-Z0-9_-]{1,60}$/.test(s.id)
      ? s.id : randomUUID();
    if(ids.has(id)) throw Error('Duplicate template ID');
    ids.add(id);
    return {id,title:s.title.trim(),text:s.text.trim()};
  });
}
export async function quickReplyRoutes(app:FastifyInstance) {
  app.addHook('preHandler',authMiddleware);
  app.get('/api/v1/chat/quick-replies',async req=>{
    const s=await prisma.appSetting.findUnique({
      where:{orgId_settingKey:{orgId:req.user!.orgId,settingKey}},
      select:{valuePlain:true},
    });
    return {templates:s?.valuePlain?validate(JSON.parse(s.valuePlain)):defaults};
  });
  app.put('/api/v1/chat/quick-replies',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    let templates:Snippet[];
    try {templates=validate((req.body as any)?.templates);}
    catch {return reply.code(400).send({error:'Tối đa 30 mẫu, tên không quá 70 ký tự, nội dung không quá 1500 ký tự'});}
    const orgId=req.user!.orgId;
    await prisma.appSetting.upsert({
      where:{orgId_settingKey:{orgId,settingKey}},
      create:{orgId,settingKey,valuePlain:JSON.stringify(templates)},
      update:{valuePlain:JSON.stringify(templates)},
    });
    return {templates};
  });
}
