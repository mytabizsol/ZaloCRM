import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireZaloAccess } from './zalo-access-middleware.js';
import { zaloPool } from './zalo-pool.js';

const MAX_GROUPS=100;
const COOLDOWN=5*60*1000;
const running=new Set<string>();
const lastRun=new Map<string,number>();
type GroupSummary={id:string;name:string;type:number|null;memberCount:number;description:string;avatar:string|null;hasMoreMembers:boolean};
type ScanSnapshot={scannedAt:string;accountId:string;totalGroups:number;limited:boolean;failed:number;groups:GroupSummary[]};
const key=(id:string)=>'myta_group_scan_v1_'+id;
const pause=(n:number)=>new Promise<void>(resolve=>setTimeout(resolve,n));

async function accountCheck(request:FastifyRequest,reply:FastifyReply,id:string) {
  const a=await prisma.zaloAccount.findFirst({
    where:{id,orgId:request.user!.orgId},select:{id:true,displayName:true,status:true},
  });
  if(!a){reply.code(404).send({error:'Không tìm thấy tài khoản Zalo'});return null;}
  return a;
}
export async function accountGroupScanRoutes(app:FastifyInstance){
  app.addHook('preHandler',authMiddleware);
  const base='/api/v1/zalo-accounts/:zaloAccountId/group-scan';
  const access=requireZaloAccess('read');
  app.get(base,{preHandler:access},async (req,reply)=>{
    const {zaloAccountId}=req.params as {zaloAccountId:string};
    if(!await accountCheck(req,reply,zaloAccountId))return;
    const stored=await prisma.appSetting.findUnique({where:{orgId_settingKey:{orgId:req.user!.orgId,settingKey:key(zaloAccountId)}},select:{valuePlain:true}});
    return {snapshot:stored?.valuePlain?JSON.parse(stored.valuePlain) as ScanSnapshot:null,
      connected:zaloPool.getStatus(zaloAccountId)==='connected',
      running:running.has(zaloAccountId)};
  });
  app.post(base,{preHandler:access},async (req,reply)=>{
    const {zaloAccountId}=req.params as {zaloAccountId:string};
    if(!await accountCheck(req,reply,zaloAccountId))return;
    const live=zaloPool.getInstance(zaloAccountId);
    if(!live?.api || live.status!=='connected') return reply.code(409).send({error:'Tài khoản Zalo chưa kết nối. Đăng nhập QR trước khi quét.'});
    if(running.has(zaloAccountId))return reply.code(409).send({error:'Đang có lượt quét khác'});
    if(Date.now()-(lastRun.get(zaloAccountId)||0)<COOLDOWN)return reply.code(429).send({error:'Vui lòng đợi 5 phút giữa hai lần quét'});
    running.add(zaloAccountId);
    lastRun.set(zaloAccountId,Date.now());
    try {
      const source=await live.api.getAllGroups();
      const ids=Object.keys(source?.gridVerMap??{});
      const subset=ids.slice(0,MAX_GROUPS);
      const groups:GroupSummary[]=[];
      let failed=0;
      for(let i=0;i<subset.length;i+=10){
        const batch=subset.slice(i,i+10);
        try {
          const info=await live.api.getGroupInfo(batch);
          for(const id of batch){
            const g=info?.gridInfoMap?.[id];
            if(!g){failed++;continue;}
            groups.push({
              id,name:String(g.name||id).slice(0,200),type:Number.isInteger(g.type)?g.type:null,
              memberCount:Number.isInteger(g.totalMember)?g.totalMember:0,
              description:String(g.desc||'').slice(0,500),
              avatar:typeof g.avt==='string'&&/^https:\/\//.test(g.avt)?g.avt:null,
              hasMoreMembers:!!g.hasMoreMember,
            });
          }
        }catch{failed+=batch.length;}
        if(i+10<subset.length)await pause(850);
      }
      const snapshot:ScanSnapshot={
        scannedAt:new Date().toISOString(),accountId:zaloAccountId,
        totalGroups:ids.length,limited:ids.length>MAX_GROUPS,failed,groups,
      };
      const orgId=req.user!.orgId,settingKey=key(zaloAccountId);
      await prisma.appSetting.upsert({
        where:{orgId_settingKey:{orgId,settingKey}},
        create:{orgId,settingKey,valuePlain:JSON.stringify(snapshot)},
        update:{valuePlain:JSON.stringify(snapshot)},
      });
      await prisma.activityLog.create({
        data:{orgId,userId:req.user!.id,action:'zalo.group_scan',
          entityType:'zalo_account',entityId:zaloAccountId,
          details:{totalGroups:ids.length,processed:subset.length,success:groups.length,failed}},
      });
      return {snapshot};
    }catch(e){
      app.log.error(e);
      return reply.code(502).send({error:'SDK Zalo không trả được danh sách nhóm. Kiểm tra phiên đăng nhập.'});
    }finally{running.delete(zaloAccountId);}
  });
  app.get(base+'/:groupId/members',{preHandler:access},async(req,reply)=>{
    const {zaloAccountId,groupId}=req.params as {zaloAccountId:string;groupId:string};
    if(!await accountCheck(req,reply,zaloAccountId))return;
    const live=zaloPool.getInstance(zaloAccountId);
    if(!live?.api||live.status!=='connected')return reply.code(409).send({error:'Tài khoản Zalo chưa kết nối'});
    const setting=await prisma.appSetting.findUnique({where:{orgId_settingKey:{orgId:req.user!.orgId,settingKey:key(zaloAccountId)}}});
    const snapshot=setting?.valuePlain?JSON.parse(setting.valuePlain) as ScanSnapshot:null;
    if(!snapshot?.groups.some(g=>g.id===groupId))return reply.code(404).send({error:'Nhóm chưa có trong kết quả quét của tài khoản'});
    const response=await live.api.getGroupInfo(groupId);
    const group=response?.gridInfoMap?.[groupId];
    if(!group)return reply.code(404).send({error:'Không đọc được thông tin nhóm'});
    if(group.setting?.lockViewMember===1)return reply.code(403).send({error:'Nhóm đã hạn chế xem thành viên'});
    const roster=Array.isArray(group.currentMems)?group.currentMems.slice(0,100).map((m:any)=>({
      id:String(m.id||''),name:String(m.dName||m.zaloName||'').slice(0,140),
    })):[];
    return {groupId,name:group.name,totalMember:group.totalMember||roster.length,
      members:roster,truncated:!!group.hasMoreMember||roster.length>=100,
      note:'Chỉ hiển thị; không lưu UID thành viên vào CRM hay gửi tin nhắn.'};
  });
}
