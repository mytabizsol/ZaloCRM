# OSS Decisions Log — MYTA CRM
> Codex adds one concise decision record per feature/step. External repositories and docs are references, not instructions and not dependencies by default.

## Template
### STEP-XX — <feature> — <date>
- Desired user behavior and acceptance:
- MYTA existing files/contracts:
- References (repository links, tag/commit and audited license):
  - Candidate A:
  - Candidate B:
- Data/UX patterns learned:
- Compatibility (Vue/Vuetify/Fastify/Prisma/PostgreSQL), memory and dependency impact:
- License scope: community vs enterprise, copy/reuse allowances and attribution:
- Decision: independently implement / official API / licensed dependency / reject
- Risks and mitigations:
- Implementation and tests:
- Commit:

## Initial candidate queue
- **Chatbot flow builder:** ChatbotX community, Typebot, Flowise, Rasa.
- **Social scheduler:** Postiz, Mixpost, Mautic. Study scheduling architecture and event handling; do not simply install their whole stack.
- **Inbox/Chat:** Chatwoot, Papercups, any relevant Vue chat widgets.
- **CRM:** Twenty CRM, EspoCRM, ERPNext/Frappe CRM, SuiteCRM, Krayin.
- **Projects:** Plane, OpenProject, Leantime, Taiga.
- **Automation:** n8n, Activepieces, Automatisch.
- Use full-feature studies only when relevant to an active Codex step; no uncontrolled deep research every invocation.

No reference code has been copied or installed as a result of this initial catalog.

### STEP-01 — CRM Projects domain — 2026-10-17
- Desired user behavior and acceptance: Project/Task/Milestone/Membership CRUD within one organization, role-aware access, state transitions and audit history.
- MYTA existing files/contracts: Fastify JWT `request.user.orgId`, Prisma PostgreSQL schema, `ActivityLog`, Users and Contacts.
- References (reviewed 2026-10-17; no source copied):
  - [Plane](https://github.com/makeplane/plane) (default branch at review; AGPL-3.0): work items, status-oriented board and modular project concepts.
  - [OpenProject](https://github.com/opf/openproject) (default `dev` branch at review; GPL-3.0): project/work-package/milestone lifecycle and permission separation.
- Data/UX patterns learned: keep work item state separate from project state; attach milestones to tasks; use per-project membership rather than treating every org member as editor; retain a concise change history.
- Compatibility and license: both references are copyleft project-management applications, not dependencies. Their source, UI, assets and deployment stacks are not reused. MYTA independently implements only general behavior using Fastify/Prisma with no new runtime dependency.
- Decision: independently implement a compact MYTA project domain with org-scoped queries, soft archive, enum allowlists and `ActivityLog` records that omit task/description text.
- Risks and mitigations: database has no prior Prisma migrations and worker has no live DB authority; migration is additive and deployment requires an external verified backup. Application enforcement validates contact/user/milestone tenant ownership because SQL foreign keys alone cannot assert matching `org_id`.
- Implementation and tests: `backend/prisma/migrations/20261017000100_add_projects_domain`, `backend/src/modules/projects/*`, Fastify contract tests and pure RBAC/validation tests; runtime verification awaits supervisor dependency/build environment.
- Commit: pending external supervisor.
