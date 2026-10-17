# MYTA CRM UX / IA & brand system
## North-star
Product name throughout user-facing UX: **MYTA CRM**. Company attribution: MYTA Business Solutions. All user-facing copy Vietnamese; familiar language of sales/marketing teams. Project is a CRM/SaaS product, **not** the WordPress MYTA V2 website.
- Exact official MYTA brand files: `frontend/public/brand/myta-logo.png` and `frontend/public/brand/myta-favicon.png`, copied **unaltered** from MYTA theme workspace. Never approximate/recreate/redraw logo or change colors inside graphic.
- Start with logo's actual palette. The existing MYTA V2 website skill states red `#EE001C`, orange `#F66F22`, gold `#FDD528`, brown `#B76027`; those colors are from original MYTA logo. Dark navy `#0B1F3A` and blue `#2563EB` may be used as neutral product UI navigation/actions only when approved in local design tokens; they must **not replace/alter brand-mark colors**. Verify candidate logos before deriving tokens.
- Set document title `MYTA CRM — Nền tảng quản lý khách hàng đa kênh`, favicon, login/landing logo, sidebar brand. Zalo is a **channel provider**, not the app name. No false "online" status for services unconnected.

## Proposed top-level navigation (7 groups, no flat 15-item list)
1. **Tổng quan** — dashboard, notifications, my tasks.
2. **Khách hàng & Bán hàng** — leads/contacts, scoring, duplicates, appointments, orders, product catalog (later).
3. **Hội thoại & Kênh** — unified inbox, Website Chat, channel connections, Zalo group scan (future and ACL-scoped).
4. **Marketing & Tự động hóa** — social planner, campaigns, chatbot/flow builder, automation rules, landing/forms.
5. **Dự án** — project overview, list, Kanban, tasks, milestones, teams, project activity.
6. **Phân tích & Báo cáo** — CRM, marketing, projects, activity reports.
7. **Cài đặt** — personal/company/team/RBAC/integrations/API/chat widget templates/brand/security/audit/notifications/limits.
Navigation uses nested collapsible groups, active group highlighting, icons only with labels for accessibility, persistent route links, breadcrumb for nested screens. Sidebar rail desktop; temporary drawer mobile. Never add duplicate menu items for old routes.

## Settings Information Architecture
- /settings/personal: tài khoản, mật khẩu, timezone, giao diện, thông báo cá nhân.
- /settings/organization: công ty, tên, logo được phép cập nhật với role Owner/Admin, vùng giờ, dữ liệu liên hệ.
- /settings/team: nhân viên, đội nhóm, phân quyền. Existing `SettingsView.vue` tabs must remain reachable.
- /settings/connections: Zalo cá nhân, Zalo OA, Facebook/Instagram, WhatsApp, TikTok, WordPress and email. Show provider status separately: unconfigured / configured / authorized / expired / unavailable.
- /settings/automation: giờ hoạt động, gửi tin theo chính sách, chatbot templates, SLA, approvals.
- /settings/website: chat widget, form and allowed website domains.
- /settings/security: audit log, API keys/webhooks, session, backups, retention; role protected.
- /settings/branding: MYTA CRM look, not misleading switch to other brand.
- /settings/billing: disabled + "Sắp ra mắt" until commercial plan implementation is real.
Include title, short explanatory text, understandable icon, CTA. Group admin-only links server and client side. Existing route aliases preserved with explicit redirect.

## Frontend acceptance checklist
- Every page: header title, one primary CTA, breadcrumbs/context links where relevant, concise stateful contents.
- List/detail: filtering/search/sort/pagination, empty/loading/errors, keyboard accessible actions, human-readable timestamps local time.
- Forms: labels, format hints, inline validation, destructive confirmations, success notifications, no double submit; secrets hidden after saving.
- Projects: separate `/projects` route and clear project stages distinct from sales stages, contact-linked project summary and task board.
- Responsive check minimum viewport widths: 360, 390, 768, 1280; no clipped table, nav, overflow, hidden submit buttons.
- Minimum touch targets 40x40 px, focus states, contrast WCAG AA, logical tab order, accessible tables/dialog.
- No fake dashboard KPIs, logos, testimonials, case studies, external connections or AI claims.
- Screenshots before/after from browser when available; if no browser, report that explicitly and do not mark visually approved.
- Avoid installing full unrelated React/Next/n8n/ERP stacks simply to replicate selected functions.

## Design output required from agent
1. A diagram/navigation tree showing destination of all old pages.
2. Brand asset provenance/path, main color/token spec, Vue component layout.
3. Desktop and mobile review notes for key user journeys.
4. Smoke checklist and what remains unverified.
