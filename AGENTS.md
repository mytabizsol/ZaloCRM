# AGENTS.md — MYTA Omnichannel Growth CRM
> Effective from 2026-10-17. This is the primary instruction file for Codex and coding agents working in this repository. Language for user-facing screens, validations, help, and release notes: **Vietnamese**.

## 0. Product mission and the actual scope
Develop MYTA's own production-grade **Omnichannel CRM + Chatbot + Marketing Automation + Social Commerce + Project Management** for small and medium Vietnamese businesses.
- Implement the **52 approved functional rows** in `MYTA-FCHAT-BUSINESS-FEATURE-MATRIX.md` (original Fchat matrix excluding vendor-only advertising-account rental and 1:1 consulting).
- Preserve 10 MYTA-specific extensions in that matrix (Zalo groups, Zalo OA, Facebook, WhatsApp, TikTok, social scheduler, web chat, lead intelligence, AI, SaaS).
- **Add CRM Projects** as a first-class module: projects / project tasks / milestones / teams / customer links / activity and reporting. Specification: `docs/codex/PROJECTS.md`.
- UX/IA and Settings are mandatory foundation, not "polish when finished". Detailed architecture: `docs/codex/UX-IA.md`.
- Never copy Fchat's brand, design assets, wording, copyrighted code, customer data, licenses or tariff. Functional parity through independent implementation.
- Do NOT build vendor services excluded from scope. Do not sneak them back into planning, invoices, navigation, or backlog.

## 1. Source of truth and project structure
Read in this order **before modifying files**:
1. This `AGENTS.md`;
2. `docs/codex/TASKS.md` (only the next uncompleted step);
3. `docs/codex/UX-IA.md` and `docs/codex/PROJECTS.md` as applicable;
4. `MYTA-FCHAT-BUSINESS-FEATURE-MATRIX.md`;
5. inspect **actual source**, existing tests, current git diff, and previous task report.
Stack: Vue 3 + TypeScript + Vuetify 4 + Vue Router + Pinia + Vite; Node/Fastify 5 + TypeScript + Prisma 7 + PostgreSQL 16; Docker Compose; background `node-cron`.
- Backend: `backend/src/modules/<domain>`, route registration `backend/src/app.ts`, `backend/prisma/schema.prisma`.
- Frontend: `frontend/src/views`, `frontend/src/components`, `frontend/src/router/index.ts`, layout `frontend/src/layouts/DefaultLayout.vue`.
- Design and QA checklist in `docs/codex/UX-IA.md`; consistent spacing, buttons, typography, theme, icons, tables, dialogs, empty/loading/error states.
- Current working branch: `feature/upstream-v34-integration`. Do not touch `main` without explicit approval.
- Existing environment: Marketing01 `D:\Apps\ZaloCRM`, app `http://localhost:3080`. PostgreSQL is not disposable. Odoo runs on the same host: never change Odoo containers or shared ports.
- Existing public website form/widget requires separately approved HTTPS-domain exposure. Do not expose localhost to internet by assumption.

## 2. Strict step-by-step Codex workflow
**One task at a time. No global "build everything" prompt, parallel coding agents or autonomous unbounded loop.**
1. Read `docs/codex/TASKS.md` and `docs/codex/PROGRESS.md`. Pick the first `TODO` without unmet dependencies.
2. Before coding: `git status -sb`, inspect related modules, identify exact files and acceptance tests. State plan and risks in progress.
3. Work on ONLY that step; keep PR-sized changes and avoid unrelated refactors.
4. Backend contracts first for backend tasks, then views/components, then API integration and validations. UX acceptance must include desktop widths >= 1280 and mobile widths 360/390/768.
5. Run required checks. On failure, diagnose and fix before completion. Never report "Done" merely because code compiled.
6. Add evidence to `docs/codex/PROGRESS.md`: step ID, files, tests, outstanding risks, working state, commit SHA.
7. Commit only tested changes with `feat(projects): ...`, `feat(settings): ...`, `fix(...): ...` (do not commit credentials).
8. **STOP after that step.** Do not start the next task without a new deliberate Codex invocation. Never silently skip a failed acceptance criterion; mark BLOCKED or PARTIAL.
9. Do not push/deploy unless the invocation explicitly requests it. Never merge to main automatically. Owner can approve next step.
10. If an API requires credentials, permissions or app-review, build safe scaffolding, clearly label `CHỜ CẤP QUYỀN API`, test mocks/contracts, and STOP before claiming real-world success.
11. If Codex CLI is missing auth, has rate limits or hangs, record blocker; do not bypass authentication or spend credits indefinitely.

