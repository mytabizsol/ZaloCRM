# MYTA Fchat Business – Product Requirements & Gap Matrix
> Nguồn: ảnh chụp bảng giá Fchat 3 trang do chủ dự án cung cấp ngày 17/10/2026. Đây là phạm vi tham chiếu tính năng, không phải yêu cầu sao chép giao diện/nhãn hiệu/mã nguồn Fchat.

## Phạm vi
- Mục tiêu: MYTA ZaloCRM / Omnichannel Growth CRM với **đầy đủ 54 hạng mục tham chiếu** (bao gồm tính năng, hạn mức kỹ thuật và dịch vụ).
- Bảng trang 1-2 có gói STARTER, LIVECHAT, CHATBOT, BUSINESS; định hướng tính năng của MYTA là bao phủ gói BUSINESS.
- **Không đồng nhất** "Có nền tảng" với "tính năng hoàn thiện": các trạng thái dựa vào kiểm tra thư mục backend/frontend ngày 17/10/2026, vẫn cần QA từng nghiệp vụ.
- Chức năng Fchat chủ yếu hướng Facebook; MYTA mở rộng có chọn lọc Zalo OA, Zalo cá nhân, WhatsApp, TikTok, WordPress trong phạm vi quyền API hợp lệ.
- Tách biệt hạng mục Fchat bán bằng **credits/dung lượng/số nhân viên/pages** với chức năng thực thi. Chưa mặc định áp hạn mức/giá thương mại của bên thứ ba.
- Không triển khai gửi tin hàng loạt ngoài consent/giới hạn nền tảng, không dùng API không được cấp quyền hay sao chép mã nguồn/license của Fchat.

