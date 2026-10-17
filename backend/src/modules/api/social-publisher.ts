import cron from 'node-cron';
import { prisma } from '../../shared/database/prisma-client.js';
import { safePublicSite, unseal } from './social-security.js';
import { logger } from '../../shared/utils/logger.js';
import type { SocialPublication, SocialChannel } from '@prisma/client';

type ChannelConfig={siteUrl?:string;username?:string;pageId?:string;privacyLevel?:string};
type Result={state:'published'|'submitted'|'needs_action';remoteId:string|null;detail:string};
async function responseJson(res:Response):Promise<any>{
  const t=await res.text();
  try{return JSON.parse(t);}catch{throw Error('Nền tảng phản hồi không đúng JSON (HTTP '+res.status+')');}
}
async function postJson(url:string,headers:Record<string,string>,payload:unknown){
  const res=await fetch(url,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',...headers},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  if(res.status>=300&&res.status<400)throw Error('Nền tảng chuyển hướng ngoài dự kiến');
  return {res,data:await responseJson(res)};
}
export async function deliverSocialPost(job:SocialPublication,channel:SocialChannel):Promise<Result>{
  const provider=job.provider;
  const conf=(channel.configJson||{}) as ChannelConfig;
  const secret=unseal(channel.credentialCipher);
  const images=(job.mediaUrls as string[]||[]).filter(x=>typeof x==='string');
  const mode=job.publishMode;
  if(provider==='wordpress'){
    if(!conf.siteUrl||!conf.username)throw Error('Thiếu domain hoặc WordPress username');
    const site=await safePublicSite(conf.siteUrl);
    const authorization='Basic '+Buffer.from(conf.username+':'+secret).toString('base64');
    const escapeHtml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    const html='<p>'+escapeHtml(job.body).replaceAll('\n','<br/>')+'</p>'+
      images.map(src=>'<figure><img src="'+escapeHtml(src)+'" alt="" loading="lazy"/></figure>').join('');
    const {res,data}=await postJson(site+'/wp-json/wp/v2/posts',
      {Authorization:authorization},
      {title:job.title,content:html,status:mode==='draft'?'draft':'publish'});
    if(!res.ok||!data.id)throw Error('WordPress từ chối đăng bài (HTTP '+res.status+'): '+String(data.message||'').slice(0,150));
    return {state:'published',remoteId:String(data.id),detail:mode==='draft'?'WordPress draft saved':'WordPress post created'};
  }
  if(provider==='facebook'){
    if(!conf.pageId||!/^[0-9]{4,30}$/.test(conf.pageId))throw Error('Page ID không hợp lệ');
    if(mode==='draft')throw Error('Facebook Page không hỗ trợ bản nháp trong kết nối này');
    const url=new URL('https://graph.facebook.com/v25.0/'+conf.pageId+'/feed');
    const form=new URLSearchParams({message:[job.title,job.body].filter(Boolean).join('\n\n'),
      access_token:secret});
    if(images[0])form.set('link',images[0]);
    const res=await fetch(url,{method:'POST',body:form,redirect:'manual',signal:AbortSignal.timeout(20000)});
    const data=await responseJson(res);
    if(!res.ok||!data.id)throw Error('Facebook Graph API từ chối yêu cầu: '+String(data.error?.message||res.status).slice(0,150));
    return {state:'published',remoteId:String(data.id),detail:'Facebook Page post created'};
  }
  if(provider==='zalo-oa'){
    if(!images[0])throw Error('Zalo OA yêu cầu URL ảnh bìa HTTPS');
    const {res,data}=await postJson('https://openapi.zalo.me/v2.0/article/create',
      {access_token:secret},{
        type:'normal',title:job.title.slice(0,150),author:'MYTA',
        description:job.body.slice(0,300),
        cover:{cover_type:'photo',photo_url:images[0],status:'show'},
        body:[{type:'text',content:job.body}],status:mode==='draft'?'hide':'show',
        comment:'show',
      });
    if(!res.ok||data.error!==0)throw Error('Zalo OA từ chối yêu cầu: '+String(data.message||res.status).slice(0,150));
    return {state:'submitted',remoteId:String(data.data?.token||''),detail:'OA article request accepted; verify resulting article status'};
  }
  if(provider==='tiktok'){
    if(!images.length||images.length>35)throw Error('TikTok photo cần 1–35 URL ảnh từ domain đã xác minh');
    // Real creator information is checked for supported privacy options and authorization on every post.
    const creator=await postJson('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
      {Authorization:'Bearer '+secret},{});
    if(!creator.res.ok||creator.data.error?.code!=='ok')throw Error('TikTok token/scope creator_info không hợp lệ');
    const options=creator.data.data?.privacy_level_options as string[]|undefined;
    const privacy=conf.privacyLevel||'SELF_ONLY';
    if(mode!=='draft'&&(!Array.isArray(options)||!options.includes(privacy)))
      throw Error('TikTok không cho phép mức riêng tư đã cấu hình');
    const payload={
      media_type:'PHOTO',post_mode:mode==='draft'?'MEDIA_UPLOAD':'DIRECT_POST',
      post_info:mode==='draft'
        ?{title:job.title.slice(0,90),description:job.body.slice(0,4000)}
        :{title:job.title.slice(0,90),description:job.body.slice(0,4000),
          privacy_level:privacy,disable_comment:false,auto_add_music:false,
          brand_content_toggle:false,brand_organic_toggle:false},
      source_info:{source:'PULL_FROM_URL',photo_images:images,photo_cover_index:0},
    };
    const {res,data}=await postJson('https://open.tiktokapis.com/v2/post/publish/content/init/',
      {Authorization:'Bearer '+secret},payload);
    if(!res.ok||data.error?.code!=='ok')throw Error('TikTok từ chối: '+String(data.error?.message||res.status).slice(0,150));
    return {state:mode==='draft'?'needs_action':'submitted',
      remoteId:String(data.data?.publish_id||''),detail:mode==='draft'
        ?'Media uploaded. User must complete posting in TikTok Inbox'
        :'TikTok accepted post; status verification still required'};
  }
  throw Error('Không hỗ trợ kênh '+provider);
}
let inProgress=false;
/** Claim each job atomically so only one instance publishes it. Unknown network outcomes stay failed, no auto retry. */
export async function processSocialQueue(){
  if(inProgress)return;
  inProgress=true;
  try{
    const candidates=await prisma.socialPublication.findMany({
      where:{status:'scheduled',scheduledAt:{lte:new Date()}},
      orderBy:{scheduledAt:'asc'},take:10,
    });
    for(const post of candidates){
      const claimed=await prisma.socialPublication.updateMany({
        where:{id:post.id,status:'scheduled'},
        data:{status:'processing',attemptCount:{increment:1}},
      });
      if(!claimed.count)continue;
      try{
        const channel=await prisma.socialChannel.findUnique({
          where:{orgId_provider:{orgId:post.orgId,provider:post.provider}},
        });
        if(!channel)throw Error('Kênh chưa được kết nối');
        const result=await deliverSocialPost(post,channel);
        await prisma.socialPublication.update({
          where:{id:post.id},data:{
            status:result.state,
            completedAt:new Date(),
            responseJson:{remoteId:result.remoteId,detail:result.detail},
            lastError:null,
          },
        });
        await prisma.activityLog.create({
          data:{orgId:post.orgId,userId:post.createdById,action:'social.publish.'+result.state,
            entityType:'social_publication',entityId:post.id,
            details:{provider:post.provider,status:result.state}},
        });
      }catch(e){
        const reason=e instanceof Error?e.message:'Unknown provider error';
        await prisma.socialPublication.update({where:{id:post.id},data:{
          status:'failed',lastError:reason.slice(0,300),completedAt:new Date(),
        }});
        logger.error('[social] Publication failed: '+post.provider+'/'+post.id+' '+reason.slice(0,160));
      }
    }
  }finally{inProgress=false;}
}
export function startSocialScheduler(){
  cron.schedule('* * * * *',()=>processSocialQueue().catch(e=>logger.error('[social] Scheduler error',e)),{
    timezone:'Asia/Ho_Chi_Minh',
  });
  // Recover unknown state without blind retry (providers may already have accepted a post).
  prisma.socialPublication.updateMany({where:{status:'processing'},data:{
    status:'failed',lastError:'Unknown publish result after restart; verify provider before retry',
  }}).catch(e=>logger.error('[social] Recovery error',e));
  logger.info('[social] Omnichannel publishing scheduler started');
}
