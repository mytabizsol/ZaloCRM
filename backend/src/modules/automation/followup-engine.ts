import cron from 'node-cron';
import { prisma } from '../../shared/database/prisma-client.js';
import { logger } from '../../shared/utils/logger.js';

export type FollowupRule = {
  id: string; name: string; enabled: boolean; stage: string; inactiveDays: number; action: 'flag';
};
const ACTION = 'automation.followup';
const COOLDOWN_DAYS = 7;
const MAX_CONTACTS_PER_RULE = 50;
const locks = new Set<string>();

/** Creates auditable internal follow-up flags. Does not send messages or update contacts. */
export async function runFollowupRules(orgId: string, rules: FollowupRule[], userId?: string) {
  if (locks.has(orgId)) return { busy: true, created: 0, skipped: 0, rulesChecked: 0 };
  locks.add(orgId);
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 86400000);
  let created = 0, skipped = 0, rulesChecked = 0;
  try {
    for (const rule of rules.filter(x => x.enabled && x.action === 'flag')) {
      rulesChecked++;
      const matched = await prisma.contact.findMany({
        where: {
          orgId,
          status: rule.stage === 'any' ? { in: ['new','contacted','interested'] } : rule.stage,
          updatedAt: { lt: new Date(Date.now() - rule.inactiveDays * 86400000) },
        },
        select: { id: true, fullName: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
        take: MAX_CONTACTS_PER_RULE,
      });
      for (const contact of matched) {
        const previous = await prisma.activityLog.findFirst({
          where: {
            orgId, entityType: 'contact', entityId: contact.id, action: ACTION,
            createdAt: { gte: cutoff },
            details: { path: ['ruleId'], equals: rule.id },
          },
          select: { id: true },
        });
        if (previous) { skipped++; continue; }
        await prisma.activityLog.create({
          data: {
            orgId, userId: userId ?? null, action: ACTION,
            entityType: 'contact', entityId: contact.id,
            details: {
              ruleId: rule.id, ruleName: rule.name, contactName: contact.fullName,
              inactivityDays: rule.inactiveDays, lastUpdatedAt: contact.updatedAt.toISOString(),
            },
          },
        });
        created++;
      }
    }
    return { busy: false, created, skipped, rulesChecked, limitPerRule: MAX_CONTACTS_PER_RULE };
  } finally { locks.delete(orgId); }
}

/** Enabled rules run once a day, each contact/rule is de-duplicated for seven days. */
export function startWorkflowScheduler(): void {
  cron.schedule('15 8 * * *', async () => {
    try {
      const settings = await prisma.appSetting.findMany({
        where: { settingKey: 'crm_workflow_rules_v1' },
        select: { orgId: true, valuePlain: true },
      });
      for (const item of settings) {
        try {
          const parsed: unknown = JSON.parse(item.valuePlain || '[]');
          if (!Array.isArray(parsed)) continue;
          const rules = parsed.filter((r): r is FollowupRule =>
            !!r && typeof r.id === 'string' && typeof r.enabled === 'boolean' &&
            typeof r.inactiveDays === 'number' && r.inactiveDays >= 1 &&
            r.inactiveDays <= 365 && ['any','new','contacted','interested'].includes(r.stage) &&
            r.action === 'flag');
          if (rules.some(x => x.enabled)) {
            const stats = await runFollowupRules(item.orgId, rules);
            logger.info('[automation] Daily follow-up: ' + JSON.stringify({
              orgId: item.orgId, ...stats,
            }));
          }
        } catch (err) { logger.error('[automation] Organization run failed:', err); }
      }
    } catch (err) { logger.error('[automation] Scheduler failed:', err); }
  }, { timezone: 'Asia/Ho_Chi_Minh' });
  logger.info('[automation] Follow-up scheduler enabled at 08:15 Asia/Ho_Chi_Minh');
}
