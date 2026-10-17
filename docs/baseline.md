# Baseline A0 — UniLost

Ngày rà soát: 17/10/2026. Mã nguồn gốc: `ca1a170ea0cde0b005d5b0de24c2158bf0406f65` (main).

Đây là kiểm tra tĩnh mã nguồn, không phải kết quả chạy ứng dụng hay xác nhận cấu hình Supabase production. Repo không có `.codegraph/`, vì vậy dùng tìm kiếm và đọc trực tiếp.

## Ma trận yêu cầu và hiện trạng

**Một phần**: có code/UI nhưng chưa có luồng production đầy đủ. **Chưa có**: chưa tìm thấy implementation. **Chưa kiểm chứng**: cần chạy với môi trường/tài khoản thật. Các mã R dùng xuyên suốt báo cáo.

| Mã / yêu cầu | Issue | Bằng chứng trong repo | Hiện trạng | Nghiệm thu / phiên |
| --- | --- | --- | --- | --- |
| R01 — yêu cầu/use case | #6, #8, #10 | requirements.md; report/use-cases.md; diagrams/use-cases.puml | A0 có đặc tả mục tiêu; chưa phải luồng đã chạy | Soát actor/luồng/ngoại lệ; A0, A4 |
| R02 — Auth và phiên | #9, #11, #12 | app/auth/login/page.tsx; register/page.tsx; lib/supabase.ts; app/chatgpt-auth.ts | Một phần; OTP client, đăng ký chưa xử lý; chưa thấy callback/guard Supabase server | Phiên, callback, logout, lỗi env; A1 |
| R03 — quyền dữ liệu | #7, #36 | supabase/migrations/0001_initial.sql | Một phần; RLS có nhưng còn rộng; DB thực tế chưa kiểm chứng | Test API với 5 vai trò, chặn nâng quyền; A2 |
| R04 — tin/ảnh | #13–#16 | app/posts/new/page.tsx; post_images/storage trong SQL | UI demo; submit chỉ setSubmitted, chưa lưu/upload; seed.sql chỉ có chú thích | CRUD, file sai/lỗi, ownership; A3, B1 |
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
| S01 | `users update self` kiểm tra id nhưng chưa hạn chế đổi `profiles.role`; có nguy cơ tự nâng admin nếu grant cho phép | A2: quyền cột/trigger hoặc cơ chế tương đương; test sửa role trực tiếp. |
| S02 | Insert/update posts chỉ ràng owner; chưa giới hạn moderation/status; chủ tin có thể tự duyệt hoặc bỏ qua workflow nếu grant cho phép | A2/A3: khóa trường hệ thống và test API trực tiếp. |
| S03 | Insert claim chỉ kiểm requester; update cho mọi bên liên quan, chưa giới hạn trường/trạng thái/actor | A5–A7: mọi ghi phải tuân state machine, không đổi post/requester/proof tùy ý sau tạo. |
| S04 | Chưa có unique accepted/completed hay khóa tin khi quyết định | A7: constraint + giao dịch; test hai kết nối thật. |
| S05 | Bucket ảnh public và policy đọc toàn bucket; ẩn tin không bảo vệ URL ảnh đã biết | B1/A2: quyết định ảnh công khai hay private theo yêu cầu; nếu bảo vệ ảnh tin ẩn thì private bucket/signed URL, test URL trực tiếp. |
| S06 | `postSchema` mới kiểm ngày không rỗng; form chưa gọi schema; UI thiếu cấu hình Auth vẫn báo đã gửi link | A1/A3/B1: thông báo lỗi thật, validation ngày/file tại trust boundary. |
| S07 | Chi tiết ID sai fallback bài đầu; dashboard/admin/claim còn tĩnh và chưa guard Supabase | A1/A3/A8/C1: không hiển thị dữ liệu giả như dữ liệu thật; đúng 404/redirect/quyền. |
| S08 | Matching token bằng `\W+` chưa phù hợp tiếng Việt; chỉ loại closed, chưa loại returned | B3: thêm test trước khi sửa, giữ điểm/ngưỡng đã chọn nếu không có yêu cầu đổi. |

## Checklist UI cần nối và kiểm chứng

| Màn hình | Đã thấy trong code | Chưa có/chưa kiểm chứng |
| --- | --- | --- |
| Login/Register/Header | Form email, thông báo sent/error login, menu mobile | Register submit, pending, session thật, logout, callback, nhận diện tài khoản/quyền. |
| New post | Form và màn hình success demo | Persist, validation server, upload/progress/lỗi, sửa/đóng tin. |
| Posts/Search | Cards, query/type/category client, empty | Loading/error dữ liệu thật, filter khác, sort/page, quyền xem. |
| Post detail | Mock, lý do matching | 404 thật, ảnh thật, form claim và điều kiện theo type/status. |
| Dashboard/Claims | Thẻ và proof giả, nút accept/reject | Dữ liệu riêng, pending/empty/error, hủy, mutation, conflict, cập nhật lại. |
| Admin | Bảng mock và nút ẩn | Guard admin, pending/publish/hide/restore, audit và lỗi quyền. |

Kiểm tra bàn phím, label, focus, contrast và responsive là kiểm tra trình duyệt ở các phiên UI; A0 chưa xác nhận các mục này đạt.

## Đối chiếu issue và tiến độ

- Issue #6 và #8 trùng phần chốt use case: dùng [đặc tả chung](report/use-cases.md); #6 vẫn cần nghiệm thu UI, #8 cần state machine hoàn thiện ở A4.
- #7 nhận danh sách S01–S05 làm đầu vào A2/B1; #10 dùng ma trận R01–R12 và test plan hiện có. Không tạo bộ yêu cầu thứ hai mâu thuẫn tài liệu hiện tại.
- Sheet ghi tuần 2 100% nhưng chưa có bằng chứng chạy Auth/RLS đầy đủ trong repo được rà. Giữ là **chưa kiểm chứng**, không sửa Sheet.
- 36 issue mở chỉ phản ánh trạng thái tracker, không chứng minh toàn bộ code chưa làm. Năm PR #1–#5 là dependency, chưa có PR feature trong danh sách hiện tại.
- Ngày tuần 6 là 20–26/10/2026; hôm rà soát 17/10 đang trong tuần 5 theo Sheet. Cần đánh giá lại lịch sau A3.
