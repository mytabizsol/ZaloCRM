import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canDeleteProject,
  canEditProject,
  canEditTask,
  isValidTransition,
} from './project-policy.js';
import { projectInput, taskInput } from './project-validation.js';

const owner = { id: 'owner-1', role: 'member' };
const manager = { id: 'manager-1', role: 'member' };
const participant = { id: 'member-1', role: 'member' };
const viewer = { id: 'viewer-1', role: 'member' };
const context = { ownerUserId: owner.id, access: 'member' as const };

test('RBAC dự án phân biệt owner, manager, participant và viewer', () => {
  assert.equal(canEditProject(owner, context), true);
  assert.equal(canEditProject(manager, { ...context, access: 'manager' }), true);
  assert.equal(canEditProject(participant, context), false);
  assert.equal(canEditProject(viewer, { ...context, access: 'viewer' }), false);
  assert.equal(canDeleteProject(manager, { ...context, access: 'manager' }), false);
  assert.equal(canEditTask(participant, context, participant.id), true);
  assert.equal(canEditTask(participant, context, owner.id), false);
});

test('chỉ cho phép chuyển trạng thái hợp lệ', () => {
  assert.equal(isValidTransition('project', 'planned', 'active'), true);
  assert.equal(isValidTransition('project', 'cancelled', 'active'), false);
  assert.equal(isValidTransition('task', 'todo', 'done'), false);
  assert.equal(isValidTransition('task', 'review', 'done'), true);
});

test('validate dự án và công việc trim dữ liệu, từ chối hạn sai', () => {
  const project = projectInput({ name: '  Ra mắt CRM  ', startAt: '2026-10-17T00:00:00Z', dueAt: '2026-10-18T00:00:00Z' }, true);
  assert.equal(project.name, 'Ra mắt CRM');
  assert.throws(() => projectInput({ name: 'X', startAt: '2026-10-18T00:00:00Z', dueAt: '2026-10-17T00:00:00Z' }, true));
  assert.equal(taskInput({ title: '  Kiểm thử tenant  ', status: 'todo' }, true).title, 'Kiểm thử tenant');
  assert.throws(() => taskInput({ title: '' }, true));
});
