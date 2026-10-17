import { computed, ref } from 'vue';
import { api } from '@/api/index';

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';

export interface ProjectContact { id: string; fullName: string | null; phone?: string | null; email?: string | null }
export interface ProjectUser { id: string; fullName: string; email?: string; role?: string; isActive?: boolean }
export interface ProjectMember { id: string; userId: string; access: 'manager' | 'member' | 'viewer'; user: ProjectUser }
export interface ProjectTask {
  id: string; title: string; description?: string | null; priority: string; status: TaskStatus;
  assigneeUserId?: string | null; assignee?: ProjectUser | null; milestoneId?: string | null;
  milestone?: { id: string; title: string } | null; dueAt?: string | null; sortOrder: number;
}
export interface ProjectMilestone { id: string; title: string; description?: string | null; dueAt?: string | null; status: string; completedAt?: string | null }
export interface ProjectActivity { id: string; action: string; createdAt: string; user?: ProjectUser | null }
export interface Project {
  id: string; projectCode: string; name: string; description?: string | null; status: ProjectStatus;
  priority: string; progress: number; startAt?: string | null; dueAt?: string | null; budget?: number | null;
  clientContactId?: string | null; clientContact?: ProjectContact | null; ownerUserId: string; owner?: ProjectUser;
  members?: ProjectMember[]; milestones?: ProjectMilestone[]; createdAt?: string; updatedAt?: string;
}

export const PROJECT_STATUS_OPTIONS = [
  { title: 'Lên kế hoạch', value: 'planned' }, { title: 'Đang thực hiện', value: 'active' },
  { title: 'Tạm dừng', value: 'on_hold' }, { title: 'Hoàn thành', value: 'completed' }, { title: 'Đã hủy', value: 'cancelled' },
] as const;
export const TASK_STATUS_OPTIONS = [
  { title: 'Cần làm', value: 'todo' }, { title: 'Đang làm', value: 'in_progress' },
  { title: 'Chờ duyệt', value: 'review' }, { title: 'Bị chặn', value: 'blocked' }, { title: 'Hoàn tất', value: 'done' },
] as const;
export const PRIORITY_OPTIONS = [
  { title: 'Thấp', value: 'low' }, { title: 'Bình thường', value: 'normal' },
  { title: 'Cao', value: 'high' }, { title: 'Khẩn', value: 'urgent' },
] as const;

export function statusLabel(status: string) { return PROJECT_STATUS_OPTIONS.find(item => item.value === status)?.title ?? status; }
export function taskStatusLabel(status: string) { return TASK_STATUS_OPTIONS.find(item => item.value === status)?.title ?? status; }
export function priorityLabel(priority: string) { return PRIORITY_OPTIONS.find(item => item.value === priority)?.title ?? priority; }
export function statusColor(status: string) {
  return ({ planned: 'secondary', active: 'primary', on_hold: 'warning', completed: 'success', cancelled: 'grey', todo: 'secondary', in_progress: 'primary', review: 'info', blocked: 'error', done: 'success' } as Record<string, string>)[status] ?? 'secondary';
}
export function priorityColor(priority: string) { return ({ low: 'secondary', normal: 'info', high: 'warning', urgent: 'error' } as Record<string, string>)[priority] ?? 'secondary'; }
export function localDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
}
export function dateInput(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
export function isOverdue(value?: string | null, status?: string) { return Boolean(value && !['completed', 'cancelled', 'done'].includes(status ?? '') && new Date(value).getTime() < Date.now()); }

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string } } })?.response?.data;
  return data?.error ?? fallback;
}

export function useProjectResources() {
  const contacts = ref<ProjectContact[]>([]);
  const users = ref<ProjectUser[]>([]);
  async function load() {
    const [contactResult, userResult] = await Promise.allSettled([
      api.get('/contacts', { params: { limit: 100 } }), api.get('/users'),
    ]);
    if (contactResult.status === 'fulfilled') contacts.value = contactResult.value.data.contacts ?? [];
    if (userResult.status === 'fulfilled') users.value = (userResult.value.data.users ?? []).filter((user: ProjectUser) => user.isActive !== false);
  }
  return { contacts, users, load };
}

