# B1e — một ảnh mỗi tin

Backend cho #14; chưa nối form/chỉnh sửa/hiển thị ảnh trong UI #13/#16. Không có gallery, crop hoặc nén ảnh.

## HTTP

`/api/posts/{postId}/image` dùng cookie phiên Supabase hiện tại, không nhận owner hoặc Storage path từ client.

- `PUT`: body là bytes tệp (không phải multipart), `Content-Type` chính xác `image/jpeg`, `image/png` hoặc `image/webp`. Tối đa 5 MiB; kiểm tra kích thước thực cả khi thiếu/sai Content-Length, MIME và magic bytes. Tên gốc không được sử dụng. JPEG/PNG được kiểm tra chữ ký; WebP kiểm tra RIFF/WEBP, chunk type và RIFF length. Đây không phải bộ giải mã hoặc quét malware; tệp lỗi ở phần nội dung vẫn có thể qua chữ ký.
- `DELETE`: không cần body. Xóa khi chưa có ảnh là no-op, không đổi moderation/thời gian.
- Hai thao tác ghi yêu cầu `Origin` trùng origin request; chỉ chính chủ có hồ sơ, tin chưa xóa, searching/matched. Admin chỉ được sửa tin mình sở hữu. Mọi lần kiểm tra điều kiện được lặp lại khi RPC đã khóa hàng tin. Thêm/thay/xóa ảnh thật đưa published về pending, giữ pending/hidden; không đổi claim/history.
- `GET`: ảnh của tin published cho khách; pending/hidden cho chủ tin/admin; tin xóa luôn 404. Kiểm tra quyền trước và sau download. Trả bytes trực tiếp, không redirect, không signed/public URL, `Cache-Control: private, no-store`, `nosniff`, `Cross-Origin-Resource-Policy: same-origin`.
- Ghi xác nhận trả `200 { confirmed: true, cleanupPending: boolean }`. Lỗi trả `{ confirmed: false, error: string }`: 400 ID sai, 401 chưa đăng nhập, 403 không có quyền/Origin sai, 415 tệp không hợp lệ, 503 thiếu cấu hình/DB/Storage/kết quả chưa xác nhận hoặc xung đột. Sau 503 tải lại tin trước khi người dùng chủ động thử tiếp; không tự retry mutation. GET dùng 404 khi không thấy ảnh và 415 với ảnh cũ không hợp lệ.

## Ranh giới quyền và cạnh tranh

Migration `0009` thêm unique post_id/path, chuyển bucket private, giới hạn MIME/5 MiB, thay policy đọc metadata theo tin. Giữ các policy restrictive khóa ghi Storage A2; thêm restrictive SELECT để client không download/list hoặc tự tạo signed URL. Không ảnh hưởng bucket khác. Migration dừng nếu ảnh cũ trùng tin/path, không tự chọn/xóa dữ liệu.

`set_post_image(p_actor_id uuid, p_post_id uuid, p_expected_path text, p_new_path text)` chỉ cấp EXECUTE cho service_role. API lấy actor từ `getUser()`/hồ sơ thật trước khi dùng module `server-only` với `SUPABASE_SERVICE_ROLE_KEY`; không có service key trong client. RPC kiểm tra lại actor/chủ tin/trạng thái, khóa cùng hàng posts với update/close/accept, kiểm tra expected path (compare-and-set), object tồn tại và đường dẫn `{actor}/{post}/{randomUUID}.{ext}`. Không cho client gọi RPC để vượt validation tệp hoặc gắn lại path đang cleanup.

Upload tên mới với upsert=false → RPC thay metadata nguyên tử cùng moderation → dọn ảnh cũ. Conflict không tự retry. Mất phản hồi RPC: chỉ readback, không báo thành công; dọn tệp mới nếu xác nhận không được liên kết, dọn ảnh cũ nếu xác nhận đã thay. Readback lỗi giữ cả hai và ghi mã sự kiện cùng UUID/path do server tạo, không ghi token/nội dung tệp.

Storage và PostgreSQL không cùng transaction. Log `B1e image cleanup pending`, `B1e image readback pending`, `B1e image upload uncertain` là các mục cần đối soát: bằng quyền server đọc lại metadata của đúng post, xác nhận path không còn được liên kết, rồi xóa qua Storage API và download/list readback. Không xóa trực tiếp hàng storage.objects. Upload timeout có thể hoàn tất muộn ngay cả sau một lần remove thành công; phải kiểm tra lại path. Không có background cleanup tự động trong B1e.

## Kiểm thử và áp dụng

- Cấu hình secret server ngoài Git theo [deployment](../../docs/deployment.md), không dùng key test cho production. Thiếu key API ảnh fail-closed 503; chức năng tin không ảnh giữ nguyên.
- Trước migration: kiểm tra toàn bộ post_images và objects của bucket, trùng post/path, liên kết bị thiếu, object không có metadata, MIME/kích thước cũ và signed URL đã phát hành. Không tự chuyển đổi dữ liệu không tương thích; dừng và bàn giao nếu gặp. Private bucket làm URL public cũ mất quyền truy cập; không thu hồi được bytes đã tải hoặc mọi signed URL cũ. Project test B1e không có object cũ.
- Chạy migration bằng rollback trước; xác nhận bucket/RPC/dữ liệu như cũ, rồi áp dụng nguyên migration một lần. Không tự tạo lịch sử CLI khi áp dụng bằng SQL Editor.
- SQL: `supabase/tests/b1e_images.sql` cùng sáu suite trước; unit `tests/unit/post-image.test.ts`. Script REST A2–B1c đổi fixture sang PNG hợp lệ để vẫn kiểm tra denial quyền thay vì lỗi MIME mới.
- HTTP/hosted: khởi chạy app local với cùng project test và secret server; chạy `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-post-images.mjs` với `B1E_TEST_APP_ORIGIN=http://localhost:5191`. Runner chỉ chấp nhận loopback và bộ biến SUPABASE_TEST_* rõ ràng, tạo/dọn tài khoản/ảnh/tin giả rồi kiểm tra readback. Đây là API local + Supabase test, không phải UI/production/PKCE/load proof.
