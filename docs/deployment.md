# Triển khai

1. Tạo project Supabase và chạy các file trong `supabase/migrations` theo thứ tự.
2. Cấu hình `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và server-only service key trong môi trường Vercel.
3. Bật email Auth; tạo ít nhất một user admin và cập nhật `profiles.role = 'admin'`.
4. Import repo vào Vercel, chọn framework Next.js và chạy `npm run build`.
5. Kiểm tra smoke flow bằng tài khoản demo trước khi chia sẻ URL.
