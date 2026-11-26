# Test structure

- `unit/`: domain logic, validation và permission helpers.
- `components/`: component tests.
- `e2e/`: Playwright flows với Supabase test project.
- `fixtures/`: dữ liệu regression tối thiểu, không chứa thông tin cá nhân thật.

## Fixture Auth/profile A1b

- `fixtures/auth.ts`: thành viên giả lập và profile DB; metadata cố tình khai role admin để test không tin metadata. Test tạo biến thể admin, thiếu/lỗi profile và sai ID; không dùng tài khoản/dữ liệu thật.
- `unit/auth-account.test.ts`: Auth xác thực ID → query profile đúng ID → guard; thành viên/khách bị chặn admin, lỗi quyền không mở truy cập. `lib/auth/login.test.ts` kiểm tra tên đăng ký và metadata chỉ có `full_name`.
- Provider HTTP và profile giả lập chỉ là test ứng dụng, không chứng minh trigger, RLS hay chống tự nâng role qua API thực tế.

### Chuẩn bị project Supabase test riêng cho A2/#12

1. Dùng project test độc lập, cấu hình URL/public key tại môi trường local; giữ secret ngoài Git/chat. Không dùng project production và không thêm service-role key vào client.
2. Tạo hai tài khoản thành viên bằng hộp thư test nhóm kiểm soát (chủ tin/người gửi và người lạ); tạo một tài khoản admin riêng. Khách dùng cửa sổ không có cookie. Chủ tin/người gửi là vai trò theo đối tượng, không phải role trong profile.
3. Hoàn tất email PKCE ở cùng trình duyệt đã yêu cầu; kiểm tra trigger tạo đúng `profiles.id = auth.users.id`, `full_name`, `faculty` và mặc định role user. Đăng ký lại email cũ phải giữ profile hiện có; metadata không được cấp quyền admin.
4. Gán role admin cho tài khoản test bằng công cụ quản trị đáng tin cậy ngoài ứng dụng; không qua metadata hoặc request client. Giữ bảng ánh xạ ID test ở local, không commit email/token/proof thật.
5. Kiểm tra khách/phiên thu hồi bị chặn bốn route; thành viên có dashboard, admin mới xem được `/admin`. Thử thiếu profile/lỗi đọc trên fixture hoặc DB test, không xóa profile đang có dữ liệu liên quan.
6. A2 phải kiểm tra trực tiếp REST bằng token thành viên: không sửa được `profiles.role` và trường nhạy cảm. Chính sách hiện tại còn rộng; guard A1b chưa khắc phục lỗ hổng DB này. Chỉ nghiệm thu sau migration và test API thật.
