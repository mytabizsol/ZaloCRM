import type { FastifyInstance } from 'fastify';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';

const uid=()=>randomBytes(16).toString('hex');
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const goodDomain=(s:string)=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&u.hostname.includes('.')&&!u.username&&!u.password&&!u.pathname.slice(1);}catch{return false;}};
function strip(text:unknown,max:number){return typeof text==='string'?text.trim().slice(0,max):'';}
export async function websiteChatAdminRoutes(app:FastifyInstance){
  app.addHook('preHandler',authMiddleware);
  app.get('/api/v1/website-chat/widgets',async req=>({
    widgets:await prisma.websiteChatWidget.findMany({where:{orgId:req.user!.orgId},orderBy:{createdAt:'desc'}}),
  }));
  app.post('/api/v1/website-chat/widgets',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const b=(req.body||{}) as Record<string,unknown>;
    const title=strip(b.title,100),domain=strip(b.domain,250),welcome=strip(b.welcome,250);
    const accent=strip(b.accent,20)||'#2563EB';
    if(!title||!goodDomain(domain)||!/^#[0-9a-fA-F]{6}$/.test(accent))
      return reply.code(400).send({error:'Cần tên, origin website hợp lệ (https://tenmien.vn) và màu HEX'});
    const count=await prisma.websiteChatWidget.count({where:{orgId:req.user!.orgId}});
    if(count>=20)return reply.code(409).send({error:'Tối đa 20 widget mỗi tổ chức'});
    const widget=await prisma.websiteChatWidget.create({data:{
      orgId:req.user!.orgId,publicKey:uid(),title,domain:new URL(domain).origin,welcome,accent,
    }});
    return reply.code(201).send({widget});
  });
  app.put('/api/v1/website-chat/widgets/:id',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const {id}=req.params as {id:string};const b=(req.body||{}) as Record<string,unknown>;
    const w=await prisma.websiteChatWidget.findFirst({where:{id,orgId:req.user!.orgId}});
    if(!w)return reply.code(404).send({error:'Not found'});
    const title=strip(b.title,100)||w.title,domain=strip(b.domain,250)||w.domain;
    const accent=strip(b.accent,20)||w.accent;
    if(!goodDomain(domain)||!/^#[0-9a-fA-F]{6}$/.test(accent))
      return reply.code(400).send({error:'Domain/màu không hợp lệ'});
    return {widget:await prisma.websiteChatWidget.update({where:{id},data:{
      title,domain:new URL(domain).origin,accent,welcome:strip(b.welcome,250)||w.welcome,
      enabled:typeof b.enabled==='boolean'?b.enabled:w.enabled,
    }})};
  });
  app.get('/api/v1/website-chat/threads',async req=>{
    const threads=await prisma.websiteChatThread.findMany({
      where:{orgId:req.user!.orgId},take:100,orderBy:{updatedAt:'desc'},
      select:{id:true,visitorName:true,visitorPhone:true,visitorEmail:true,widgetId:true,
        createdAt:true,updatedAt:true,widget:{select:{title:true,domain:true}},
        messages:{take:1,orderBy:{createdAt:'desc'},select:{content:true,sender:true,createdAt:true}}},
    });
    return {threads};
  });
  app.get('/api/v1/website-chat/threads/:id/messages',async(req,reply)=>{
    const {id}=req.params as {id:string};
    const thread=await prisma.websiteChatThread.findFirst({where:{id,orgId:req.user!.orgId}});
    if(!thread)return reply.code(404).send({error:'Not found'});
    return {messages:await prisma.websiteChatEntry.findMany({where:{threadId:id},orderBy:{createdAt:'asc'},take:200})};
  });
  app.post('/api/v1/website-chat/threads/:id/reply',async(req,reply)=>{
    const {id}=req.params as {id:string};const content=strip((req.body as any)?.content,1500);
    if(!content)return reply.code(400).send({error:'Tin nhắn trống'});
    const thread=await prisma.websiteChatThread.findFirst({where:{id,orgId:req.user!.orgId}});
    if(!thread)return reply.code(404).send({error:'Not found'});
    const message=await prisma.websiteChatEntry.create({data:{threadId:id,sender:'agent',content}});
    await prisma.websiteChatThread.update({where:{id},data:{updatedAt:new Date()}});
    return {message};
  });
}
export async function websiteChatPublicRoutes(app:FastifyInstance){
  async function widget(key:string){return prisma.websiteChatWidget.findFirst({where:{publicKey:key,enabled:true}});}
  app.get('/api/public/website-chat/:key',async(req,reply)=>{
    const {key}=req.params as {key:string};const w=await widget(key);
    if(!w)return reply.code(404).send({error:'Widget unavailable'});
    return {title:w.title,welcome:w.welcome,accent:w.accent};
  });
  app.post('/api/public/website-chat/:key/start',{config:{rateLimit:{max:5,timeWindow:'1 hour'}}},async(req,reply)=>{
    const {key}=req.params as {key:string};const w=await widget(key);
    if(!w)return reply.code(404).send({error:'Widget unavailable'});
    const b=(req.body||{}) as Record<string,unknown>;
    if(b.honeypot)return reply.code(200).send({received:true}); // avoid rewarding bots
    const name=strip(b.name,100),phone=strip(b.phone,30),email=strip(b.email,180);
    const message=strip(b.message,1500);
    if(!name||!message||!b.consent||!phone&&!email)return reply.code(400).send({error:'Cần tên, nội dung, số điện thoại hoặc email và đồng ý liên hệ'});
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply.code(400).send({error:'Email không hợp lệ'});
    const token=randomBytes(32).toString('base64url');
    const thread=await prisma.$transaction(async tx=>{
      const contact=await tx.contact.create({data:{
        orgId:w.orgId,fullName:name,phone:phone||null,email:email||null,
        source:'Website Chat',sourceDate:new Date(),status:'new',
        metadata:{widgetId:w.id,sourceDomain:w.domain,consentAt:new Date().toISOString()},
      }});
      const t=await tx.websiteChatThread.create({data:{
        orgId:w.orgId,widgetId:w.id,contactId:contact.id,visitorName:name,
        visitorPhone:phone||null,visitorEmail:email||null,visitorTokenHash:sha(token),
      }});
      await tx.websiteChatEntry.create({data:{threadId:t.id,sender:'visitor',content:message}});
      return t;
    });
    return reply.code(201).send({threadId:thread.id,visitorToken:token});
  });
  async function authorize(threadId:string,token:string,key:string){
    const w=await widget(key);if(!w)return null;
    const t=await prisma.websiteChatThread.findFirst({where:{id:threadId,widgetId:w.id}});
    if(!t||!token||token.length>160)return null;
    const digest=sha(token),a=Buffer.from(digest,'hex'),b=Buffer.from(t.visitorTokenHash,'hex');
    return a.length===b.length&&timingSafeEqual(a,b)?t:null;
  }
  app.get('/api/public/website-chat/:key/threads/:id/messages',{config:{rateLimit:{max:40,timeWindow:'1 minute'}}},async(req,reply)=>{
    const {key,id}=req.params as {key:string;id:string};
    const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const t=await authorize(id,bearer,key);
    if(!t)return reply.code(403).send({error:'Invalid visitor session'});
    return {messages:await prisma.websiteChatEntry.findMany({
      where:{threadId:id},orderBy:{createdAt:'asc'},take:200,
      select:{id:true,sender:true,content:true,createdAt:true},
    })};
  });
  app.post('/api/public/website-chat/:key/threads/:id/messages',{config:{rateLimit:{max:15,timeWindow:'1 minute'}}},async(req,reply)=>{
    const {key,id}=req.params as {key:string;id:string};
    const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const t=await authorize(id,bearer,key);
    if(!t)return reply.code(403).send({error:'Invalid visitor session'});
    const content=strip((req.body as any)?.content,1500);
    if(!content)return reply.code(400).send({error:'Tin nhắn trống'});
    const count=await prisma.websiteChatEntry.count({where:{threadId:id}});
    if(count>=200)return reply.code(429).send({error:'Đã đạt giới hạn hội thoại'});
    const message=await prisma.websiteChatEntry.create({data:{threadId:id,sender:'visitor',content}});
    await prisma.websiteChatThread.update({where:{id},data:{updatedAt:new Date()}});
    return {message};
  });
}