## Danh sách kiểm soát đầy đủ (54/54)
| Mã | Tính năng đúng theo ảnh chụp | Nhóm MYTA | Trạng thái tham chiếu | Ưu tiên | Tiêu chí hoàn thành |
|---|---|---|---|---|---|
| F01 | Tự động trả lời comment và inbox | Omnichannel | Chưa có | P0 | Luật tự động trên bình luận/tin nhắn Fanpage được cấp quyền, có lịch sử và opt-out |
| F02 | Tự động ẩn bình luận tránh cướp khách | Omnichannel | Chưa có | P0 | Bộ lọc theo từ khóa/định dạng SĐT, quyền ẩn và lịch sử kiểm duyệt |
| F03 | Livechat đa kênh | Omnichannel | Một phần | P0 | Một Inbox cho Facebook, Zalo OA, Website, WhatsApp; TikTok khi API được cấp quyền |
| F04 | Google Sheets | Tích hợp | Chưa có | P1 | Kết nối và ánh xạ dữ liệu lead, trạng thái đồng bộ và lỗi |
| F05 | Website Popup | Website | Chưa có | P1 | Thiết kế popup, điều kiện hiển thị, sự kiện chuyển đổi |
| F06 | User Input - hỏi thông tin | Chatbot | Một phần | P0 | Các bước thu thập tên/SĐT/email/nhu cầu trong flow, kiểm tra dữ liệu |
| F07 | Webform - form đăng ký | Website | Một phần | P0 | Form builder, trường tùy chỉnh, nhúng web, gửi lead có consent vào CRM |
| F08 | BUY - nút mua hàng ngay | Commerce | Chưa có | P1 | Nút mua từ chat/landing, tạo checkout/đơn hàng |
| F09 | CART - trang web có giỏ hàng | Commerce | Chưa có | P1 | Cart, số lượng, khuyến mãi, checkout, order sync |
| F10 | Link ref | Growth | Chưa có | P1 | Link referral có mã chiến dịch và attribution |
| F11 | QR Code | Growth | Chưa có | P1 | QR gắn nguồn lead/chiến dịch và đo chuyển đổi |
| F12 | Blocks tin nhắn | Chatbot | Chưa có | P0 | Block text/media/button/form, phiên bản và preview |
| F13 | Flows tin nhắn | Chatbot | Một phần | P0 | Visual flow designer, trigger, điều kiện, nhánh và thực thi có log |
| F14 | Keyword | Chatbot | Chưa có | P0 | Keyword/regex/priority, chống đè và chế độ thử |
| F15 | Tag, List | CRM | Một phần | P0 | Tag CRM hiện có; mở rộng list động, phân đoạn theo điều kiện |
| F16 | Sequence | Marketing | Chưa có | P0 | Chuỗi chăm sóc opt-in có delay, dừng khi phản hồi và giới hạn tần suất |
| F17 | Chiến dịch | Marketing | Một phần | P0 | Campaign builder: mục tiêu, đối tượng, lịch, nội dung, đo lường |
| F18 | Sản phẩm | Commerce | Chưa có | P1 | Danh mục SKU, giá, hình, tồn và trạng thái |
| F19 | Combo sản phẩm | Commerce | Chưa có | P1 | Bundle nhiều SKU, giá combo, định mức |
| F20 | Dung lượng lưu trữ | Platform | Một phần | P2 | File storage, hạn mức theo tổ chức và cảnh báo vượt quota |
| F21 | Dung lượng file kiến thức | AI | Chưa có | P1 | Upload tài liệu, indexing, search và hạn mức knowledge base |
| F22 | Chữ ký menu và webform | White-label | Chưa có | P2 | Cấu hình thương hiệu menu/bot/form theo tenant |
| F23 | Chữ ký Webchat Powered by | White-label | Chưa có | P2 | Cho phép bật/tắt dòng thương hiệu theo chính sách gói |
| F24 | Tải khách hàng cũ từ Fanpage | Omnichannel | Chưa có | P0 | Đồng bộ qua API Meta được phê duyệt và tránh tạo trùng |
| F25 | Gửi email | Marketing | Chưa có | P1 | Email campaigns qua provider, unsubscribe, bounce, delivery log |
| F26 | Tích hợp CRM | CRM | Có nền tảng | P0 | Contacts, Lead Scoring, Orders; bổ sung mapping cho flow/sales |
| F27 | Kết nối | Platform | Một phần | P1 | Connection catalog: OAuth, token, refresh, webhook status |
| F28 | Kho hàng | Commerce | Chưa có | P1 | Kho, tồn, giữ tồn, nhật ký nhập/xuất |
| F29 | Vận chuyển | Commerce | Chưa có | P1 | Phí ship, tracking, connector hãng vận chuyển |
| F30 | Biên lai | Commerce | Chưa có | P1 | Chứng từ đơn hàng, thanh toán và download theo quyền |
| F31 | Trigger đơn hàng | Automation | Chưa có | P1 | Workflow khi tạo/xác nhận/hủy/hoàn thành đơn hàng |
| F32 | Coupon | Promotion | Chưa có | P1 | Mã giảm giá, điều kiện, quota và kiểm tra sử dụng |
| F33 | Danh sách coupon | Promotion | Chưa có | P1 | Bộ sưu tập coupon, cấp phát, lịch sử dùng |
| F34 | Landing Page | Website | Chưa có | P1 | Landing page builder/template/SEO/form/analytics |
| F35 | Quay xổ số | Gamification | Chưa có | P2 | Đợt quay, luật tham gia, ngẫu nhiên có audit |
| F36 | Vòng quay may mắn | Gamification | Chưa có | P2 | Wheel, xác suất, mã thưởng, chống gian lận |
| F37 | Minigame | Gamification | Chưa có | P2 | Game templates, campaign tracking, quà và giới hạn |
| F38 | Thẻ VIP | Loyalty | Chưa có | P2 | Hạng khách, điều kiện nâng hạng, ưu đãi |
| F39 | Kịch bản Viral | Growth | Chưa có | P2 | Referral/campaign sharing, thưởng khi đủ điều kiện |
| F40 | Thanh toán online | Commerce | Chưa có | P1 | Cổng thanh toán chính thức, webhook, đối soát |
| F41 | Gallery (Import file, API) | Platform | Chưa có | P2 | Quản lý media gallery, upload/import API, phân quyền |
| F42 | Tích điểm khi mua hàng | Loyalty | Chưa có | P2 | Điểm theo order, hoàn/hủy, lịch sử bất biến |
| F43 | Tích điểm khi giới thiệu khách hàng mới | Loyalty | Chưa có | P2 | Điểm referral có phát hiện gian lận |
| F44 | Tạo và quản lý Phiếu Thu | Finance | Chưa có | P1 | Phiếu thu, chứng từ, đối chiếu order/payment |
| F45 | Hoa hồng Affiliate | Affiliate | Chưa có | P2 | Cấp mã giới thiệu, doanh thu, duyệt hoa hồng, payout |
| F46 | Tên miền riêng | White-label | Một phần | P2 | Subdomain/custom domain, xác minh DNS/TLS, tenant routing |
| F47 | Gửi email bằng email riêng | Marketing | Chưa có | P1 | Domain email riêng, SPF/DKIM/DMARC, SMTP/API |
| F48 | Quản lý nhiều tài khoản FB Ads | Ads | Chưa có | P2 | Meta Marketing API, portfolio, quyền từng tài khoản, báo cáo |
| F49 | Hỗ trợ, cho thuê tài khoản FB Ads | Dịch vụ | Quy trình ngoài phần mềm | P3 | Chỉ là hạng mục dịch vụ trong tài liệu, không sao chép thành API thuê tài khoản |
| F50 | Hỗ trợ tích hợp hệ thống bán hàng có sẵn | Integration | Chưa có | P1 | Connector WooCommerce/ERP/webhook/import-export |
| F51 | Đồng hành, tư vấn kịch bản, support 1-1 | Dịch vụ | Quy trình ngoài phần mềm | P3 | Helpdesk/SLA/onboarding và gói triển khai, không phải chức năng chatbot |
| F52 | API & CRM | Platform | Một phần | P1 | REST/OpenAPI, API keys/scopes, webhook, audit, tenant isolation |
| F53 | Trợ lý AI | AI | Chưa có | P1 | AI co-pilot có phân quyền, KB/RAG, gợi ý/handoff, xác nhận khi gửi |
| F54 | Credits | Platform | Chưa có | P2 | Credit ledger, usage metering, hạn mức/hoàn trả và lịch sử |

