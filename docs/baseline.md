# Baseline A0 — UniLost

Ngày rà soát: 17/10/2026. Mã nguồn gốc: `ca1a170ea0cde0b005d5b0de24c2158bf0406f65` (main).

Đây là kiểm tra tĩnh mã nguồn, không phải kết quả chạy ứng dụng hay xác nhận cấu hình Supabase production. Repo không có `.codegraph/`, vì vậy dùng tìm kiếm và đọc trực tiếp.

## Ma trận yêu cầu và hiện trạng

**Một phần**: có code/UI nhưng chưa có luồng production đầy đủ. **Chưa có**: chưa tìm thấy implementation. **Chưa kiểm chứng**: cần chạy với môi trường/tài khoản thật. Các mã R dùng xuyên suốt báo cáo.

| Mã / yêu cầu | Issue | Bằng chứng trong repo | Hiện trạng | Nghiệm thu / phiên |
| --- | --- | --- | --- | --- |
| R01 — yêu cầu/use case | #6, #8, #10 | requirements.md; report/use-cases.md; diagrams/use-cases.puml | A0 có đặc tả mục tiêu; chưa phải luồng đã chạy | Soát actor/luồng/ngoại lệ; A0, A4 |
| R02 — Auth và phiên | #9, #11, #12 | app/auth; app/dashboard/actions.ts; components/auth/profile-form.tsx | A2: email/PKCE thật hộp thư 1, trigger/profile/role và lưu tên/khoa thật PASS; header desktop/mobile, logout/guard PASS. Cờ chỉ bật local project test, template/production mặc định tắt | Hộp thư 2: nhận thư/PKCE/profile role user/logout và đăng nhập lại giữ hồ sơ đạt sau sửa Gmail SMTP; HTTPS/Worker chưa kiểm chứng, chưa nghiệm thu toàn bộ A2 |
| R03 — quyền dữ liệu | #7, #36 | supabase/migrations/0002_a2_permissions.sql; supabase/tests; scripts/test-permissions.mjs | A2 đã áp dụng trên project test: SQL assertions + 77 kiểm tra actor + 113 Auth/REST/Storage PASS, fixture tự động đã dọn; role không tự nâng, tên/khoa chỉ tự sửa, ghi demo bị khóa | Quyền nền đã kiểm chứng trên project test; workflow tin/claim và điều kiện rộng hơn của #36 còn tiếp tục |
| R04 — tin/ảnh | #13–#16 | app/posts/new/page.tsx; post_images/storage trong SQL | UI demo có guard; form lưu/upload bị khóa, bỏ success giả ở A1b; seed.sql chỉ có chú thích | CRUD, file sai/lỗi, ownership; A3, B1 |
| R05 — feed/tìm/chi tiết | #17–#20 | app/posts/page.tsx; app/posts/[id]/page.tsx; components/search-shell.tsx | Mock; lọc client; ID sai trả featuredPosts[0]; chưa phân trang/query thật | 404, quyền xem, lọc/thứ tự/page; A3b, B2 |
| R06 — matching giải thích | #21–#24 | lib/matching.ts; lib/matching.test.ts | Có hàm và 2 test; chưa chạy test; chưa query ứng viên thật | Điểm, ngưỡng, tiếng Việt, loại tin returned; B3 |
| R07 — gửi/xem claim | #25–#28 | app/dashboard/claims/page.tsx; claimSchema; ClaimRequest | UI tĩnh; chưa action/query; ClaimRequest chưa có requesterId | Tạo, hủy, riêng tư, tin đủ điều kiện; A4–A8 |
| R08 — quyết định claim | #25–#28 | claim_requests enum/policies trong SQL | Chưa có giao dịch/quy tắc chuyển trạng thái; chưa unique accepted | Hai accept cạnh tranh, sai vai trò, không ghi dở; A7–A9 |
| R09 — hoàn trả/audit | #29–#32 | status_history; moderation_actions trong SQL; app/admin/page.tsx | Có bảng và UI demo; chưa mutation/audit nguyên tử | Hoàn trả đúng chủ; admin/audit; C1 |
| R10 — ổn định/a11y | #33–#35, #37 | tests/README.md; docs/test-plan.md; .github/workflows/ci.yml | Có kế hoạch/CI; chưa thấy E2E/config Playwright, node_modules chưa có | Keyboard/mobile, mạng lỗi, hồi quy; C2 |
| R11 — triển khai | #34, #39, #40 | docs/deployment.md; vite.config.ts; scripts/run-framework.mjs | Có cấu hình/hướng dẫn; chưa build/deploy/smoke | Cloudflare build, env, URL, smoke; C2/C3 |
| R12 — báo cáo/bàn giao | #38, #41 | report/README.md | A0 có khung; chưa có báo cáo cuối/ảnh giao diện thực chạy | DOCX/PDF, trích dẫn, minh chứng, hướng dẫn; C3 |

