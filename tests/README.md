# Test structure

- `unit/`: domain logic, validation và permission helpers.
- `components/`: component tests.
- `e2e/`: Playwright flows với Supabase test project.
- `fixtures/`: dữ liệu regression tối thiểu, không chứa thông tin cá nhân thật.

## A2: quyền DB và sửa hồ sơ

- Thiết lập project test, migration và lệnh chạy: [docs/supabase-test.md](../docs/supabase-test.md).
- `supabase/tests/a2_preflight.sql`: đọc schema/grants/policies/trigger trước migration; dừng khi có drift chưa giải thích.
- `supabase/tests/a2_permissions.sql`: assertions grants/RLS, policy Storage và FK bootstrap sau migration 0002. `a2_rls.sql`: 77 kiểm tra role/trigger transactional, rollback fixture/DDL tạm; Storage hosted SQL DELETE còn có guard riêng.
- `npm run test:db`: runner REST tạo hai member và một admin giả, kiểm tra dữ liệu trước/sau, dọn đúng fixture; cần biến `SUPABASE_TEST_*` của project test riêng. Không gửi email, không chứng minh PKCE thật.
- `unit/profile-update.test.ts`: server action whitelist trường, ID từ Auth, validation, lỗi và cờ khóa mặc định. `unit/permission-runner.test.ts`: chặn chạy nhầm target và nhận diện denial.
- Project test thật A2 đã đạt SQL/REST/Storage và email/PKCE hộp thư 1; local đã bật sửa hồ sơ sau kiểm chứng. Template/production vẫn false. Hộp thư 2 đang bị 429 `over_email_send_rate_limit`; không coi đã nghiệm thu email đầy đủ.

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
6. A2 phải kiểm tra trực tiếp REST bằng token thành viên: không sửa được `profiles.role` và trường nhạy cảm. Migration 0001 còn rộng; migration 0002 đã áp dụng và kiểm chứng trên project test riêng, bổ sung quyền cột và khóa ghi demo. Không suy ra production có cùng trạng thái. Chỉ nghiệm thu sau migration và test API thật; guard A1b không thay quyền DB.