## Lộ trình phát triển khuyến nghị
| Giai đoạn | Nhóm trọng tâm | Kết quả có thể nghiệm thu |
|---|---|---|
| GĐ0 – Foundation | Tenant isolation, RBAC, provider accounts, OAuth/refresh, consent, audit, test suite | Kiểm thử e2e, cấp quyền theo kênh, logs và tenant không rò rỉ dữ liệu |
| GĐ1 – Omnichannel / Inbox | F01,F02,F03,F24, Facebook Page/Messenger, Zalo OA, website chat; WhatsApp theo phê duyệt | Nhận/gửi có quyền, tự ẩn comment theo rule, phân công agent, lịch sử đồng bộ |
| GĐ2 – Bot / Automation | F06,F12-F17,F31,F53 cơ bản | Visual Flow Builder, keywords, conditions, sequences, dry-run và lịch sử thực thi |
| GĐ3 – Website / Lead Growth | F04,F05,F07,F10,F11,F34,F41 | Popup/Form/Landing builder, embed, UTM/ref/QR conversion, Google Sheets connector |
| GĐ4 – Commerce | F08,F09,F18,F19,F28-F33,F40,F44,F50 | Product/catalog/cart/order/payment/inventory/receipt/shipping/coupons |
| GĐ5 – Loyalty & Gamification | F35-F39,F42,F43,F45 | Loyalty wallet/VIP, referral/affiliate, wheel, lotteries và audit gian lận |
| GĐ6 – Enterprise & Platform | F20-F23,F25-F27,F46-F49,F51-F54 | Email + custom domains, storage/quota, API docs, AI KB, credits, Ads quản lý, SLA dịch vụ |

## Phụ thuộc và điều kiện không được bỏ qua
1. **Meta/Facebook:** Facebook Login/Page OAuth, webhook, quyền messaging/comments/pages/posts theo quy trình duyệt ứng dụng; tuyệt đối không tự ý thu thập dữ liệu không được cấp quyền.
2. **Zalo OA:** app OA + OAuth/Token Refresh + quyền và chính sách nhắn tin phù hợp; OA API khác Zalo cá nhân.
3. **Zalo cá nhân / quét nhóm:** SDK phi chính thức có thể gây hạn chế tài khoản; mỗi lượt quét có giới hạn, không nhập/gửi thành viên hàng loạt trái phép.
4. **WhatsApp Business:** WABA + Cloud API + số doanh nghiệp + mẫu tin nhắn được phê duyệt khi áp dụng.
5. **TikTok:** Login Kit/Content Posting API tương ứng, quyền đăng và domain media đã xác minh, trạng thái xuất bản bất đồng bộ.
6. **Website Chat & Forms:** CRM cần HTTPS public origin. Domain khách và CSP frame-ancestors phải được kiểm soát. Cần đồng ý xử lý dữ liệu và chính sách lưu giữ.
7. **Marketing email:** chỉ gửi cho liên hệ opt-in, có unsubscribe, xử lý bounce/complaint và xác minh DNS.
8. **Commerce:** thanh toán, kho, thu chi và hoàn tiền phải dùng ledger/idempotency, kiểm thử reconciliation; không tự coi là tương đương ERP.
9. **Dịch vụ tư vấn và Ads account rental:** F49/F51 là chính sách dịch vụ của nhà cung cấp; không phải tính năng nền tảng có thể cam kết "code xong".
10. **An toàn phát hành:** branch hiện tại `feature/upstream-v34-integration`; mã mới merge vào `main` sau unit/integration/e2e, staging và backup.