## 3. Frontend: logic, scientific information architecture, conversion and usability
Screens must be comprehensible to a first-time SME user in under a minute. **Information hierarchy must match business workflow**, not technical module inventory.
- Primary navigation (max 7 headings; collapsible groups):
  1. Tổng quan
  2. Khách hàng & Bán hàng: Leads, Contacts, Lead Scoring, khách trùng, Orders, Appointments
  3. Hội thoại & Kênh: Unified Inbox, Website Chat, Zalo Group Scan, channels
  4. Marketing: Social Publishing, Campaigns, Chatbot, Automation, landing/form
  5. Dự án: list, board, milestones, members/tasks and project reports
  6. Phân tích: CRM + channel + marketing + project KPIs, audit when authorized
  7. Cài đặt: all organization and account/configuration options
- One active group per location, no duplicated routes or orphan menus. Breadcrumbs for depth >=2. Contextual quick actions, clear empty states and logical user journeys. Search/filter/sort/pagination where lists need them.
- **Cài đặt is a dedicated hub**, not just "Nhân viên": Tài khoản cá nhân; Công ty/tổ chức; Nhân sự, đội nhóm & quyền; Kết nối & API (Zalo/Meta/WhatsApp/TikTok/WordPress/email); Kịch bản & AI; Website Chat & Forms; Thông báo, workflow & giờ làm việc; Bảo mật, nhật ký & sao lưu; Giao diện & thương hiệu; Gói, hạn mức & thanh toán (future, clearly tagged).
- Existing `/settings` tabs users/teams/org remain usable. Move `/api-settings`, channels and credentials into appropriate Settings subsections or aliases, not delete them.
- Project module must have its own top-level menu, not buried in Contacts or Orders; link projects from contact detail. Project statuses and tasks must be distinguishable from lead pipeline stages.
- UX must support Vietnamese diacritics, sensible date/timezone Asia/Ho_Chi_Minh, responsive mobile drawer, visible focus states, keyboard access, contrast and touch targets >=40px.
- Reuse Vuetify primitives/components and existing design tokens. Do not scatter hard-coded colors/gradients or generate placeholder charts claiming real data. Avoid horizontal overflow, duplicated titles, nested modals, tiny text, and "fake ONLINE" status.
- Every form: field label, required indication, trim/validate, submit loading state, server error, success feedback; never expose tokens after save. Every list: loading/empty/error/no-results states; destructive actions confirmed.
- Build functional end-to-end flow before decorating. Do not copy UI from Fchat; MYTA identity should look deliberate, modern and accessible.

## 4. Domain model: Project Management (mandatory P0)
See `docs/codex/PROJECTS.md`. At minimum implement:
- Project: name, code, description, start/due, status, priority, progress, owner, customer/contact, budget optional; scoped by `orgId`.
- Membership / RBAC: owner, project-manager, participant; verify users and contacts belong to the SAME organization.
- Tasks: title, description, status, priority, assignee, due date, ordering, linked milestone. Notes and change history.
- Milestones: due date, status, completion evidence; project/activity summary.
- Views: List + Kanban + detail tabs (overview, tasks, milestones, members, related CRM customer, activities), later timeline/calendar and resource workloads.
- Dashboard: on-time / overdue / completed / blocked counts. Store all times UTC, render in configured timezone.
- Never globally allow members to edit or delete other teams' projects; enforce authorization server-side as well as UI.
- Start with durable CRUD+indexes+audits and mobile-usable board; attachments and cross-project reporting follow after core acceptance.

