import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma-client.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import {
  canCreateTask,
  canDeleteProject,
  canDeleteTask,
  canEditProject,
  canEditTask,
  canManageMembers,
  isOrganizationManager,
  isValidTransition,
  type ProjectAccess,
  type ProjectActor,
} from './project-policy.js';
import { memberInput, milestoneInput, pagination, projectInput, taskInput } from './project-validation.js';

// Kept structural to allow Fastify route-contract tests without a database connection.
type ProjectDatabase = any;
type Body = Record<string, unknown>;

const projectInclude = {
  owner: { select: { id: true, fullName: true, email: true } },
  clientContact: { select: { id: true, fullName: true, phone: true, email: true } },
  members: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
  tasks: { where: { isDeleted: false }, select: { id: true, status: true } },
  milestones: { where: { isDeleted: false }, orderBy: { dueAt: 'asc' } },
};

function toActor(request: FastifyRequest): ProjectActor {
  return request.user!;
}

function clean<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function projectProgress(project: { progressOverride?: number | null; tasks?: Array<{ status: string }> }): number {
  if (project.progressOverride !== null && project.progressOverride !== undefined) return project.progressOverride;
  if (!project.tasks?.length) return 0;
  return Math.round((project.tasks.filter((task) => task.status === 'done').length / project.tasks.length) * 100);
}

function presentProject(project: any) {
  return { ...project, progress: projectProgress(project), tasks: undefined };
}

