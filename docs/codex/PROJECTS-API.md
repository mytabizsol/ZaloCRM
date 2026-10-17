# CRM Projects API (STEP-01)

Tất cả endpoint yêu cầu JWT và luôn bị giới hạn bởi `request.user.orgId`. Thời điểm nhận/gửi là ISO-8601 UTC; giao diện sẽ hiển thị theo múi giờ tổ chức ở STEP-02.

| Endpoint | Quyền |
| --- | --- |
| `GET/POST /api/v1/projects`, `GET /api/v1/projects/stats` | Đọc dự án mình sở hữu/tham gia; tạo dự án mới trong tổ chức |
| `GET/PATCH/DELETE /api/v1/projects/:id` | Đọc theo membership; sửa: owner/admin/manager; lưu trữ: owner/admin |
| `GET/POST /api/v1/projects/:id/tasks`, `PATCH/DELETE .../tasks/:taskId` | Tạo: owner/admin/manager/member; thành viên chỉ sửa task giao cho mình; xóa: owner/admin/manager |
| `GET/POST/PATCH/DELETE /api/v1/projects/:id/milestones` | Đọc theo membership; ghi: owner/admin/manager |
| `GET/POST/DELETE /api/v1/projects/:id/members` | Đọc theo membership; ghi: owner/admin/manager; manager không thể cấp/gỡ manager |
| `GET /api/v1/projects/:id/activity` | Đọc theo membership |

Project trạng thái: `planned`, `active`, `on_hold`, `completed`, `cancelled`. Task: `todo`, `in_progress`, `review`, `blocked`, `done`. Membership: `manager`, `member`, `viewer`. Danh sách phân trang với `page` và `limit` (tối đa 100); Projects hỗ trợ `search`, `status`, `ownerUserId`, `clientContactId`.

## Triển khai migration an toàn

Migration `20261017000100_add_projects_domain` chỉ tạo bảng/index/FK mới; không sửa hoặc xóa dữ liệu hiện có. Trước khi bất kỳ operator nào chạy `prisma migrate deploy`, phải:

1. Tạo bản backup PostgreSQL có timestamp bằng `pg_dump` với database CRM (không phải Odoo), lưu ngoài container.
2. Xác minh backup bằng `pg_restore --list` hoặc restore vào database tạm được phê duyệt; ghi timestamp, SHA-256 và kết quả vào nhật ký triển khai.
3. Chạy `prisma migrate status`, sau đó mới chạy `prisma migrate deploy` trong phiên operator được cấp quyền.
4. Kiểm tra `GET /health` và một truy vấn chỉ đọc trên bốn bảng mới. Rollback ứng dụng là dừng sử dụng route; rollback schema cần migration được phê duyệt riêng, không xóa bảng chứa dữ liệu.

Worker STEP-01 không tạo backup hoặc chạy migration trên DB đang dùng. Trạng thái backup/migration vì vậy là **CHỜ supervisor xác minh**.