## Tình trạng ban đầu – đối chiếu repository
- Đã có nền tảng: PostgreSQL, tenant, User/RBAC cơ bản, Zalo chat, CRM Contacts, Lead Scoring, Orders, Audit.
- Một phần: Website Chat widget và lead form cơ bản, lịch đăng social/website, quản lý kết nối API, automation follow-up, group scanning; chưa kiểm chứng E2E đủ quyền API bên thứ ba.
- Thiếu khối lớn: Facebook comment automation, Facebook Inbox đa agent, flow builder, keyword, sequence, campaign targeting, email, catalog, inventory, cart, checkout, coupons, rewards, affiliate, minigame, popup/landing, AI KB assistant.
- Không dùng bảng Fchat để suy luận về API kỹ thuật; tài liệu chỉ minh họa tính năng và hạn mức theo gói.
- Mọi hạng mục chỉ chuyển sang **Hoàn thành** sau khi có kiểm thử chấp nhận tương ứng (API, UI, quyền, lỗi, dữ liệu thực, bảo mật và tải).

## Definition of Done cho mỗi dòng
- Có user story, thiết kế UI/mobile, API/data model, quyền RBAC, trạng thái lỗi, log/audit, rate limits khi cần.
- Có unit/integration test và ít nhất một kịch bản e2e staging đúng nghiệp vụ.
- Có tài liệu cấu hình và điều kiện của provider; nếu cần credentials/phê duyệt phải ghi **Chờ quyền API**, không báo "đã tích hợp đầy đủ".
- Có hướng dẫn sử dụng tiếng Việt, giới hạn/dung lượng phù hợp cấu hình MYTA, backup/rollback.

## MYTA mở rộng ngoài 54 hạng mục Fchat
Các phần dưới đây là **yêu cầu bổ sung từ những lượt phát triển ZaloCRM trước**, không được tính lẫn vào 54 dòng của ảnh chụp:
| Mã | Module mở rộng | Mục tiêu nghiệm thu | Trạng thái |
|---|---|---|---|
| M01 | Quét nhóm Zalo cá nhân | Liệt kê nhóm của tài khoản có quyền, xem trước thành viên được phép xem, rate-limit | Một phần; cần QA tài khoản thật |
| M02 | Zalo OA Inbox + Article | OAuth OA, webhook, gửi tin phù hợp chính sách, đăng bài, làm mới token, xác nhận kết quả | Một phần |
| M03 | Facebook/Messenger Inbox | Page OAuth, comment/DM, tag/assign, rule auto-hide/reply, kiểm tra entitlement | Chưa hoàn chỉnh |
| M04 | WhatsApp Business | Cloud API inbound/outbound, templates opt-in, status tracking | Chưa tích hợp |
| M05 | TikTok | Account OAuth, đăng ảnh/video phù hợp quyền và tracking kết quả | Một phần: ảnh và queue |
| M06 | Social Post Scheduler | Lịch 4 kênh OA/Page/TikTok/WordPress, approval, retry-safe, calendar, asset library | Một phần: scheduler/API cơ bản |
| M07 | Website Live Chat | Public HTTPS embed, form builder, inbox hai chiều, assign/SLA/CSAT, anti-spam | Một phần: widget/form cơ bản |
| M08 | Lead Intelligence | Explainable scoring, lifecycle, duplicate review, segments | Một phần |
| M09 | AI Sales/Support | AI draft, RAG KB, human approval, citations, agent analytics | Chưa có |
| M10 | Business SaaS | Tenant provisioning, pricing plan, Stripe/VN gateways, subscription & credits | Chưa có |

### Phạm vi vận hành đề nghị
- Lấy **đầy đủ chức năng ứng dụng** làm mục tiêu sản phẩm trước; không bắt chước giá, thương hiệu hay dịch vụ tư vấn/cho thuê tài khoản của Fchat.
- Nghiệm thu theo chức năng và quyền provider thật; demo/mock hoặc giao diện chưa tính là hoàn thành.
- Phát triển trên nhánh tính năng, giữ database backup; mỗi giai đoạn cần checklist an toàn, bảo vệ thông tin khách hàng và khả năng rollback.
