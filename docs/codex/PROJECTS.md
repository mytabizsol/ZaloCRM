# CRM Project Management – Functional spec
Project module is **required** and must integrate, not duplicate, CRM customers.
## Model and business rules
- Project: UUID, orgId, projectCode unique per org, name, description, clientContactId optional, account/org company optional in future, ownerUserId, startAt/dueAt, status (planned/active/on_hold/completed/cancelled), priority, budget optional, progress computed from tasks or explicit approved override, createdAt/updatedAt.
- ProjectMember: membership userId+projectId unique, access (manager/member/viewer), scoped organization. All assigned members are registered users belonging to org.
- ProjectTask: orgId, projectId, title, description, priority, status (todo/in_progress/review/blocked/done), assigneeUserId optional, milestoneId optional, sortOrder, dueAt, createdAt/updatedAt.
- ProjectMilestone: orgId, projectId, title, description, dueAt, status, completedAt. Uniqueness/indexes and cascading behavior documented. Data is never deleted in bulk without confirmation.
- ActivityLog for create/update/reassign/complete project/task/milestone, no sensitive text in logs.
- Project and CRM Contact relation must prevent cross-tenant contactId or userId.
## API
Use Fastify authentication, Prisma filters `orgId`, server-side RBAC + project membership. Proposed routes:
`GET/POST /api/v1/projects`; `GET/PATCH/DELETE /api/v1/projects/:id` (delete soft where appropriate);
`GET/POST/PATCH /api/v1/projects/:id/tasks` (+ task ID operations);
`GET/POST/PATCH /api/v1/projects/:id/milestones`; `GET/POST/DELETE /api/v1/projects/:id/members`;
`GET /api/v1/projects/:id/activity`, `GET /api/v1/projects/stats`.
Validate all payloads with schema validators; bound page size<=100; sort allowlist; transitions valid; stable unique code generation.
## UX
- List page: search, filters customer/status/owner/deadline; cards/table toggle; progress, overdue.
- Create/edit: project metadata and link contact with searchable CRM contact selector; dates and role assign.
- Detail: overview, Kanban/list tasks, milestone timeline, member roster, customer section, activity.
- Responsive 360/390/768/1280; accessible DnD has keyboard fallback with status selector; due dates timezone corrected.
- Settings: optional project status labels/permissions/notifications; no false reports.
## Definition of Done
- Additive migration, verified DB backup before deployment, tenant ownership tests.
- Role matrix owner/admin/project manager/project member/read-only, backend denies wrong role.
- E2E: create project with linked valid customer, create task/milestone, assign member, move task and inspect audit, search and mobile.
- No destructive migration or production seed; staged deployment separately approved.
