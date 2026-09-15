# Test plan

- Unit: validation, query filter, matching score và chuyển trạng thái.
- Component: form đăng tin, thẻ tin, bộ lọc và claim action; kiểm tra empty/error/success.
- Integration/RLS: anonymous, owner, unrelated user và admin; proof của claim không bị lộ.
- E2E: đăng nhập, tạo tin, tìm kiếm, gửi claim, chấp nhận/từ chối, hoàn trả và moderation.
- Security: file sai MIME/quá dung lượng, truy cập trái phép, duplicate claim và input không hợp lệ.
- Accessibility: keyboard navigation, label, focus, contrast và viewport mobile/desktop.
