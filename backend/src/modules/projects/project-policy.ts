export type OrganizationRole = 'owner' | 'admin' | 'member';
export type ProjectAccess = 'manager' | 'member' | 'viewer' | null;

export interface ProjectActor {
  id: string;
  role: OrganizationRole | string;
}

export interface ProjectPermissionContext {
  ownerUserId: string;
  access: ProjectAccess;
}

export const PROJECT_STATUSES = ['planned', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export const PROJECT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'blocked', 'done'] as const;
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed'] as const;

export function isOrganizationManager(actor: ProjectActor): boolean {
  return actor.role === 'owner' || actor.role === 'admin';
}

export function canEditProject(actor: ProjectActor, context: ProjectPermissionContext): boolean {
  return isOrganizationManager(actor) || context.ownerUserId === actor.id || context.access === 'manager';
}

export function canDeleteProject(actor: ProjectActor, context: ProjectPermissionContext): boolean {
  return isOrganizationManager(actor) || context.ownerUserId === actor.id;
}

export function canManageMembers(actor: ProjectActor, context: ProjectPermissionContext): boolean {
  return canEditProject(actor, context);
}

export function canCreateTask(actor: ProjectActor, context: ProjectPermissionContext): boolean {
  return canEditProject(actor, context) || context.access === 'member';
}

export function canEditTask(
  actor: ProjectActor,
  context: ProjectPermissionContext,
  assigneeUserId: string | null,
): boolean {
  return canEditProject(actor, context) || (context.access === 'member' && assigneeUserId === actor.id);
}

export function canDeleteTask(actor: ProjectActor, context: ProjectPermissionContext): boolean {
  return canEditProject(actor, context);
}

const PROJECT_TRANSITIONS: Record<string, readonly string[]> = {
  planned: ['planned', 'active', 'on_hold', 'cancelled'],
  active: ['active', 'on_hold', 'completed', 'cancelled'],
  on_hold: ['on_hold', 'active', 'cancelled'],
  completed: ['completed', 'active'],
  cancelled: ['cancelled', 'planned'],
};

const TASK_TRANSITIONS: Record<string, readonly string[]> = {
  todo: ['todo', 'in_progress', 'blocked'],
  in_progress: ['in_progress', 'review', 'blocked', 'done'],
  review: ['review', 'in_progress', 'blocked', 'done'],
  blocked: ['blocked', 'todo', 'in_progress'],
  done: ['done', 'todo', 'in_progress'],
};

const MILESTONE_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['pending', 'in_progress', 'completed'],
  in_progress: ['in_progress', 'pending', 'completed'],
  completed: ['completed', 'in_progress'],
};

export function isValidTransition(
  kind: 'project' | 'task' | 'milestone',
  from: string,
  to: string,
): boolean {
  const transitions = kind === 'project'
    ? PROJECT_TRANSITIONS
    : kind === 'task'
      ? TASK_TRANSITIONS
      : MILESTONE_TRANSITIONS;
  return transitions[from]?.includes(to) ?? false;
}
