# Posts feature

Đặt các UI component, query, action và validation riêng cho tin `lost`/`found` tại đây.

Quy ước:

- `components/`: UI theo nghiệp vụ bài đăng.
- `actions.ts`: mutation phía server, kiểm tra Auth/RLS trước khi ghi.
- `queries.ts`: đọc danh sách, chi tiết và filter.
- `schemas.ts`: schema Zod của feature.

## B1a — tạo tin lost

`createLostPost(previous, FormData)` dùng cùng `CreatePostState` và validation nội dung/ngày với `createFoundPost`. Mỗi action cố định loại tin phía server, lấy chủ tin từ phiên đã xác minh và chỉ ghi các trường nội dung cho phép. Không tự retry khi chưa xác nhận được kết quả ghi.

Migration `0007_b1a_create_lost_posts.sql` mở INSERT cho lost/found chính chủ với trạng thái searching/pending, chưa xóa; không mở UPDATE hoặc quyền Storage/claim. Áp dụng migration trước khi nối UI lost. UI B1b hỗ trợ cả lost/found; sửa/đóng tin tiếp tục ở #49.

## B1c — sửa và đóng tin (backend)

- `updatePost(previous, FormData)` nhận `postId` và sáu trường `title/category/color/description/location/occurredAt`; `closePost` chỉ nhận `postId`. Dùng `PostMutationState` trả `error/postId/status/moderation`. UI B1d bên dưới gọi hai action này.
- Migration `0008_b1c_edit_close_posts.sql` thêm `update_post(uuid,jsonb)` và `close_post(uuid)`, chỉ EXECUTE cho authenticated; giữ khóa UPDATE bảng/cột trực tiếp. RPC xác thực chủ tin kể cả admin, profile tồn tại, tin chưa xóa; khóa cùng hàng posts với accept/create claim.
- Chỉ sửa/đóng searching hoặc matched. Sửa không đổi type/owner/status; published về pending, hidden/pending giữ nguyên. JSON phải có đúng sáu trường chuỗi, trim và độ dài UTF-16/ngày lịch hợp lệ tương đương schema TypeScript. Đóng giữ kiểm duyệt/claim, ghi history nguyên tử; đóng lại trả ID mà không đổi timestamp/history. Không mở lại, không xử lý verifying/returned.
- Action whitelist input và lấy danh tính từ Supabase Auth. Sau RPC đọc lại `id,status,moderation` chính chủ; mất phản hồi không tự retry và trả lỗi chưa xác nhận dù đọc được trạng thái hiện tại. Readback không trả nội dung đầy đủ: UI tương lai cần tải lại tin trước khi sửa tiếp.

### Kiểm chứng và áp dụng

- Local: chạy `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. SQL `supabase/tests/b1c_posts.sql` chạy sau migration trên DB test trong transaction rollback; có ma trận lost/found × published/pending/hidden × trạng thái, kiểm tra JSON/Unicode, lịch sử đóng lặp và fault-injection rollback. Thứ tự accept/edit/close local là tuần tự, không phải bằng chứng tranh chấp đồng thời.
- Hosted: trước khi áp dụng, xác nhận đúng project test, lưu/preflight grants và function hiện tại; chạy migration với `commit` thay bằng `rollback` rồi kiểm tra RPC chưa tồn tại và dữ liệu không đổi. Sau đó áp dụng nguyên migration một lần, chạy sáu SQL suite và `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-permissions.mjs`. Runner mở rộng có actor/state matrix, strict JSON và sáu cặp request accept-vs-edit/close đồng thời; cleanup/readback được tái sử dụng.
- Ngày 21/10/2026 đã truy cập lại SQL Editor đúng `unilost-a2-test` (`lsaukzzmwbsztnlcrdpk`): hai RPC chưa tồn tại, UPDATE bảng/cột vẫn khóa. Migration 0008 chạy rollback thành công, readback RPC vẫn chưa tồn tại và số hàng không đổi; sau đó áp dụng nguyên migration một lần. Không chạy lại 0008 hoặc giả lập migration history CLI.
- Sáu SQL suite hosted PASS, gồm B1c history fault-injection rollback và đóng lặp. RPC có `SECURITY DEFINER`, search_path rỗng, anon không EXECUTE và authenticated được EXECUTE; UPDATE trực tiếp vẫn khóa. Kết quả REST và cleanup xem checkpoint B1c trong `docs/progress.md`; bằng chứng tại `D:/Codex/outputs/unilost/b1c/hosted/`. #49 tiếp tục OPEN cho UI và smoke browser; đây là project test, không phải production.

## B1d — UI sửa và đóng tin

- Trang chi tiết xác minh chính chủ có hồ sơ bằng `canManagePost`: truy vấn theo phiên/RLS và `owner_id`, chỉ chọn `id`. Không thêm owner ID vào payload chi tiết công khai; admin không được quản lý tin của người khác. Không xác minh được quyền thì ẩn UI.
- `PostManagement` cho sửa/đóng lost/found ở searching/matched; verifying/returned/closed chỉ có thông báo không còn thao tác. Form điền sẵn sáu trường, giữ cả danh mục cũ, khóa loại tin; hủy sửa reset bản nháp và trả focus. Schema dùng chung với backend. Tin published sửa thành pending; pending/hidden giữ kiểm duyệt theo RPC.
- Đóng cần xác nhận bằng AlertDialog, nêu rõ chưa hỗ trợ mở lại và giữ nguyên claim. Khi gửi, khóa thao tác và chặn lặp bằng ref. Thành công refresh dữ liệu server và hiện thông báo; cần tải lại trang trước thao tác kế tiếp.
- Khi action lỗi hoặc mất phản hồi: giữ bản nháp, không báo thành công dù DB có thể đã ghi; khóa gửi tiếp cho đến khi tải lại toàn tin. Validation client chưa gửi request thì cho chỉnh input ngay. Không thêm auto-retry, cache, migration, dependency, quyền claim/Storage hoặc route mới.
- Browser local dev + Supabase test đã kiểm tra owner/guest/stranger/admin-outsider; lost published, found hidden/matched và found pending; hủy sửa/đóng, bàn phím/focus, gửi lặp, trạng thái terminal, hết phiên, accept claim từ phiên API khác và cắt phản hồi sau khi action đã ghi. Đây là fixture/password và local dev, không phải email PKCE mới, Worker production, browser đồng thời hoặc kiểm thử tải. Log/ảnh và harness tại `D:/Codex/outputs/unilost/b1d/` và `D:/Codex/work/unilost/b1d/browser.mjs`.
