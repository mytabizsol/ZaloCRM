# MYTA CRM – Sequential Codex Backlog
> Project model: GPT-5.6-Terra, reasoning High. ONE step per explicit Codex invocation. Source of truth: `AGENTS.md`.

| ID | State | Deliverable | Acceptance gates | Dependencies |
|---|---|---|---|---|
| STEP-00 | PARTIAL | **MYTA CRM branding + scientific IA + Settings hub** | Use exact MYTA original logo, update title/favicon/header/login/product names, group navigation by business domain, migrate old links with redirects, Settings hub with clearly labeled subpages. Desktop/mobile UX; no DB changes. | None |
| STEP-01 | TODO | **CRM Projects domain** | Prisma migration with verified backup, Project/Task/Milestone/Membership with tenant-safe CRUD, proper RBAC and tests. | STEP-00 |
| STEP-02 | TODO | **CRM Projects frontend** | Project list/table + Kanban + creation/detail/tasks/milestones/members, linked contact, filters, deadlines, responsive and accessibility tests. | STEP-01 |
| STEP-03 | TODO | **Project reporting & Settings** | Project KPIs, overdue notices, owner assignments, configurable defaults, project activity history, permission tests. | STEP-02 |
| STEP-04 | TODO | **Omnichannel Inbox architecture** | Provider-independent conversation adapter/threads/assignment/search and clear channel status. No fabricated sync. | STEP-00 |
| STEP-05 | TODO | **Meta Page connection** | Official OAuth, webhook signature, Page messages/comments, permission and token refresh, e2e on authorized test Page. | STEP-04 + Meta credentials |
| STEP-06 | TODO | **Facebook automation** | F01/F02/F24 automated comment reply/hide; keyword conditions, limits, consent/opt-out and audit. | STEP-05 |
| STEP-07 | TODO | **Visual Chatbot Builder** | F06/F12/F13/F14/F15 blocks, flow engine, keywords, tags, publish/draft, designer and simulation; reference ChatbotX Community only when license permits. | STEP-04 |
| STEP-08 | TODO | **Marketing sequences and campaigns** | F16/F17, segments, delay, activation/pausing, opt-in and statistics. | STEP-07 |
| STEP-09 | TODO | **Website acquisition suite** | F05/F07/F10/F11/F34, popup + webform builder + landing pages + UTM/QR/ref tracking. | STEP-00 |
| STEP-10 | TODO | **Google Sheets + email** | F04/F25/F47, Sheets field mapping, email campaigns, domain verification, opt-out and delivery logs. | STEP-00 |
| STEP-11 | TODO | **Commerce core** | F08/F09/F18/F19/F28-F31, products, bundles, cart/checkout, inventory, shipping, receipts, order workflows. | STEP-02 |
| STEP-12 | TODO | **Payment / coupons / accounting** | F32/F33/F40/F44, coupon allocation, reconciliation, payment gateways and receipts. | STEP-11 |
| STEP-13 | TODO | **Gamification and loyalty** | F35-F39/F42/F43/F45, VIP/points/wheel/raffle/affiliate + fraud controls. | STEP-12 |
| STEP-14 | TODO | **AI knowledge assistant** | F21/F53, searchable KB, draft-only AI answer, human review and tenant isolation. | STEP-07 |
| STEP-15 | TODO | **Provider and platform operations** | F20/F22/F23/F26/F27/F41/F46/F48/F50/F52/F54, integrations, API, quotas, gallery, DNS, Ads account *management* (not rentals), CRM API. | STEP-04 |
| STEP-16 | TODO | **MYTA omnichannel extension parity** | Zalo OA full messaging, WhatsApp Business, Telegram if approved, TikTok status/video, Zalo groups, Website Chat full, social planner reporting. | STEP-04 |
| STEP-17 | TODO | **Integrated QA + release** | E2E, 4 responsive viewports, abuse/rate-limit, DAST/security, migrations rollback, performance budget, staged release and documented gaps. | All implemented steps |

## Process
1. Read `AGENTS.md`, `docs/codex/UX-IA.md`, `docs/codex/PROJECTS.md`, `docs/codex/GITHUB-OSS-RESEARCH.md`, then the relevant skill `SKILL.md`.
2. Review `docs/codex/PROGRESS.md` and actual source. Select the first TODO with satisfied dependencies; if blocked, record and stop.
3. For each task: research (if useful), architectural decision, implementation, validation, documentation, commit, **STOP**. Never autonomously launch infinite recursive Codex sessions.
4. External system token/API approval is a BLOCKER for actual service integration; mock tests never count as live integration.
5. Runtime/CI keep older features working. Never deploy/migrate/write production without backup, explicit step permissions and verification.
6. Task owner updates DONE/PARTIAL/BLOCKED in PROGRESS, with evidence and commit. Next task only on new invocation.

## Explicit exclusions
Two vendor services are excluded from software scope; they must not appear as backlog items, license templates, pricing options or navigation. Detailed agreed functional scope totals **52** features plus 10 MYTA extensions and CRM Projects.
