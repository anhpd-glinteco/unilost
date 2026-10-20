# Test plan

- Nghiệm thu claim Tuần 6: [A9b — ma trận, replay và giới hạn](claim-acceptance.md). Kết quả từng lượt xem checkpoint A9b trong [progress](progress.md); không dùng kết quả local để kết luận production.

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

## Kiểm tra A1b

- Unit: đăng ký trim tên 1–100 ký tự, email hợp lệ, metadata chỉ gửi `full_name`, lỗi cấu hình/provider/mạng; account query chỉ theo ID Auth đã xác thực, từ chối metadata role admin, role/ID/ngày hồ sơ sai và lỗi DB/mạng. Guard giữ return URL an toàn, lỗi profile không cho admin truy cập.
- Browser mô phỏng: khách truy cập trực tiếp dashboard/claims/new/admin → login đúng `next`; tên toàn khoảng trắng bị từ chối; hai submit liên tiếp → một OTP; chưa có phiên trước callback; callback → dashboard hiển thị tên/khoa/ngày DB; member bị 404 admin, admin được 200; thiếu/lỗi profile có cảnh báo an toàn và admin bị 404.
- Header desktop/mobile: khách có đăng nhập/đăng ký; thành viên có profile/logout và không có admin dù metadata khai admin; admin DB mới có liên kết quản trị. Kiểm tra viewport 390px không tràn ngang, menu mở/đóng và logout server action. Form post demo cùng nút claim/moderation bị khóa, không báo lưu thành công.
- Thiếu env: form đăng ký sau hydration hiện lỗi và cho thử lại; header ChatGPT giả không mở được trang riêng tư. Form phụ thuộc JavaScript; bấm trước hydration có thể POST tải lại trang, không đưa tên/email vào query và không gửi OTP. Smoke ban đầu gặp trường hợp này; chạy lại sau hydration đạt kiểm tra lỗi cấu hình.
- Fixture và quy trình provider thật: xem [tests/README](../tests/README.md). Chưa xác minh email/trigger/redirect allowlist, profile/RLS trên DB thật hoặc cookie HTTPS/Worker. Không đóng #9/#11/#12 theo kết quả mô phỏng.
