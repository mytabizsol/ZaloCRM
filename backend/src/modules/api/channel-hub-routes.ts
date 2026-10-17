import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';

export async function channelHubRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.get('/api/v1/channels/status', async req => {
    const orgId=req.user!.orgId;
    const [zaloAccounts,groupCount]=await Promise.all([
      prisma.zaloAccount.findMany({where:{orgId},select:{id:true,displayName:true,status:true}}),
      prisma.conversation.count({where:{orgId,threadType:'group'}}),
    ]);
    return {
      channels:[
        {id:'zalo-personal',name:'Zalo cá nhân',status:zaloAccounts.length?'configured':'not_connected',
          capabilities:['Tin nhắn hội thoại','Nhóm đã đồng bộ'],accounts:zaloAccounts},
        {id:'zalo-oa',name:'Zalo Official Account',status:'pending_credentials',
          capabilities:['OAuth OA','Webhook','Nhắn tin theo chính sách OA']},
        {id:'facebook',name:'Facebook Page / Messenger',status:'pending_credentials',
          capabilities:['Page OAuth','Messenger webhook','Page publishing']},
        {id:'whatsapp',name:'WhatsApp Business',status:'pending_credentials',
          capabilities:['Cloud API','Webhook','Mẫu tin nhắn được phê duyệt']},
        {id:'tiktok',name:'TikTok',status:'pending_credentials',
          capabilities:['Login Kit','Content Posting API']},
      ],
      syncedGroupCount:groupCount,
      note:'Only Zalo personal is installed. Other channels require official developer authorization before activation.',
    };
  });
  app.get('/api/v1/channels/zalo-groups', async req => {
    const groups=await prisma.conversation.findMany({
      where:{orgId:req.user!.orgId,threadType:'group',
        zaloAccount:{OR:[{ownerUserId:req.user!.id},{access:{some:{userId:req.user!.id}}}]}},
      select:{id:true,externalThreadId:true,lastMessageAt:true,unreadCount:true,
        contact:{select:{fullName:true}},
        zaloAccount:{select:{displayName:true,status:true}}},
      orderBy:{lastMessageAt:'desc'},take:200,
    });
    return {groups,count:groups.length,scope:'existing-synced-conversations',
      note:'This is not a group-member scraper. No private-member data is accessed.'};
  });
}