export function useProjects() {
  const projects = ref<Project[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref('');
  const filters = ref({ search: '', status: '', ownerUserId: '', clientContactId: '', deadline: '' });
  const pagination = ref({ page: 1, limit: 25 });
  const filteredProjects = computed(() => {
    if (!filters.value.deadline) return projects.value;
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return projects.value.filter(project => filters.value.deadline === 'overdue'
      ? isOverdue(project.dueAt, project.status)
      : Boolean(project.dueAt && new Date(project.dueAt).getTime() >= Date.now() && new Date(project.dueAt).getTime() <= soon));
  });
  async function fetchProjects() {
    loading.value = true; error.value = '';
    try {
      const response = await api.get('/projects', { params: { page: pagination.value.page, limit: pagination.value.limit, search: filters.value.search || undefined, status: filters.value.status || undefined, ownerUserId: filters.value.ownerUserId || undefined, clientContactId: filters.value.clientContactId || undefined } });
      projects.value = response.data.projects ?? []; total.value = response.data.total ?? projects.value.length;
    } catch (cause) { error.value = errorMessage(cause, 'Không thể tải danh sách dự án.'); }
    finally { loading.value = false; }
  }
  async function createProject(payload: Record<string, unknown>) { return (await api.post<Project>('/projects', payload)).data; }
  return { projects, filteredProjects, total, loading, error, filters, pagination, fetchProjects, createProject };
}

export function useProjectDetail(projectId: string) {
  const project = ref<Project | null>(null); const tasks = ref<ProjectTask[]>([]); const milestones = ref<ProjectMilestone[]>([]);
  const members = ref<ProjectMember[]>([]); const activity = ref<ProjectActivity[]>([]); const loading = ref(false); const error = ref('');
  async function load() {
    loading.value = true; error.value = '';
    try {
      const [projectResult, taskResult, milestoneResult, memberResult, activityResult] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`), api.get(`/projects/${projectId}/tasks`), api.get(`/projects/${projectId}/milestones`), api.get(`/projects/${projectId}/members`), api.get(`/projects/${projectId}/activity`),
      ]);
      project.value = projectResult.data; tasks.value = taskResult.data.tasks ?? []; milestones.value = milestoneResult.data.milestones ?? []; members.value = memberResult.data.members ?? []; activity.value = activityResult.data.activity ?? [];
    } catch (cause) { error.value = errorMessage(cause, 'Không thể tải chi tiết dự án.'); }
    finally { loading.value = false; }
  }
  async function saveProject(payload: Record<string, unknown>) { project.value = (await api.patch<Project>(`/projects/${projectId}`, payload)).data; }
  async function addTask(payload: Record<string, unknown>) { tasks.value.push((await api.post<ProjectTask>(`/projects/${projectId}/tasks`, payload)).data); await loadProjectOnly(); }
  async function updateTask(taskId: string, payload: Record<string, unknown>) { const next = (await api.patch<ProjectTask>(`/projects/${projectId}/tasks/${taskId}`, payload)).data; const index = tasks.value.findIndex(task => task.id === taskId); if (index >= 0) tasks.value[index] = next; await loadProjectOnly(); }
  async function addMilestone(payload: Record<string, unknown>) { milestones.value.push((await api.post<ProjectMilestone>(`/projects/${projectId}/milestones`, payload)).data); }
  async function updateMilestone(milestoneId: string, payload: Record<string, unknown>) { const next = (await api.patch<ProjectMilestone>(`/projects/${projectId}/milestones/${milestoneId}`, payload)).data; const index = milestones.value.findIndex(item => item.id === milestoneId); if (index >= 0) milestones.value[index] = next; }
  async function saveMember(payload: { userId: string; access: string }) { const next = (await api.post<ProjectMember>(`/projects/${projectId}/members`, payload)).data; const index = members.value.findIndex(item => item.userId === next.userId); if (index >= 0) members.value[index] = next; else members.value.push(next); }
  async function removeMember(userId: string) { await api.delete(`/projects/${projectId}/members/${userId}`); members.value = members.value.filter(member => member.userId !== userId); }
  async function loadProjectOnly() { project.value = (await api.get<Project>(`/projects/${projectId}`)).data; }
  return { project, tasks, milestones, members, activity, loading, error, load, saveProject, addTask, updateTask, addMilestone, updateMilestone, saveMember, removeMember };
}