## 5. Backend, data safety and security
- Validate all payloads, request-scoped tenancy, pagination and ID ownership. Backend is authority; hiding a button is not authorization.
- Prisma migration: additive reviewed SQL only, no destructive migration, never `db push --accept-data-loss`, no wipe/reseed of live DB. Always take and verify a timestamped DB backup before changing deployed schema.
- Protect credentials with encryption, never print/session-log/commit access tokens, cookie stores or .env. Respect licensing of OSS dependencies; upstream AGPL source must not be copied into permissive downstream without verified legal compatibility.
- External providers: use approved official OAuth/Graph/Cloud APIs; scoped tokens, webhook validation, refresh strategy, revocation, idempotency, rate limits and explicit publication state. No automated mass DM/scraping non-permitted data.
- Multi-tenant `orgId` on all new records, linked contacts, members, tasks, attachments, API queries, exports and sockets; ensure no cross-tenant IDOR.
- For jobs, use explicit state machine, idempotency keys and audit; never mark asynchronous `accepted` as `published`.
- Do not modify unrelated Docker containers; confirm Zalo CRM db remains healthy and backup exists.

## 6. Quality gates and Definition of Done
Required for every task:
- `npm run build` in backend and frontend or `docker compose build app` when node_modules not installed; no TS errors.
- Integration tests of happy path, permission denied, cross-org access, invalid payload, and empty data. Add automated tests when feasible; when not, explicitly record manual QA still pending.
- UI routes render after auth; responsive smoke checks for 360/390/768/1280 and focus/keyboard states. Never claim these passed unless actually tested.
- `GET /health` is 200 when deployment is requested; verify container DB health. Avoid disabling existing features.
- Document relevant API schemas and user guidance in Vietnamese. QA report must distinguish `implemented`, `tested`, `provider-authorized`, and `deployed`.
- Progress report format: **Step / Scope / Files / Build / Tests / Blockers / Before-After / Commit / Next step**.

## 7. Task queue
The executable roadmap is `docs/codex/TASKS.md`. Start with **STEP-00** (IA & Settings UX), then **STEP-01 / STEP-02** (Projects backend / frontend), then Omnichannel, Flow Builder, Marketing, Commerce, Loyalty and SaaS. All 52 features remain required but each is delivered independently and verified against the matrix.

## 8. MYTA CRM ownership, official brand and Codex skills (17 Oct 2026)
- **The product displayed to customers is MYTA CRM**, by MYTA Business Solutions. Zalo is one connected channel, not the name/logo of the product. Replace previous "ZaloCRM" branding in headers, login, favicon, browser title, onboarding/help and top-level UI; preserve legacy API/technical package identifiers until deliberate backwards-compatible migration.
- Exact original logo files (copied from the MYTA child theme on Marketing01): `frontend/public/brand/myta-logo.png` and `frontend/public/brand/myta-favicon.png`. NEVER redraw, recolor, invent or alter logo. Use brand guidance in `docs/codex/UX-IA.md`.
- Use **GPT-5.6-Terra with High reasoning** for scoped tasks: local `.codex/config.toml` with `model=gpt-5.6-terra` and `model_reasoning_effort=high`. This does not guarantee fewer tokens; minimize context by task and relevant skills. Do not change the global user's Codex model.
- Codex must **study and learn** from relevant open source on GitHub before architecting big new features. Reproduce product behaviors independently; do not treat learning as permission to indiscriminately copy source. Official details in `docs/codex/GITHUB-OSS-RESEARCH.md`.
- Installed skills already on Marketing01: `frontend-app-builder`, `myta-premium-web-design`. For MYTA CRM selectively use repo skills:
  - `.agents/skills/myta-crm-product-ux/SKILL.md`
  - `.agents/skills/myta-crm-backend/SKILL.md`
  - `.agents/skills/myta-oss-research/SKILL.md`
  - `.agents/skills/myta-crm-qa/SKILL.md`.
- Brand-specific WordPress skill techniques are a visual reference only: do not overwrite CRM Vue routing, replace WordPress code, or require WordPress ImageGen workflows for ordinary settings/navigation work.
- **No autonomous endless task loops:** finish and verify ONE step; log progress and stop. Each subsequent step must be deliberately launched or approved. Cost-aware Codex usage is more important than artificially maximizing parallelism.
- **Step 00 focus:** rebrand with exact MYTA logo and build a logical CRM sidebar/Settings hub. Do not add fake settings pages that imply unimplemented features work. **Steps 01/02:** first-class CRM Project module. See `docs/codex/TASKS.md`.
