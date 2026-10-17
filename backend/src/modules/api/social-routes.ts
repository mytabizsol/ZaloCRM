import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';
import { seal } from './social-security.js';
import { processSocialQueue } from './social-publisher.js';

const providers=['wordpress','facebook','zalo-oa','tiktok'] as const;
type Provider=typeof providers[number];
function isProvider(s:unknown):s is Provider{return typeof s==='string'&&providers.includes(s as Provider);}
const validHttps=(v:string)=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.');}catch{return false;}};
export async function socialRoutes(app:FastifyInstance) {
  app.addHook('preHandler',authMiddleware);
  app.get('/api/v1/social/channels',async req=>{
    const rows=await prisma.socialChannel.findMany({
      where:{orgId:req.user!.orgId},
      select:{provider:true,label:true,configJson:true,updatedAt:true},
    });
    return {channels:providers.map(p=>{
      const item=rows.find(r=>r.provider===p);
      return {provider:p,configured:!!item,label:item?.label||p,config:item?.configJson||{},
        updatedAt:item?.updatedAt||null};
    })};
  });
  app.put('/api/v1/social/channels/:provider',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const {provider}=req.params as {provider:string};
    const body=(req.body||{}) as Record<string,unknown>;
    if(!isProvider(provider))return reply.code(400).send({error:'Kênh không hợp lệ'});
    const secret=typeof body.secret==='string'?body.secret.trim():'';
    const label=typeof body.label==='string'?body.label.trim().slice(0,100):provider;
    const config=(body.config&&typeof body.config==='object'&&!Array.isArray(body.config)
      ?body.config:{}) as Record<string,unknown>;
    let safe:Record<string,string>={};
    if(provider==='wordpress'){
      const siteUrl=String(config.siteUrl||''),username=String(config.username||'').trim();
      if(!validHttps(siteUrl)||!username||username.length>120)return reply.code(400).send({error:'Cần URL HTTPS và username WordPress'});
      safe={siteUrl:new URL(siteUrl).origin,username};
    } else if(provider==='facebook'){
      const pageId=String(config.pageId||'');
      if(!/^\d{4,30}$/.test(pageId))return reply.code(400).send({error:'Cần Page ID hợp lệ'});
      safe={pageId};
    } else if(provider==='tiktok'){
      const privacy=String(config.privacyLevel||'SELF_ONLY');
      if(!['SELF_ONLY','PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','FOLLOWER_OF_CREATOR'].includes(privacy))
        return reply.code(400).send({error:'Quyền riêng tư TikTok không hợp lệ'});
      safe={privacyLevel:privacy};
    }
    const current=await prisma.socialChannel.findUnique({where:{orgId_provider:{orgId:req.user!.orgId,provider}}});
    if(!secret&&!current)return reply.code(400).send({error:'Cần token hoặc application password để kết nối'});
    if(secret.length>5000)return reply.code(400).send({error:'Thông tin bảo mật quá dài'});
    await prisma.socialChannel.upsert({
      where:{orgId_provider:{orgId:req.user!.orgId,provider}},
      create:{orgId:req.user!.orgId,provider,label,configJson:safe,credentialCipher:seal(secret)},
      update:{label,configJson:safe,...(secret?{credentialCipher:seal(secret)}:{})},
    });
    return {success:true,provider,configured:true,note:'Thông tin được lưu mã hóa, kết nối chưa được xác nhận cho đến lần gửi hợp lệ'};
  });
  app.delete('/api/v1/social/channels/:provider',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const {provider}=req.params as {provider:string};
    if(!isProvider(provider))return reply.code(400).send({error:'Invalid provider'});
    await prisma.socialChannel.deleteMany({where:{orgId:req.user!.orgId,provider}});
    return {success:true};
  });
  app.get('/api/v1/social/posts',async req=>{
    const posts=await prisma.socialPublication.findMany({
      where:{orgId:req.user!.orgId},take:150,orderBy:{createdAt:'desc'},
    });
    return {posts};
  });
  app.post('/api/v1/social/posts',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const b=(req.body||{}) as Record<string,unknown>;
    if(!isProvider(b.provider))return reply.code(400).send({error:'Chưa chọn kênh đăng'});
    const title=String(b.title||'').trim(),body=String(b.body||'').trim();
    const mediaUrls=Array.isArray(b.mediaUrls)?b.mediaUrls:[];
    const mode=String(b.mode||'draft');
    if(title.length>150||body.length>12000||!title&&!body||!['draft','now','schedule'].includes(mode)||
      mediaUrls.length>35||mediaUrls.some(x=>typeof x!=='string'||!validHttps(x)||x.length>2000))
      return reply.code(400).send({error:'Nội dung, hình ảnh hoặc trạng thái không hợp lệ'});
    if(b.provider==='tiktok'&&mode!=='draft'&&(!mediaUrls.length||b.confirmTikTokRules!==true))
      return reply.code(400).send({error:'TikTok yêu cầu URL ảnh hợp lệ và xác nhận quyền đăng, quyền riêng tư'});
    if(b.provider==='zalo-oa'&&mode!=='draft'&&!mediaUrls.length)
      return reply.code(400).send({error:'Zalo OA yêu cầu ảnh bìa HTTPS'});
    if(mode==='now'&&b.confirmPublish!==true)return reply.code(400).send({error:'Cần xác nhận đăng ngay'});
    let scheduledAt:Date|null=null;
    if(mode==='schedule'){
      scheduledAt=new Date(String(b.scheduledAt||''));
      if(Number.isNaN(scheduledAt.getTime())||scheduledAt.getTime()<Date.now()+60000||
        scheduledAt.getTime()>Date.now()+365*86400000)
        return reply.code(400).send({error:'Lịch đăng phải cách ít nhất 1 phút và trong 365 ngày'});
    }
    const post=await prisma.socialPublication.create({
      data:{orgId:req.user!.orgId,createdById:req.user!.id,provider:b.provider,
        title,body,mediaUrls,
        status:mode==='draft'?'draft':'scheduled',
        publishMode:'publish',scheduledAt:mode==='now'?new Date():scheduledAt,
        responseJson:{approval:mode!=='draft',tikTokConsent:b.confirmTikTokRules===true}},
    });
    if(mode==='now')await processSocialQueue();
    const fresh=await prisma.socialPublication.findUnique({where:{id:post.id}});
    return reply.code(201).send({post:fresh});
  });
  app.post('/api/v1/social/posts/:id/schedule',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const {id}=req.params as {id:string};
    const b=(req.body||{}) as {scheduledAt?:string;confirmTikTokRules?:boolean};
    const date=new Date(b.scheduledAt||'');
    if(Number.isNaN(date.getTime())||date.getTime()<Date.now()+60000||date.getTime()>Date.now()+365*86400000)
      return reply.code(400).send({error:'Lịch đăng không hợp lệ'});
    const post=await prisma.socialPublication.findFirst({where:{id,orgId:req.user!.orgId,status:'draft'}});
    if(!post)return reply.code(404).send({error:'Bản nháp không tồn tại'});
    if(post.provider==='tiktok'&&b.confirmTikTokRules!==true)return reply.code(400).send({error:'Cần xác nhận quyền đăng TikTok'});
    await prisma.socialPublication.update({where:{id},data:{status:'scheduled',scheduledAt:date}});
    return {success:true};
  });
  app.post('/api/v1/social/posts/:id/cancel',{preHandler:requireRole('owner','admin')},async(req,reply)=>{
    const {id}=req.params as {id:string};
    const update=await prisma.socialPublication.updateMany({
      where:{id,orgId:req.user!.orgId,status:{in:['scheduled','draft']}},
      data:{status:'cancelled'},
    });
    if(!update.count)return reply.code(409).send({error:'Không thể hủy bài đã xử lý'});
    return {success:true};
  });
}