## Rủi ro cần giải quyết trước khi nối production

Các nhận định dưới đây dựa trên SQL/code hiện tại. Cần tái hiện bằng test ở DB riêng; không khẳng định DB đang triển khai có cấu hình y hệt.

| Mã | Phát hiện và tác động | Xử lý / kiểm tra |
| --- | --- | --- |
| S01 | Migration 0001 cho sửa cả role nếu grant cho phép | A2/0002 đã khóa quyền bảng/cột trên project test; SQL/REST thật chứng minh không tự đổi role/id/ngày tạo. Chưa tuyên bố production đã áp dụng. |
| S02 | Migration 0001 chưa khóa moderation/status | A2/0002 đã khóa ghi tin của client trên project test, kể cả admin ứng dụng; REST thật PASS. A3/B1 mới mở lại theo workflow. |
| S03 | Migration 0001 cho ghi claim rộng, chưa có state machine | A2/0002 đã khóa ghi claim trên project test, REST thật PASS. A5–A7 mới mở mutation theo state machine/giao dịch. |
| S04 | Chưa có unique accepted/completed hay khóa tin khi quyết định | A7: constraint + giao dịch; test hai kết nối thật. |
| S05 | Bucket ảnh public và policy đọc toàn bucket; ẩn tin không bảo vệ URL ảnh đã biết | B1/A2: quyết định ảnh công khai hay private theo yêu cầu; nếu bảo vệ ảnh tin ẩn thì private bucket/signed URL, test URL trực tiếp. |
| S06 | `postSchema` mới kiểm ngày không rỗng; form chưa gọi schema. A1a đã sửa thiếu cấu hình Auth báo gửi thành công, có test và smoke browser | Còn A3/B1: validation ngày/file tại trust boundary. |
| S07 | Chi tiết ID sai còn fallback bài đầu; A1b đã guard dashboard/admin/claim, gắn nhãn demo và khóa thao tác chưa lưu | A1/A3/A8/C1: không hiển thị dữ liệu giả như dữ liệu thật; đúng 404/redirect/quyền. |
| S08 | Matching token bằng `\W+` chưa phù hợp tiếng Việt; chỉ loại closed, chưa loại returned | B3: thêm test trước khi sửa, giữ điểm/ngưỡng đã chọn nếu không có yêu cầu đổi. |

## Checklist UI cần nối và kiểm chứng

| Màn hình | Đã thấy trong code | Chưa có/chưa kiểm chứng |
| --- | --- | --- |
| Login/Register/Header | A2: email/PKCE thật hộp thư 1; form/action tên/khoa và header mobile/desktop, guard/logout thật đạt trên project test | Hộp thư 2: PKCE/hồ sơ/logout/đăng nhập lại giữ hồ sơ đạt qua Gmail SMTP; HTTPS/Worker và nghiệm thu rộng hơn còn thiếu. |
| New post | Form demo có guard, bị vô hiệu hóa và không báo lưu thành công | Persist, validation server, upload/progress/lỗi, sửa/đóng tin. |
| Posts/Search | Cards, query/type/category client, empty | Loading/error dữ liệu thật, filter khác, sort/page, quyền xem. |
| Post detail | Mock, lý do matching | 404 thật, ảnh thật, form claim và điều kiện theo type/status. |
| Dashboard/Claims | Hồ sơ tài khoản thật; tin/proof demo có nhãn, nút accept/reject bị khóa | Dữ liệu riêng, pending/empty/error, hủy, mutation, conflict, cập nhật lại. |
| Admin | Guard theo role DB; bảng demo, nút ẩn bị khóa | Khóa role DB ở A2; pending/publish/hide/restore và audit thật. |

Kiểm tra bàn phím, label, focus, contrast và responsive là kiểm tra trình duyệt ở các phiên UI; A0 chưa xác nhận các mục này đạt.

## Đối chiếu issue và tiến độ

- Issue #6 và #8 trùng phần chốt use case: dùng [đặc tả chung](report/use-cases.md); #6 vẫn cần nghiệm thu UI, #8 cần state machine hoàn thiện ở A4.
- #7 nhận danh sách S01–S05 làm đầu vào A2/B1; #10 dùng ma trận R01–R12 và test plan hiện có. Không tạo bộ yêu cầu thứ hai mâu thuẫn tài liệu hiện tại.
- Sheet ghi tuần 2 100% nhưng chưa có bằng chứng chạy Auth/RLS đầy đủ trong repo được rà. Giữ là **chưa kiểm chứng**, không sửa Sheet.
- 36 issue mở chỉ phản ánh trạng thái tracker, không chứng minh toàn bộ code chưa làm. Năm PR #1–#5 là dependency, chưa có PR feature trong danh sách hiện tại.
- Ngày tuần 6 là 20–26/10/2026; hôm rà soát 17/10 đang trong tuần 5 theo Sheet. Cần đánh giá lại lịch sau A3.
