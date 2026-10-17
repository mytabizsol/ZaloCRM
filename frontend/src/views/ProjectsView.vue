<template>
  <main aria-labelledby="projects-title">
    <div class="d-flex align-center flex-wrap ga-3 mb-5">
      <div>
        <h1 id="projects-title" class="text-h5">Dự án</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">Theo dõi tiến độ công việc gắn với khách hàng CRM.</p>
      </div>
      <v-spacer />
      <v-btn-toggle v-model="view" mandatory density="comfortable" aria-label="Chọn cách xem dự án">
        <v-btn value="table" icon="mdi-format-list-bulleted" aria-label="Xem dạng bảng" />
        <v-btn value="kanban" icon="mdi-view-kanban-outline" aria-label="Xem dạng Kanban" />
      </v-btn-toggle>
      <v-btn color="primary" prepend-icon="mdi-plus" min-height="40" @click="openCreate">Tạo dự án</v-btn>
    </div>

    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="4"><v-text-field v-model.trim="filters.search" label="Tìm theo tên hoặc mã dự án" prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" clearable hide-details @keyup.enter="applyFilters" /></v-col>
          <v-col cols="6" md="2"><v-select v-model="filters.status" label="Trạng thái" :items="projectStatuses" variant="outlined" density="comfortable" clearable hide-details /></v-col>
          <v-col cols="6" md="2"><v-select v-model="filters.ownerUserId" label="Chủ dự án" :items="users" item-title="fullName" item-value="id" variant="outlined" density="comfortable" clearable hide-details /></v-col>
          <v-col cols="6" md="2"><v-select v-model="filters.clientContactId" label="Khách hàng" :items="contacts" item-title="fullName" item-value="id" variant="outlined" density="comfortable" clearable hide-details /></v-col>
          <v-col cols="6" md="2"><v-select v-model="filters.deadline" label="Hạn hoàn thành" :items="deadlineOptions" variant="outlined" density="comfortable" clearable hide-details /></v-col>
        </v-row>
        <div class="d-flex ga-2 mt-3"><v-btn color="primary" variant="tonal" @click="applyFilters">Áp dụng</v-btn><v-btn variant="text" @click="resetFilters">Xóa bộ lọc</v-btn></div>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" closable class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" aria-label="Đang tải dự án" />

    <template v-if="!loading && filteredProjects.length">
      <v-card v-if="view === 'table'" variant="outlined" class="d-none d-md-block">
        <v-table hover aria-label="Danh sách dự án"><thead><tr><th>Dự án</th><th>Khách hàng</th><th>Trạng thái</th><th>Tiến độ</th><th>Hạn hoàn thành</th><th></th></tr></thead>
          <tbody><tr v-for="project in filteredProjects" :key="project.id" class="project-row" tabindex="0" @click="openProject(project.id)" @keydown.enter="openProject(project.id)">
            <td><div class="font-weight-medium">{{ project.name }}</div><div class="text-caption text-medium-emphasis">{{ project.projectCode }}</div></td>
            <td>{{ project.clientContact?.fullName ?? 'Chưa liên kết' }}</td><td><v-chip size="small" :color="statusColor(project.status)" variant="tonal">{{ statusLabel(project.status) }}</v-chip></td>
            <td class="progress-cell"><span>{{ project.progress }}%</span><v-progress-linear :model-value="project.progress" height="6" rounded color="primary" /></td>
            <td><span :class="{ 'text-error font-weight-medium': isOverdue(project.dueAt, project.status) }">{{ localDate(project.dueAt) }}</span></td>
            <td><v-btn icon="mdi-chevron-right" variant="text" :aria-label="`Mở ${project.name}`" @click.stop="openProject(project.id)" /></td>
          </tr></tbody>
        </v-table>
      </v-card>
      <div v-if="view === 'table'" class="d-md-none"><v-card v-for="project in filteredProjects" :key="project.id" variant="outlined" class="mb-3" tabindex="0" role="button" @click="openProject(project.id)" @keydown.enter="openProject(project.id)"><v-card-text><div class="d-flex align-start"><div><div class="font-weight-medium">{{ project.name }}</div><div class="text-caption text-medium-emphasis">{{ project.projectCode }}</div></div><v-spacer /><v-chip size="small" :color="statusColor(project.status)" variant="tonal">{{ statusLabel(project.status) }}</v-chip></div><div class="d-flex justify-space-between mt-4 text-body-2"><span>{{ project.clientContact?.fullName ?? 'Chưa liên kết khách hàng' }}</span><span :class="{ 'text-error': isOverdue(project.dueAt, project.status) }">{{ localDate(project.dueAt) }}</span></div><v-progress-linear class="mt-2" :model-value="project.progress" rounded height="6" /></v-card-text></v-card></div>
      <div v-if="view === 'kanban'" class="kanban" aria-label="Bảng Kanban dự án"><section v-for="column in projectStatuses" :key="column.value" class="kanban-column"><div class="d-flex align-center mb-2"><h2 class="text-subtitle-1">{{ column.title }}</h2><v-spacer /><v-chip size="x-small">{{ projectsByStatus[column.value]?.length ?? 0 }}</v-chip></div><v-card v-for="project in projectsByStatus[column.value]" :key="project.id" variant="outlined" class="mb-2" tabindex="0" role="button" @click="openProject(project.id)" @keydown.enter="openProject(project.id)"><v-card-text><div class="font-weight-medium">{{ project.name }}</div><div class="text-caption text-medium-emphasis">{{ project.projectCode }}</div><v-progress-linear class="my-3" :model-value="project.progress" height="6" rounded /><div class="d-flex justify-space-between text-caption"><span>{{ project.progress }}%</span><span :class="{ 'text-error': isOverdue(project.dueAt, project.status) }">{{ localDate(project.dueAt) }}</span></div></v-card-text></v-card><p v-if="!projectsByStatus[column.value]?.length" class="text-caption text-medium-emphasis pa-3">Chưa có dự án.</p></section></div>
    </template>
    <v-empty-state v-else-if="!loading" icon="mdi-briefcase-outline" title="Chưa có dự án phù hợp" text="Tạo dự án đầu tiên để tổ chức công việc và liên kết khách hàng." action-text="Tạo dự án" @click:action="openCreate" />

    <v-dialog v-model="dialog" max-width="760" persistent><v-card><v-card-title>{{ 'Tạo dự án' }}</v-card-title><v-card-text><v-alert v-if="formError" type="error" density="compact" class="mb-3">{{ formError }}</v-alert><v-form ref="formRef" @submit.prevent="submit"><v-row><v-col cols="12" sm="8"><v-text-field v-model.trim="form.name" label="Tên dự án *" :rules="[required]" variant="outlined" autofocus /></v-col><v-col cols="12" sm="4"><v-text-field v-model.trim="form.projectCode" label="Mã dự án" hint="Để trống để tự tạo" persistent-hint variant="outlined" /></v-col><v-col cols="12"><v-textarea v-model.trim="form.description" label="Mô tả" variant="outlined" rows="2" /></v-col><v-col cols="12" sm="6"><v-select v-model="form.clientContactId" label="Khách hàng liên kết" :items="contacts" item-title="fullName" item-value="id" clearable variant="outlined" /></v-col><v-col cols="12" sm="6"><v-select v-model="form.ownerUserId" label="Chủ dự án" :items="users" item-title="fullName" item-value="id" clearable variant="outlined" /></v-col><v-col cols="12" sm="4"><v-select v-model="form.status" label="Trạng thái" :items="projectStatuses" variant="outlined" /></v-col><v-col cols="12" sm="4"><v-select v-model="form.priority" label="Mức ưu tiên" :items="priorities" variant="outlined" /></v-col><v-col cols="12" sm="4"><v-text-field v-model="form.budget" label="Ngân sách (VND)" type="number" min="0" variant="outlined" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.startAt" label="Ngày bắt đầu" type="date" variant="outlined" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.dueAt" label="Hạn hoàn thành" type="date" :rules="[validDates]" variant="outlined" /></v-col></v-row></v-form></v-card-text><v-card-actions><v-spacer /><v-btn variant="text" :disabled="saving" @click="dialog = false">Hủy</v-btn><v-btn color="primary" :loading="saving" @click="submit">Tạo dự án</v-btn></v-card-actions></v-card></v-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS, type Project, isOverdue, localDate, statusColor, statusLabel, useProjectResources, useProjects } from '@/composables/use-projects';