function generateProjectCode(): string {
  return `PRJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function isPrismaConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

async function audit(db: ProjectDatabase, orgId: string, userId: string, projectId: string, action: string, details: Record<string, unknown> = {}) {
  await db.activityLog.create({
    data: { orgId, userId, action, entityType: 'project', entityId: projectId, details },
  });
}

async function requireProjectAccess(db: ProjectDatabase, actor: ProjectActor, id: string) {
  const project = await db.project.findFirst({
    where: { id, orgId: (actor as any).orgId, isDeleted: false },
    include: projectInclude,
  });
  if (!project) return null;
  const membership = project.members.find((member: any) => member.userId === actor.id);
  if (!isOrganizationManager(actor) && project.ownerUserId !== actor.id && !membership) return null;
  return { project, access: (membership?.access ?? null) as ProjectAccess };
}

async function requireOrgUser(db: ProjectDatabase, orgId: string, userId: string) {
  return db.user.findFirst({ where: { id: userId, orgId, isActive: true }, select: { id: true } });
}

async function requireContact(db: ProjectDatabase, orgId: string, contactId: string | null | undefined) {
  if (!contactId) return;
  const contact = await db.contact.findFirst({ where: { id: contactId, orgId }, select: { id: true } });
  if (!contact) throw new Error('Khách hàng không thuộc tổ chức hiện tại');
}

async function requireMilestone(db: ProjectDatabase, orgId: string, projectId: string, milestoneId: string | null | undefined) {
  if (!milestoneId) return;
  const milestone = await db.projectMilestone.findFirst({
    where: { id: milestoneId, orgId, projectId, isDeleted: false }, select: { id: true },
  });
  if (!milestone) throw new Error('Mốc công việc không thuộc dự án hiện tại');
}

async function requireAssignee(db: ProjectDatabase, orgId: string, projectId: string, userId: string | null | undefined) {
  if (!userId) return;
  const [user, member] = await Promise.all([
    requireOrgUser(db, orgId, userId),
    db.projectMember.findFirst({ where: { orgId, projectId, userId }, select: { id: true } }),
  ]);
  if (!user || !member) throw new Error('Người được giao phải là thành viên đang hoạt động của dự án');
}

function replyError(reply: FastifyReply, error: unknown) {
  if (error instanceof Error) return reply.status(400).send({ error: error.message });
  return reply.status(500).send({ error: 'Không thể xử lý yêu cầu dự án' });
}

export function createProjectRoutes(db: ProjectDatabase = prisma) {
  return async function projectRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', authMiddleware);

    app.get('/api/v1/projects/stats', async (request: FastifyRequest) => {
      const actor = toActor(request);
      const accessWhere = isOrganizationManager(actor)
        ? {}
        : { OR: [{ ownerUserId: actor.id }, { members: { some: { userId: actor.id } } }] };
      const baseWhere = { orgId: (actor as any).orgId, isDeleted: false, ...accessWhere };
      const now = new Date();
      const [planned, active, onHold, completed, overdue, blocked] = await Promise.all([
        db.project.count({ where: { ...baseWhere, status: 'planned' } }),
        db.project.count({ where: { ...baseWhere, status: 'active' } }),
        db.project.count({ where: { ...baseWhere, status: 'on_hold' } }),
        db.project.count({ where: { ...baseWhere, status: 'completed' } }),
        db.project.count({ where: { ...baseWhere, dueAt: { lt: now }, status: { notIn: ['completed', 'cancelled'] } } }),
        db.projectTask.count({
          where: { orgId: (actor as any).orgId, isDeleted: false, status: 'blocked', project: { is: baseWhere } },
        }),
      ]);
      return { planned, active, onHold, completed, overdue, blocked };
    });

    app.get('/api/v1/projects', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const query = request.query as Body;
        const { page, limit } = pagination(query);
        const where: any = { orgId: (actor as any).orgId, isDeleted: false };
        if (!isOrganizationManager(actor)) where.OR = [{ ownerUserId: actor.id }, { members: { some: { userId: actor.id } } }];
        if (typeof query.status === 'string' && query.status) where.status = query.status;
        if (typeof query.ownerUserId === 'string' && query.ownerUserId) where.ownerUserId = query.ownerUserId;
        if (typeof query.clientContactId === 'string' && query.clientContactId) where.clientContactId = query.clientContactId;
        if (typeof query.search === 'string' && query.search.trim()) {
          where.AND = [{ OR: [
            { name: { contains: query.search.trim(), mode: 'insensitive' } },
            { projectCode: { contains: query.search.trim(), mode: 'insensitive' } },
          ] }];
        }
        const [projects, total] = await Promise.all([
          db.project.findMany({ where, include: projectInclude, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
          db.project.count({ where }),
        ]);
        return { projects: projects.map(presentProject), total, page, limit };
      } catch (error) { return replyError(reply, error); }
    });

    app.post('/api/v1/projects', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const input = projectInput((request.body ?? {}) as Body, true);
        const orgId = (actor as any).orgId as string;
        const ownerUserId = input.ownerUserId ?? actor.id;
        if (ownerUserId !== actor.id && !isOrganizationManager(actor)) return reply.status(403).send({ error: 'Chỉ quản trị viên được đổi chủ dự án khi tạo' });
        if (!await requireOrgUser(db, orgId, ownerUserId)) return reply.status(400).send({ error: 'Chủ dự án không thuộc tổ chức hiện tại' });
        await requireContact(db, orgId, input.clientContactId);
        const project = await db.$transaction(async (tx: ProjectDatabase) => {
          const created = await tx.project.create({
            data: {
              ...clean(input), orgId, ownerUserId, projectCode: input.projectCode ?? generateProjectCode(),
              status: input.status ?? 'planned', priority: input.priority ?? 'normal',
            }, include: projectInclude,
          });
          await tx.projectMember.upsert({
            where: { projectId_userId: { projectId: created.id, userId: ownerUserId } },
            create: { orgId, projectId: created.id, userId: ownerUserId, access: 'manager' },
            update: { access: 'manager' },
          });
          await audit(tx, orgId, actor.id, created.id, 'project.created', { projectCode: created.projectCode });
          return tx.project.findUnique({ where: { id: created.id }, include: projectInclude });
        });
        return reply.status(201).send(presentProject(project));
      } catch (error) {
        if (isPrismaConflict(error)) return reply.status(409).send({ error: 'Mã dự án đã tồn tại trong tổ chức' });
        return replyError(reply, error);
      }
    });

    app.get('/api/v1/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const access = await requireProjectAccess(db, toActor(request), (request.params as { id: string }).id);
      if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      return presentProject(access.project);
    });

    app.patch('/api/v1/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const access = await requireProjectAccess(db, actor, (request.params as { id: string }).id);
        if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
        if (!canEditProject(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Bạn không có quyền sửa dự án này' });
        const input = projectInput((request.body ?? {}) as Body);
        if (input.ownerUserId && input.ownerUserId !== access.project.ownerUserId && !isOrganizationManager(actor)) return reply.status(403).send({ error: 'Chỉ quản trị viên được đổi chủ dự án' });
        if (input.ownerUserId && !await requireOrgUser(db, (actor as any).orgId, input.ownerUserId)) return reply.status(400).send({ error: 'Chủ dự án không thuộc tổ chức hiện tại' });
        await requireContact(db, (actor as any).orgId, input.clientContactId);
        if (input.status && !isValidTransition('project', access.project.status, input.status)) return reply.status(400).send({ error: 'Chuyển trạng thái dự án không hợp lệ' });
        const project = await db.project.update({ where: { id: access.project.id }, data: clean(input), include: projectInclude });
        if (input.ownerUserId && input.ownerUserId !== access.project.ownerUserId) {
          await db.projectMember.upsert({ where: { projectId_userId: { projectId: project.id, userId: input.ownerUserId } }, create: { orgId: (actor as any).orgId, projectId: project.id, userId: input.ownerUserId, access: 'manager' }, update: { access: 'manager' } });
        }
        await audit(db, (actor as any).orgId, actor.id, project.id, 'project.updated', { fields: Object.keys(clean(input)) });
        return presentProject(project);
      } catch (error) {
        if (isPrismaConflict(error)) return reply.status(409).send({ error: 'Mã dự án đã tồn tại trong tổ chức' });
        return replyError(reply, error);
      }
    });

    app.delete('/api/v1/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const access = await requireProjectAccess(db, actor, (request.params as { id: string }).id);
      if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      if (!canDeleteProject(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Chỉ chủ dự án hoặc quản trị viên được lưu trữ dự án' });
      await db.project.update({ where: { id: access.project.id }, data: { isDeleted: true, deletedAt: new Date() } });
      await audit(db, (actor as any).orgId, actor.id, access.project.id, 'project.archived');
      return reply.status(204).send();
    });

    app.get('/api/v1/projects/:id/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const projectId = (request.params as { id: string }).id;
      if (!await requireProjectAccess(db, actor, projectId)) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      const tasks = await db.projectTask.findMany({ where: { orgId: (actor as any).orgId, projectId, isDeleted: false }, include: { assignee: { select: { id: true, fullName: true } }, milestone: { select: { id: true, title: true } } }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
      return { tasks };
    });

    app.post('/api/v1/projects/:id/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const projectId = (request.params as { id: string }).id;
        const access = await requireProjectAccess(db, actor, projectId);
        if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
        if (!canCreateTask(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Bạn không có quyền tạo công việc' });
        const input = taskInput((request.body ?? {}) as Body, true);
        const orgId = (actor as any).orgId as string;
        await requireMilestone(db, orgId, projectId, input.milestoneId);
        await requireAssignee(db, orgId, projectId, input.assigneeUserId);
        const task = await db.projectTask.create({ data: { ...clean(input), orgId, projectId, status: input.status ?? 'todo', priority: input.priority ?? 'normal', sortOrder: input.sortOrder ?? 0 }, include: { assignee: { select: { id: true, fullName: true } }, milestone: { select: { id: true, title: true } } } });
        await audit(db, orgId, actor.id, projectId, 'project.task_created', { taskId: task.id });
        return reply.status(201).send(task);
      } catch (error) { return replyError(reply, error); }
    });

    app.patch('/api/v1/projects/:id/tasks/:taskId', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const { id: projectId, taskId } = request.params as { id: string; taskId: string };
        const access = await requireProjectAccess(db, actor, projectId);
        if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
        const task = await db.projectTask.findFirst({ where: { id: taskId, orgId: (actor as any).orgId, projectId, isDeleted: false } });
        if (!task) return reply.status(404).send({ error: 'Không tìm thấy công việc' });
        const context = { ownerUserId: access.project.ownerUserId, access: access.access };
        if (!canEditTask(actor, context, task.assigneeUserId)) return reply.status(403).send({ error: 'Bạn chỉ có thể sửa công việc được giao cho mình' });
        const input = taskInput((request.body ?? {}) as Body);
        if (!canEditProject(actor, context) && (input.assigneeUserId !== undefined || input.milestoneId !== undefined || input.priority !== undefined || input.sortOrder !== undefined)) return reply.status(403).send({ error: 'Bạn không có quyền đổi phân công hoặc sắp xếp công việc' });
        if (input.status && !isValidTransition('task', task.status, input.status)) return reply.status(400).send({ error: 'Chuyển trạng thái công việc không hợp lệ' });
        await requireMilestone(db, (actor as any).orgId, projectId, input.milestoneId);
        await requireAssignee(db, (actor as any).orgId, projectId, input.assigneeUserId);
        const updated = await db.projectTask.update({ where: { id: task.id }, data: clean(input), include: { assignee: { select: { id: true, fullName: true } }, milestone: { select: { id: true, title: true } } } });
        await audit(db, (actor as any).orgId, actor.id, projectId, 'project.task_updated', { taskId: task.id, fields: Object.keys(clean(input)) });
        return updated;
      } catch (error) { return replyError(reply, error); }
    });

    app.delete('/api/v1/projects/:id/tasks/:taskId', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const { id: projectId, taskId } = request.params as { id: string; taskId: string };
      const access = await requireProjectAccess(db, actor, projectId);
      if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      if (!canDeleteTask(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Bạn không có quyền lưu trữ công việc' });
      const task = await db.projectTask.findFirst({ where: { id: taskId, orgId: (actor as any).orgId, projectId, isDeleted: false }, select: { id: true } });
      if (!task) return reply.status(404).send({ error: 'Không tìm thấy công việc' });
      await db.projectTask.update({ where: { id: task.id }, data: { isDeleted: true, deletedAt: new Date() } });
      await audit(db, (actor as any).orgId, actor.id, projectId, 'project.task_archived', { taskId });
      return reply.status(204).send();
    });

    app.get('/api/v1/projects/:id/milestones', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const projectId = (request.params as { id: string }).id;
      if (!await requireProjectAccess(db, actor, projectId)) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      return { milestones: await db.projectMilestone.findMany({ where: { orgId: (actor as any).orgId, projectId, isDeleted: false }, orderBy: { dueAt: 'asc' } }) };
    });

    app.post('/api/v1/projects/:id/milestones', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const projectId = (request.params as { id: string }).id;
        const access = await requireProjectAccess(db, actor, projectId);
        if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
        if (!canEditProject(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Bạn không có quyền tạo mốc công việc' });
        const input = milestoneInput((request.body ?? {}) as Body, true);
        const milestone = await db.projectMilestone.create({ data: { ...clean(input), orgId: (actor as any).orgId, projectId, status: input.status ?? 'pending', completedAt: input.status === 'completed' ? new Date() : null } });
        await audit(db, (actor as any).orgId, actor.id, projectId, 'project.milestone_created', { milestoneId: milestone.id });
        return reply.status(201).send(milestone);
      } catch (error) { return replyError(reply, error); }
    });

    app.patch('/api/v1/projects/:id/milestones/:milestoneId', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const { id: projectId, milestoneId } = request.params as { id: string; milestoneId: string };
        const access = await requireProjectAccess(db, actor, projectId);
        if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
        if (!canEditProject(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Bạn không có quyền sửa mốc công việc' });
        const existing = await db.projectMilestone.findFirst({ where: { id: milestoneId, orgId: (actor as any).orgId, projectId, isDeleted: false } });
        if (!existing) return reply.status(404).send({ error: 'Không tìm thấy mốc công việc' });
        const input = milestoneInput((request.body ?? {}) as Body);
        if (input.status && !isValidTransition('milestone', existing.status, input.status)) return reply.status(400).send({ error: 'Chuyển trạng thái mốc công việc không hợp lệ' });
        const data: any = clean(input);
        if (input.status === 'completed' && existing.status !== 'completed') data.completedAt = new Date();
        if (input.status && input.status !== 'completed') data.completedAt = null;
        const milestone = await db.projectMilestone.update({ where: { id: existing.id }, data });
        await audit(db, (actor as any).orgId, actor.id, projectId, 'project.milestone_updated', { milestoneId, fields: Object.keys(data) });
        return milestone;
      } catch (error) { return replyError(reply, error); }
    });

    app.delete('/api/v1/projects/:id/milestones/:milestoneId', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const { id: projectId, milestoneId } = request.params as { id: string; milestoneId: string };
      const access = await requireProjectAccess(db, actor, projectId);
      if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      if (!canEditProject(actor, { ownerUserId: access.project.ownerUserId, access: access.access })) return reply.status(403).send({ error: 'Bạn không có quyền lưu trữ mốc công việc' });
      const milestone = await db.projectMilestone.findFirst({ where: { id: milestoneId, orgId: (actor as any).orgId, projectId, isDeleted: false }, select: { id: true } });
      if (!milestone) return reply.status(404).send({ error: 'Không tìm thấy mốc công việc' });
      await db.projectMilestone.update({ where: { id: milestone.id }, data: { isDeleted: true, deletedAt: new Date() } });
      await audit(db, (actor as any).orgId, actor.id, projectId, 'project.milestone_archived', { milestoneId });
      return reply.status(204).send();
    });

    app.get('/api/v1/projects/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const projectId = (request.params as { id: string }).id;
      if (!await requireProjectAccess(db, actor, projectId)) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      return { members: await db.projectMember.findMany({ where: { orgId: (actor as any).orgId, projectId }, include: { user: { select: { id: true, fullName: true, email: true, role: true, isActive: true } } }, orderBy: { createdAt: 'asc' } }) };
    });

    app.post('/api/v1/projects/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const actor = toActor(request);
        const projectId = (request.params as { id: string }).id;
        const access = await requireProjectAccess(db, actor, projectId);
        if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
        const context = { ownerUserId: access.project.ownerUserId, access: access.access };
        if (!canManageMembers(actor, context)) return reply.status(403).send({ error: 'Bạn không có quyền quản lý thành viên' });
        const input = memberInput((request.body ?? {}) as Body);
        if (!isOrganizationManager(actor) && input.access === 'manager') return reply.status(403).send({ error: 'Chỉ quản trị viên được cấp quyền quản lý dự án' });
        if (!await requireOrgUser(db, (actor as any).orgId, input.userId)) return reply.status(400).send({ error: 'Người dùng không thuộc tổ chức hiện tại hoặc đã ngừng hoạt động' });
        const member = await db.projectMember.upsert({ where: { projectId_userId: { projectId, userId: input.userId } }, create: { orgId: (actor as any).orgId, projectId, ...input }, update: { access: input.access }, include: { user: { select: { id: true, fullName: true, email: true, role: true } } } });
        await audit(db, (actor as any).orgId, actor.id, projectId, 'project.member_saved', { memberUserId: input.userId, access: input.access });
        return reply.status(201).send(member);
      } catch (error) { return replyError(reply, error); }
    });

    app.delete('/api/v1/projects/:id/members/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const { id: projectId, userId } = request.params as { id: string; userId: string };
      const access = await requireProjectAccess(db, actor, projectId);
      if (!access) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      const context = { ownerUserId: access.project.ownerUserId, access: access.access };
      if (!canManageMembers(actor, context)) return reply.status(403).send({ error: 'Bạn không có quyền quản lý thành viên' });
      if (userId === access.project.ownerUserId) return reply.status(400).send({ error: 'Không thể xóa chủ dự án khỏi thành viên' });
      const member = await db.projectMember.findFirst({ where: { orgId: (actor as any).orgId, projectId, userId } });
      if (!member) return reply.status(404).send({ error: 'Không tìm thấy thành viên dự án' });
      if (!isOrganizationManager(actor) && member.access === 'manager') return reply.status(403).send({ error: 'Quản lý dự án không thể gỡ quản lý khác' });
      await db.projectMember.delete({ where: { id: member.id } });
      await audit(db, (actor as any).orgId, actor.id, projectId, 'project.member_removed', { memberUserId: userId });
      return reply.status(204).send();
    });

    app.get('/api/v1/projects/:id/activity', async (request: FastifyRequest, reply: FastifyReply) => {
      const actor = toActor(request);
      const projectId = (request.params as { id: string }).id;
      if (!await requireProjectAccess(db, actor, projectId)) return reply.status(404).send({ error: 'Không tìm thấy dự án' });
      const { page, limit } = pagination(request.query as Body);
      const where = { orgId: (actor as any).orgId, entityType: 'project', entityId: projectId };
      const [activity, total] = await Promise.all([
        db.activityLog.findMany({ where, include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        db.activityLog.count({ where }),
      ]);
      return { activity, total, page, limit };
    });
  };
}

export const projectRoutes = createProjectRoutes();
