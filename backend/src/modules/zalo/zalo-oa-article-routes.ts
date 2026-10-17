import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';
import { prisma } from '../../shared/database/prisma-client.js';

const lastPublished=new Map<string,number>();
/** OA Article OpenAPI. Tokens are one-time input, not saved or logged. */
export async function zaloOaArticleRoutes(app:FastifyInstance){
  app.addHook('preHandler',authMiddleware);
  app.post('/api/v1/zalo-oa/articles', {preHandler:requireRole('owner','admin')}, async (req,reply)=>{
    const b=(req.body||{}) as Record<string,unknown>;
    const token=typeof b.accessToken==='string'?b.accessToken.trim():'';
    const title=typeof b.title==='string'?b.title.trim():'';
    const author=typeof b.author==='string'?b.author.trim():'';
    const description=typeof b.description==='string'?b.description.trim():'';
    const text=typeof b.content==='string'?b.content.trim():'';
    const cover=typeof b.coverUrl==='string'?b.coverUrl.trim():'';
    const status=b.visibility==='show'?'show':'hide';
    if(!token||token.length>2048||title.length<1||title.length>150||
      !author||author.length>50||!description||description.length>300||
      !text||text.length>12000||!/^https:\/\//.test(cover)||cover.length>2048)
      return reply.code(400).send({error:'Dữ liệu không hợp lệ: token, tiêu đề, tác giả, mô tả, nội dung và ảnh bìa HTTPS là bắt buộc.'});
    const lockKey=req.user!.orgId+':'+req.user!.id;
    if(Date.now()-(lastPublished.get(lockKey)||0)<30000)
      return reply.code(429).send({error:'Vui lòng đợi 30 giây giữa hai lần xuất bản.'});
    lastPublished.set(lockKey,Date.now());
    const body={
      type:'normal',title,author,description,
      cover:{cover_type:'photo',photo_url:cover,status:'show'},
      body:[{type:'text',content:text}],
      status,comment:'show',related_medias:[],tracking_link:'',
    };
    try{
      const response=await fetch('https://openapi.zalo.me/v2.0/article/create',{
        method:'POST',
        headers:{'Content-Type':'application/json','access_token':token},
        body:JSON.stringify(body),
        signal:AbortSignal.timeout(20000),
      });
      const data=await response.json() as {error?:number;message?:string;data?:{token?:string}};
      if(!response.ok || data.error!==0) {
        return reply.code(502).send({error:'Zalo OA không chấp nhận yêu cầu',code:data.error,
          message:data.message||'Kiểm tra quyền và trạng thái access token'});
      }
      await prisma.activityLog.create({data:{
        orgId:req.user!.orgId,userId:req.user!.id,action:'zalo_oa.article.create',
        entityType:'zalo_oa_article',details:{title,status},
      }});
      return {accepted:true,visibility:status,
        processingToken:data.data?.token||null,
        note:'Zalo tiếp nhận yêu cầu; cần xác minh trạng thái tạo bài từ Zalo OA.'};
    }catch(e){
      app.log.error('Zalo OA article create failed (token omitted)');
      return reply.code(502).send({error:'Không kết nối được Zalo OA Article API'});
    }
  });
}
