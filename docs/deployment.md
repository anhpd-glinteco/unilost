# Triển khai

## 1. Chuẩn bị Supabase

1. Tạo project Supabase cho môi trường production và chạy các file trong `supabase/migrations` theo thứ tự.
2. Bật email Auth; cấu hình Site URL và redirect URLs theo domain Worker production.
3. Tạo user admin theo quy trình quản trị của nhóm và cập nhật `profiles.role = 'admin'` bằng quyền quản trị cơ sở dữ liệu.

### Auth A1a — local và callback

- Copy `.env.example` thành `.env.local`, điền URL project test và anon key. B1e yêu cầu thêm `SUPABASE_SERVICE_ROLE_KEY` **chỉ ở server** cho API ảnh sau migration 0009; không đưa vào client hoặc biến `NEXT_PUBLIC_*`. Hai biến `NEXT_PUBLIC_*` phải có lúc build để client bundle nhận đúng cấu hình, đồng thời có ở môi trường server/Worker. Khởi động lại dev server sau khi đổi env.
- Local mặc định: `http://localhost:5173`. Thêm callback `http://localhost:5173/auth/callback` vào Auth → URL Configuration; cho phép các query `next` ứng dụng sử dụng theo [hướng dẫn redirect của Supabase](https://supabase.com/docs/guides/auth/redirect-urls). Với origin local khác production, có thể dùng mẫu giới hạn `http://localhost:5173/auth/callback**`; production dùng domain HTTPS thực và đường dẫn callback cụ thể.
- Giữ email template dùng `{{ .ConfirmationURL }}` để Supabase xác minh link rồi trả `code` về `/auth/callback`. Đây là PKCE code exchange, không phải callback nhận `token_hash` hoặc access token trong fragment.
- Mở link bằng cùng trình duyệt/profile đã yêu cầu đăng nhập: PKCE verifier nằm trong cookie. Trình duyệt khác, link hết hạn hoặc đã dùng phải yêu cầu link mới. Việc tạo tài khoản email mới vẫn theo cấu hình Supabase `signInWithOtp` mặc định; UI đăng ký/profile thuộc A1b.
- Kiểm tra phiên/đăng xuất tại `/auth/login`. Server chỉ nhận user từ `getUser()` của Supabase; các header ChatGPT không cấp quyền nghiệp vụ. Logout thu hồi phiên hiện tại (`scope: local`). Header tài khoản và guard các trang nghiệp vụ sẽ nối ở A1b.
- `proxy.ts` refresh token trước khi render và trả cookie mới; callback và phản hồi có phiên không được cache công khai. Browser và server dùng cùng cookie; cookie có `Secure` trong production. Tham khảo [hướng dẫn SSR chính thức](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## 2. Cấu hình Cloudflare Workers

1. Kết nối repository với Cloudflare Workers (Workers Builds) và chọn nhánh production.
2. Dùng Node.js `>=22.13.0`, cài dependency bằng `npm ci`, build bằng `npm run build`.
3. Khai báo `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong Worker Settings → Variables and Secrets. Chỉ lưu `SUPABASE_SERVICE_ROLE_KEY` dưới dạng secret nếu mã server-side thật sự cần; không đưa service-role key vào biến `NEXT_PUBLIC_*` hoặc bundle phía trình duyệt.
4. Nếu cần deploy thủ công sau khi build, dùng cấu hình Worker do Cloudflare Vite plugin sinh ra: `npx wrangler deploy --config dist/server/wrangler.json`. Kiểm tra file cấu hình được sinh sau `npm run build` trước lần deploy đầu tiên; không commit secrets vào repo.

## 3. Kiểm tra sau deploy

1. Xác nhận Worker đã nhận đủ biến môi trường production và domain production đã được thêm vào Supabase Auth redirect URLs.
2. Chạy smoke flow bằng tài khoản demo: đăng nhập → đăng tin → tìm/gợi ý → gửi claim → xác nhận hoàn trả.
3. Kiểm tra quyền RLS của người lạ, chủ tin và admin; kiểm tra ảnh Storage và responsive trước khi chia sẻ URL.
4. Tuần 8 cần thử build/deploy trong giới hạn gói Cloudflare Workers đang dùng; nếu cấu hình sinh ra khác, cập nhật lại lệnh deploy theo output thực tế.
