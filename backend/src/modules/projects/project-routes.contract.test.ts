import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { createProjectRoutes } from './project-routes.js';

const actor = { id: 'user-a', email: 'a@example.test', role: 'member', orgId: 'org-a' };

function fakeDatabase() {
  const projects: any[] = [];
  const memberships: any[] = [];
  const activity: any[] = [];
  const users = [{ id: actor.id, orgId: 'org-a', isActive: true }];
  const contacts = [{ id: 'contact-a', orgId: 'org-a' }, { id: 'contact-b', orgId: 'org-b' }];
  const db: any = {
    $transaction: async (callback: any) => callback(db),
    user: { findFirst: async ({ where }: any) => users.find((user) => user.id === where.id && user.orgId === where.orgId && user.isActive) ?? null },
    contact: { findFirst: async ({ where }: any) => contacts.find((contact) => contact.id === where.id && contact.orgId === where.orgId) ?? null },
    activityLog: { create: async ({ data }: any) => { activity.push(data); return data; } },
    projectMember: {
      upsert: async ({ create, update, where }: any) => {
        const existing = memberships.find((member) => member.projectId === where.projectId_userId.projectId && member.userId === where.projectId_userId.userId);
        if (existing) Object.assign(existing, update);
        else memberships.push({ id: `member-${memberships.length + 1}`, ...create });
        return existing ?? memberships.at(-1);
      },
    },
    project: {
      create: async ({ data }: any) => {
        const project = { id: `project-${projects.length + 1}`, ...data, members: [], tasks: [], milestones: [], owner: null, clientContact: null };
        projects.push(project);
        return project;
      },
      findUnique: async ({ where }: any) => {
        const project = projects.find((item) => item.id === where.id);
        return project ? { ...project, members: memberships.filter((member) => member.projectId === project.id), tasks: [], milestones: [] } : null;
      },
      findFirst: async ({ where }: any) => {
        const project = projects.find((item) => item.id === where.id && item.orgId === where.orgId && !item.isDeleted);
        return project ? { ...project, members: memberships.filter((member) => member.projectId === project.id), tasks: [], milestones: [] } : null;
      },
      findMany: async () => [],
      count: async () => 0,
    },
    projectTask: { count: async () => 0 },
  };
  return { db, projects, memberships, activity };
}

async function testApp(db: any) {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: 'project-contract-test' });
  await app.register(createProjectRoutes(db));
  return app;
}

test('POST /projects tạo dự án cùng tenant, owner membership và audit', async () => {
  const fixture = fakeDatabase();
  const app = await testApp(fixture.db);
  const token = app.jwt.sign(actor);
  const response = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: { authorization: `Bearer ${token}` }, payload: { name: 'Dự án tenant an toàn', clientContactId: 'contact-a' } });
  assert.equal(response.statusCode, 201);
  assert.equal(fixture.projects[0].orgId, 'org-a');
  assert.equal(fixture.memberships[0].userId, actor.id);
  assert.equal(fixture.memberships[0].access, 'manager');
  assert.equal(fixture.activity[0].action, 'project.created');
  await app.close();
});

test('POST /projects từ chối contact tenant khác và GET che giấu dự án tenant khác', async () => {
  const fixture = fakeDatabase();
  const app = await testApp(fixture.db);
  const token = app.jwt.sign(actor);
  const invalidContact = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: { authorization: `Bearer ${token}` }, payload: { name: 'Sai tenant', clientContactId: 'contact-b' } });
  assert.equal(invalidContact.statusCode, 400);
  const missingProject = await app.inject({ method: 'GET', url: '/api/v1/projects/project-from-org-b', headers: { authorization: `Bearer ${token}` } });
  assert.equal(missingProject.statusCode, 404);
  await app.close();
});

test('payload thiếu tên dự án bị từ chối trước khi ghi dữ liệu', async () => {
  const fixture = fakeDatabase();
  const app = await testApp(fixture.db);
  const token = app.jwt.sign(actor);
  const response = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: { authorization: `Bearer ${token}` }, payload: {} });
  assert.equal(response.statusCode, 400);
  assert.equal(fixture.projects.length, 0);
  await app.close();
});

test('GET /projects trả tập rỗng an toàn và viewer bị từ chối khi sửa dự án', async () => {
  const fixture = fakeDatabase();
  fixture.projects.push({ id: 'project-a', orgId: 'org-a', ownerUserId: 'someone-else', status: 'planned', isDeleted: false, members: [], tasks: [], milestones: [] });
  fixture.memberships.push({ id: 'viewer-membership', projectId: 'project-a', userId: actor.id, access: 'viewer' });
  const app = await testApp(fixture.db);
  const token = app.jwt.sign(actor);
  const empty = await app.inject({ method: 'GET', url: '/api/v1/projects', headers: { authorization: `Bearer ${token}` } });
  assert.equal(empty.statusCode, 200);
  assert.deepEqual(empty.json().projects, []);
  const forbidden = await app.inject({ method: 'PATCH', url: '/api/v1/projects/project-a', headers: { authorization: `Bearer ${token}` }, payload: { name: 'Không được phép' } });
  assert.equal(forbidden.statusCode, 403);
  await app.close();
});
