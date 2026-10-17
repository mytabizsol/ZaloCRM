# Codex task execution log
Date: 2026-10-17. Repo: MYTA CRM. Branch: `feature/upstream-v34-integration`.

No implementation step marked DONE yet. The root AGENTS.md, sequential task list, MYTA brand and source research policy are initial scaffolding. **Next task: STEP-00.**
For each Codex run append:
- Task ID, start/end time, scope and branch.
- Research sources/licenses/decisions (if any).
- Files changed, tests actually executed (exact command/exit), UX viewport checks.
- Deploy status, secrets, data migration and rollback state.
- Any pending permissions/credentials.
- Commit SHA, final state DONE/PARTIAL/BLOCKED, **STOP**.

## STEP-00 — PARTIAL (2026-10-17, feature/upstream-v34-integration)

- **Scope:** nhận diện MYTA CRM, IA điều hướng 7 nhóm và Settings hub; không thay backend, database, migration, credential, Docker container hay triển khai.
- **Files:** `frontend/index.html`; `frontend/src/layouts/DefaultLayout.vue`; `frontend/src/router/index.ts`; `frontend/src/views/{LoginView,SettingsView,SettingsHubView,SettingsPlaceholderView,WebsiteChatView,JournalDraftView}.vue`; tài sản nguyên gốc được tham chiếu, không sửa: `frontend/public/brand/myta-logo.png` (SHA-256 `DE926668C6F5B733CF16280E26FC5E4AC77D4C65B7524B5843062C5B7B1040FE`) và `myta-favicon.png` (SHA-256 `3D89F0AD8E59A06284983C65C7B9CFDAA6E255E577D509EA84B3881333B4C21A`).
- **Before → after:** browser title/favicon, login và header/sidebar dùng MYTA CRM cùng logo chính thức; bỏ chỉ báo “ONLINE” không có cơ sở. Sidebar phẳng chuyển thành cây: Tổng quan → Bảng điều khiển; Khách hàng & Bán hàng → Khách hàng/Lead Scoring/Khách trùng/Lịch hẹn/Đơn hàng; Hội thoại & Kênh → Hộp thư/Kết nối/Tài khoản Zalo/Quét nhóm/Website Chat; Marketing & Tự động hóa → Lịch đăng bài/Tự động hóa và mục sắp ra mắt; Dự án → các mục sắp ra mắt; Phân tích & Báo cáo → Báo cáo; Cài đặt → hub/Tổ chức/Nhân sự/API/Bảo mật. Dự án và các chức năng chưa làm chỉ disabled “Sắp ra mắt”, không có route giả.
- **Routes / compatibility:** `/settings` là hub; các tab cũ vẫn hoạt động qua `/settings/users`, `/settings/team` (alias `/settings/teams`) và `/settings/organization` (alias `/settings/org`). Các link ngữ cảnh `/settings/connections`, `/settings/api`, `/settings/website`, `/settings/automation`, `/settings/security` redirect lần lượt đến màn hình hiện có `/channels`, `/api-settings`, `/website-chat`, `/automation`, `/audit`; các URL cũ được giữ. `/settings/personal`, `/settings/appearance`, `/settings/billing` là trang thông báo trung thực, không lưu dữ liệu.
- **Build:** `npm run build` (exit 1: executable `vue-tsc` không có trong `.bin`); gọi trực tiếp `node node_modules/vue-tsc/bin/vue-tsc.js -b` (exit 1: lỗi nền sẵn có về declaration Vuetify tại `plugins/vuetify.ts` và implicit any trong `SetupView.vue`; lỗi type menu mới đã được sửa); `node node_modules/vite/bin/vite.js build` (exit 1: sandbox `spawn EPERM` khi nạp Vite config); `docker compose build app` (exit 1: Buildx bị từ chối quyền tại `C:\Users\PC\.docker\buildx\.lock`).
- **Tests / QA:** `git diff --check` pass; kiểm kê route giữ đủ các đích cũ và bảy nhóm điều hướng pass; quét nhãn cũ `ZaloCRM`/`Zalo CRM`, `ONLINE`, `Liquid Silicon` trong frontend pass (không còn kết quả). Không có browser/tab sẵn có, do đó smoke 360/390/768/1280, kiểm tra focus/keyboard và render authenticated route: **NOT TESTED**.
- **Blockers:** build bị môi trường chặn như trên. Không sửa các lỗi nền ngoài STEP-00, không cài dependency. `git -c safe.directory=D:/Apps/ZaloCRM add …` và commit bị chặn vì không tạo được `.git/index.lock` (Permission denied); commit SHA: **CHƯA CÓ**. File chưa theo dõi `docs/codex/STEP-00-PROMPT.txt` được giữ nguyên và không đưa vào staging.
- **Deploy:** không deploy/push; không thay đổi data, secret hay container. **Next step:** chỉ thực hiện lại build/smoke và commit STEP-00 sau khi quyền Node/Docker/Git được sửa hoặc một invocation mới quyết định cách xử lý; không bắt đầu STEP-01.

### External verification after Codex stopped — 17/10/2026
- Marketing01 administrator session completed `docker compose build app` successfully (backend TypeScript + Vue/Vite + Docker image, exit 0) despite sandbox errors.
- Successfully deployed updated MYTA CRM image to app container using `docker compose up -d --no-build app`, without changing database/schema or Odoo.
- `GET /health`: HTTP 200, `db: connected`; `/login` serves HTML title **MYTA CRM**; logo/favicon URLs both HTTP 200.
- Independent review: security/audit Settings tile restricted to Owner/Admin at Vue level; server authorization remains authoritative; rebuilt image successfully.
- Pending before DONE: authenticated navigation/Settings journey and viewport 360/390/768/1280 visual QA; attempted headless Chrome login screenshots but no image output. Status **PARTIAL** remains until verified.
- Codex invocation ended after STEP-00; it could not commit due sandbox `.git/index.lock` denied. Admin session will commit validated modifications. Next task STEP-01 must not be started until STEP-00 acceptance gate is resolved.

### Login viewport QA note
- Headless Chrome rendered 1280x800 and 390x844 login screenshots. Original 390 capture showed content cut at viewport edge; possible Chrome headless min-width constraint, not yet verified with actual device emulation. Kept screenshots as pre-fix evidence.
- Hardened AuthLayout container width/min-width and LoginView padding for narrow screens, rebuilt successfully via Docker (exit 0). Authenticated mobile Settings/sidebar smoke still NOT TESTED; STEP-00 remains PARTIAL.

### STEP-00 — Code/build accepted for autonomous continuation (2026-10-17)
- Operator-side Docker build completed successfully, running MYTA CRM returned health 200 and DB connected, official logo and favicon HTTP 200, desktop and initial mobile screenshots captured.
- Completed branding and settings code is permitted as dependency for STEP-01 under owner's unattended development authorization.
- Full authenticated responsive/navigation E2E and possible Chrome mobile viewport anomaly are **not tested**; retain in STEP-17 regression backlog. STEP-00 therefore has code status DONE, NOT production-validated UX.
- New policy: unattended supervisor builds, commits and pushes approved feature branch after gates; never touches live production DB automatically.
