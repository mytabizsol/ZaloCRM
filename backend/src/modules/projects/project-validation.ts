import {
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from './project-policy.js';

const PROJECT_MEMBER_ACCESS = ['manager', 'member', 'viewer'] as const;

export function optionalTrimmedString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Giá trị phải là chuỗi ký tự');
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`Giá trị không được quá ${maxLength} ký tự`);
  return trimmed || null;
}

export function requiredString(value: unknown, label: string, maxLength: number): string {
  const normalized = optionalTrimmedString(value, maxLength);
  if (!normalized) throw new Error(`${label} là bắt buộc`);
  return normalized;
}

export function optionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' && !(value instanceof Date)) throw new Error('Ngày không hợp lệ');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Ngày không hợp lệ');
  return date;
}

export function optionalInteger(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`Giá trị phải là số nguyên từ ${min} đến ${max}`);
  return parsed;
}

export function optionalNumber(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`Giá trị phải từ ${min} đến ${max}`);
  return parsed;
}

export function optionalEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return undefined;
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error('Trạng thái hoặc mức ưu tiên không hợp lệ');
  return value as T[number];
}

export function projectInput(body: Record<string, unknown>, creating = false) {
  const startAt = optionalDate(body.startAt);
  const dueAt = optionalDate(body.dueAt);
  if (startAt && dueAt && dueAt < startAt) throw new Error('Hạn hoàn thành phải sau ngày bắt đầu');
  return {
    ...(creating || body.name !== undefined ? { name: requiredString(body.name, 'Tên dự án', 200) } : {}),
    projectCode: optionalTrimmedString(body.projectCode, 64) ?? undefined,
    description: optionalTrimmedString(body.description, 10_000),
    clientContactId: optionalTrimmedString(body.clientContactId, 128),
    ownerUserId: optionalTrimmedString(body.ownerUserId, 128) ?? undefined,
    startAt,
    dueAt,
    status: optionalEnum(body.status, PROJECT_STATUSES),
    priority: optionalEnum(body.priority, PROJECT_PRIORITIES),
    budget: optionalNumber(body.budget, 0, 1_000_000_000_000),
    progressOverride: optionalInteger(body.progressOverride, 0, 100),
  };
}

export function taskInput(body: Record<string, unknown>, creating = false) {
  return {
    ...(creating || body.title !== undefined ? { title: requiredString(body.title, 'Tên công việc', 300) } : {}),
    description: optionalTrimmedString(body.description, 10_000),
    priority: optionalEnum(body.priority, PROJECT_PRIORITIES),
    status: optionalEnum(body.status, TASK_STATUSES),
    assigneeUserId: optionalTrimmedString(body.assigneeUserId, 128),
    milestoneId: optionalTrimmedString(body.milestoneId, 128),
    sortOrder: optionalInteger(body.sortOrder, 0, 1_000_000),
    dueAt: optionalDate(body.dueAt),
  };
}

export function milestoneInput(body: Record<string, unknown>, creating = false) {
  return {
    ...(creating || body.title !== undefined ? { title: requiredString(body.title, 'Tên mốc', 300) } : {}),
    description: optionalTrimmedString(body.description, 10_000),
    dueAt: optionalDate(body.dueAt),
    status: optionalEnum(body.status, MILESTONE_STATUSES),
  };
}

export function memberInput(body: Record<string, unknown>) {
  return {
    userId: requiredString(body.userId, 'Người dùng', 128),
    access: optionalEnum(body.access, PROJECT_MEMBER_ACCESS) ?? 'member',
  };
}

export function pagination(query: Record<string, unknown>) {
  const page = optionalInteger(query.page ?? 1, 1, 1_000_000) ?? 1;
  const limit = optionalInteger(query.limit ?? 25, 1, 100) ?? 25;
  return { page, limit };
}
