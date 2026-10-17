import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';

type ContactSummary={id:string;fullName:string|null;phone:string|null;email:string|null;zaloUid:string|null;status:string|null;updatedAt:Date};
function phoneKey(phone:string|null){
  if(!phone) return null;
  let d=phone.replace(/\D/g,'');
  if(d.startsWith('84') && d.length===11) d='0'+d.slice(2);
  if(d.length<9||d.length>12||/^0+$/.test(d)) return null;
  return d;
}
export async function duplicateReviewRoutes(app:FastifyInstance) {
  app.addHook('preHandler',authMiddleware);
  app.get('/api/v1/contacts/duplicates',async req=>{
    const orgId=req.user!.orgId;
    const contacts=await prisma.contact.findMany({
      where:{orgId},
      select:{id:true,fullName:true,phone:true,email:true,zaloUid:true,status:true,updatedAt:true},
      take:5000,orderBy:{updatedAt:'desc'},
    });
    const root=contacts.map((_,i)=>i);
    function find(i:number):number {
      if(root[i]!==i) root[i]=find(root[i]);
      return root[i];
    }
    function union(a:number,b:number){
      const ra=find(a),rb=find(b);
      if(ra!==rb) root[rb]=ra;
    }
    const keys=new Map<string,number>();
    for(let i=0;i<contacts.length;i++){
      const c=contacts[i];
      const aliases=[
        c.zaloUid?.trim() ? 'z:'+c.zaloUid.trim():null,
        phoneKey(c.phone)?'p:'+phoneKey(c.phone):null,
        c.email?.trim().includes('@')?'e:'+c.email.trim().toLowerCase():null,
      ].filter((x):x is string=>Boolean(x));
      for(const key of aliases){
        const previous=keys.get(key);
        if(previous!==undefined) union(i,previous);
        else keys.set(key,i);
      }
    }
    const groups=new Map<number,ContactSummary[]>();
    for(let i=0;i<contacts.length;i++){
      const bucket=find(i);
      const group=groups.get(bucket)??[];
      group.push(contacts[i]);
      groups.set(bucket,group);
    }
    const duplicates=Array.from(groups.values()).filter(g=>g.length>1).sort((a,b)=>b.length-a.length);
    return {
      groups:duplicates.slice(0,100),
      totalDuplicateGroups:duplicates.length,
      scanned:contacts.length,
      truncated:contacts.length>=5000,
      note:'Review-only; no contacts are merged or deleted',
    };
  });
}
