import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';

type Stage = 'new' | 'contacted' | 'interested' | 'converted' | 'lost';
const stagePoints: Record<Stage, number> = {
  new: 5, contacted: 20, interested: 40, converted: 60, lost: 0,
};
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Explainable, read-only CRM priority scoring. No Zalo requests and no writes. */
export async function leadInsightsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authMiddleware);
  app.get('/api/v1/leads/insights', async (request, reply) => {
    const orgId = request.user!.orgId;
    const query = request.query as { limit?: string; stalledDays?: string };
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const stalledDays = Math.min(365, Math.max(1, Number(query.stalledDays) || 14));
    const now = Date.now();
    const contacts = await prisma.contact.findMany({
      where: { orgId },
      select: {
        id: true, fullName: true, phone: true, status: true, tags: true,
        updatedAt: true, nextAppointment: true,
        _count: { select: { conversations: true, appointments: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });
    const scored = contacts.map((contact) => {
      const daysSinceUpdate = Math.floor((now - contact.updatedAt.getTime()) / 86400000);
      const stage = (contact.status ?? 'new') as Stage;
      const stageScore = stagePoints[stage] ?? 0;
      const engagementScore = Math.min(20, contact._count.conversations * 5);
      const appointmentScore = Math.min(10, contact._count.appointments * 5);
      const upcomingAppointment = !!contact.nextAppointment &&
        contact.nextAppointment.getTime() >= now &&
        contact.nextAppointment.getTime() < now + 14 * 86400000;
      const appointmentBonus = upcomingAppointment ? 10 : 0;
      const inactivityPenalty = Math.min(40, Math.floor(daysSinceUpdate / 7) * 5);
      const score = clamp(stageScore + engagementScore + appointmentScore +
        appointmentBonus - inactivityPenalty);
      const stalled = stage !== 'converted' && stage !== 'lost' &&
        daysSinceUpdate >= stalledDays;
      return {
        id: contact.id, fullName: contact.fullName, phone: contact.phone,
        status: contact.status, score,
        category: score >= 70 ? 'hot' : score >= 35 ? 'warm' : 'cold',
        stalled, daysSinceUpdate,
        breakdown: { stageScore, engagementScore, appointmentScore,
          appointmentBonus, inactivityPenalty },
      };
    }).sort((a, b) => b.score - a.score);
    const stalled = scored.filter(x => x.stalled).length;
    return reply.send({
      total: scored.length, stalled, stalledDays,
      note: contacts.length === 2000 ? 'Limited to 2000 most recently updated contacts' : null,
      contacts: scored.slice(0, limit),
    });
  });
}