const router = useRouter(); const view = ref<'table' | 'kanban'>('table'); const dialog = ref(false); const saving = ref(false); const formError = ref(''); const formRef = ref();
const { contacts, users, load: loadResources } = useProjectResources();
const { filteredProjects, loading, error, filters, fetchProjects, createProject } = useProjects();
const projectStatuses = PROJECT_STATUS_OPTIONS; const priorities = PRIORITY_OPTIONS; const deadlineOptions = [{ title: 'Quá hạn', value: 'overdue' }, { title: 'Trong 7 ngày tới', value: 'soon' }];
const form = reactive({ name: '', projectCode: '', description: '', clientContactId: '', ownerUserId: '', status: 'planned', priority: 'normal', budget: '', startAt: '', dueAt: '' });
const projectsByStatus = computed(() => Object.fromEntries(projectStatuses.map(status => [status.value, filteredProjects.value.filter(project => project.status === status.value)])) as Record<string, Project[]>);
const required = (value: string) => Boolean(value?.trim()) || 'Tên dự án là bắt buộc';
const validDates = () => !form.startAt || !form.dueAt || form.dueAt >= form.startAt || 'Hạn hoàn thành phải sau ngày bắt đầu';
function openProject(id: string) { router.push({ name: 'ProjectDetail', params: { id } }); }
function openCreate() { Object.assign(form, { name: '', projectCode: '', description: '', clientContactId: '', ownerUserId: '', status: 'planned', priority: 'normal', budget: '', startAt: '', dueAt: '' }); formError.value = ''; dialog.value = true; }
function applyFilters() { fetchProjects(); }
function resetFilters() { Object.assign(filters.value, { search: '', status: '', ownerUserId: '', clientContactId: '', deadline: '' }); fetchProjects(); }
async function submit() { const result = await formRef.value?.validate(); if (result && !result.valid) return; saving.value = true; formError.value = ''; try { const project = await createProject({ name: form.name, projectCode: form.projectCode || undefined, description: form.description || undefined, clientContactId: form.clientContactId || null, ownerUserId: form.ownerUserId || undefined, status: form.status, priority: form.priority, budget: form.budget ? Number(form.budget) : undefined, startAt: form.startAt || null, dueAt: form.dueAt || null }); dialog.value = false; openProject(project.id); } catch (cause) { formError.value = (cause as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Không thể tạo dự án.'; } finally { saving.value = false; } }
onMounted(async () => { await Promise.all([fetchProjects(), loadResources()]); });
</script>

<style scoped>
.project-row { cursor: pointer; }
.project-row:focus-visible, .kanban-column :deep([role='button']):focus-visible { outline: 3px solid rgb(var(--v-theme-primary)); outline-offset: -3px; }
.progress-cell { min-width: 130px; }
.kanban { display: grid; grid-template-columns: repeat(5, minmax(220px, 1fr)); gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.kanban-column { min-height: 240px; padding: 12px; border-radius: 8px; background: rgb(var(--v-theme-surface-variant)); }
</style>
