# Test plan

- Unit: validation, query filter, matching score và chuyển trạng thái.
- Component: form đăng tin, thẻ tin, bộ lọc và claim action; kiểm tra empty/error/success.
- Integration/RLS: anonymous, owner, unrelated user và admin; proof của claim không bị lộ.
- E2E: đăng nhập, tạo tin, tìm kiếm, gửi claim, chấp nhận/từ chối, hoàn trả và moderation.
- Security: file sai MIME/quá dung lượng, truy cập trái phép, duplicate claim và input không hợp lệ.
- Accessibility: keyboard navigation, label, focus, contrast và viewport mobile/desktop.

## Kiểm tra Auth A1a

- `npm run test`: thiếu cấu hình không báo đã gửi; email sai/provider/mạng lỗi; return URL ngoài site, backslash, control character, encoded path và vòng lặp Auth; callback thiếu/sai code; logout lỗi/thành công; không tin cookie user giả hoặc header ChatGPT.
- Adapter cookie/proxy: cookie refresh đến cả request render và response trình duyệt, không cache phiên, client server mới mỗi request; không nuốt lỗi ghi cookie trong callback/logout.
- `tests/unit/auth-cookies.test.ts` dùng SDK Supabase thật, cookie jar giả lập và phản hồi HTTP Auth mô phỏng để kiểm tra PKCE → session request kế tiếp → logout, token bị từ chối và refresh token hết hạn. Đây không phải nghiệm thu provider thật.
- Smoke local: thiếu env → form báo lỗi và vẫn cho thử lại; callback → lỗi cấu hình. Có project test: gửi email thật → mở cùng trình duyệt → thấy tài khoản ở `/auth/login` → reload vẫn đăng nhập → đăng xuất → reload không còn phiên; link đã dùng và link mở ở trình duyệt khác phải lỗi.
- Production HTTPS/Cloudflare: kiểm tra `Secure`, `SameSite=Lax`, cache header và refresh trên Worker; kiểm tra request Supabase trực tiếp với token bị thu hồi. Chưa có cấu hình project test thì ghi **chưa kiểm chứng**, không đánh dấu #9/#11/#12 hoàn thành.
