# Triển khai

## 1. Chuẩn bị Supabase

1. Tạo project Supabase cho môi trường production và chạy các file trong `supabase/migrations` theo thứ tự.
2. Bật email Auth; cấu hình Site URL và redirect URLs theo domain Worker production.
3. Tạo user admin theo quy trình quản trị của nhóm và cập nhật `profiles.role = 'admin'` bằng quyền quản trị cơ sở dữ liệu.

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
