import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { requireRole } from '../auth/role-middleware.js';

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.get('/api/v1/audit/logs', { preHandler: requireRole('owner','admin') }, async req => {
    const query=req.query as {limit?:string;action?:string};
    const limit=Math.max(1,Math.min(100,Number(query.limit)||50));
    const action=typeof query.action==='string'?query.action.slice(0,80):'';
    const where={orgId:req.user!.orgId,...(action?{action:{contains:action,mode:'insensitive' as const}}:{})};
    const [entries,total]=await Promise.all([
      prisma.activityLog.findMany({
        where, orderBy:{createdAt:'desc'}, take:limit,
        select:{
          id:true,action:true,entityId:true,entityType:true,details:true,createdAt:true,
          user:{select:{fullName:true,email:true}},
        },
      }),
      prisma.activityLog.count({where}),
    ]);
    return {entries,total,limit};
  });
}
