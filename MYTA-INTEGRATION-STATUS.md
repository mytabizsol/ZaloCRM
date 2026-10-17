# MYTA ZaloCRM — Tích hợp module (17/10/2026)

## Môi trường
- Máy: Marketing01
- Source đang chạy: `D:\Apps\ZaloCRM`
- Nhánh: `feature/upstream-v34-integration`
- URL trên máy: `http://localhost:3080`
- PostgreSQL Docker volume độc lập, backup container riêng.
- Backup trước tích hợp: `D:\Apps\ZaloCRM-backups\pre-upgrade-20261017.dump`
- Source tham khảo (không copy hàng loạt): `D:\Apps\ZaloCRM-upstream-reference`, `locphamnguyen/ZaloCRM` AGPL-3.0.

## Đã triển khai
1. Lead Scoring: endpoint `GET /api/v1/leads/insights` và trang `/lead-scoring`; điểm giải thích được, đọc dữ liệu.
2. Chat: mẫu trả lời nhanh quản lý theo tổ chức, điền biến `{{name}}`/`{{agent}}`, không tự gửi. `GET/PUT /api/v1/chat/quick-replies`.
3. Chat: phát video/audio trong hội thoại khi URL hợp lệ; ảnh/file nền tảng giữ nguyên.
4. Automation: quản lý rule `/automation`, chạy thử, chạy thủ công (owner/admin), scheduler 08:15 VN, ghi ActivityLog `automation.followup`, chống trùng 7 ngày, tối đa 50 khách/rule/lần. Không tự gửi Zalo.
5. Duplicate Review: `/duplicate-review`, phát hiện hồ sơ cùng phone/email/Zalo UID, không tự gộp.
6. Audit: `/audit`, Owner/Admin; nhật ký có lọc hành động.
7. Docker: thêm `.dockerignore` để loại `node_modules`, `.env` khỏi context.

## Kiểm tra đã thực hiện
- `docker compose build app`: TypeScript, Vue và image đều build thành công.
- `curl http://localhost:3080/health`: HTTP 200, DB connected.
- Các route SPA mới: HTTP 200; API mới khi chưa đăng nhập: HTTP 401.
- Container `zalo-crm-app`, `zalo-crm-db`, `zalo-crm-backup` chạy; Odoo không bị thay đổi.

## Chưa coi là hoàn chỉnh
- Chưa QA đăng nhập/CRUD bằng tài khoản thật và dữ liệu mẫu; chưa kết nối tài khoản Zalo; logs hiện báo 0 tài khoản.
- Chat upload/forward media, reaction/sticker hai chiều, sync lịch sử Zalo sâu, Telegram 2 chiều, AI Assistant thực, PWA/mobile push, RBAC chi tiết, workflow đa hành động vẫn chưa hoàn tất.
- CRM duplicate mới rà soát, chưa merge; tránh xóa/gộp mất dữ liệu.
- Automation mới tạo cờ chăm sóc nội bộ, chưa hỗ trợ gửi tin tự động hay tích hợp ngoài.

## Nguyên tắc kỹ thuật
- Không dùng `prisma db push --accept-data-loss` hay thay schema upstream v3.4 hàng loạt.
- Không commit file `.env`, mật khẩu hoặc session Zalo.
- Các tính năng lấy cảm hứng từ ZCRM v3.4 được triển khai lại độc lập, không sao chép file AGPL vào repo MIT.
- Trước nâng cấp lớn, sao lưu database và kiểm tra license của nguồn tham khảo.
- Giữ nhánh main chưa thay đổi; merge chỉ sau QA.

## Gợi ý tiếp tục
1. Kiểm thử đăng nhập, workflow, quyền Owner/Admin/Member bằng môi trường staging.
2. Chat media upload/download với storage riêng; kiểm thử URL CDN Zalo hết hạn.
3. AI draft opt-in theo nhà cung cấp, tránh gửi dữ liệu khách không có căn cứ pháp lý.
4. Telegram Bridge 2 chiều khi có bot token, mapping hội thoại và quy tắc quyền riêng tư.
5. Audit security, API hardening, rate limit theo tài khoản, hàng đợi xử lý, test suite.
