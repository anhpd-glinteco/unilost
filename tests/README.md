# Test structure

- `unit/`: domain logic, validation và permission helpers.
- `components/`: component tests.
- `e2e/`: Playwright flows với Supabase test project.
- `fixtures/`: dữ liệu regression tối thiểu, không chứa thông tin cá nhân thật.

## A6: tạo/hủy claim

- `unit/claim-actions.test.ts`: xác thực, whitelist/validation, gọi RPC, lỗi và đối chiếu trạng thái khi kết quả chưa rõ; không trả/log proof.
- `fixtures/claim-proofs.json`: 12 vector Unicode/độ dài/trim dùng chung unit và runner DB. `supabase/tests/a6_claims.sql`: quyền EXECUTE, khóa ghi trực tiếp, danh tính, tạo/hủy và chống lặp; fixture rollback.
- Runner `npm run test:db` hiện cần migration 0004–0005, giữ A5 và kiểm tra RPC/quyền/trạng thái/cạnh tranh trên Supabase test. Thiết lập, cleanup failure injection và minh chứng: [hướng dẫn Supabase test](../docs/supabase-test.md).

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

## A7: quyết định claim

- `unit/claim-actions.test.ts`: accept/reject chỉ gửi claimId đã kiểm tra; dùng phiên Auth, giữ ClaimState và readback đúng chủ tin khi lỗi/mất phản hồi. Giữ regression create/cancel A6.
- [SQL A7](../supabase/tests/a7_claim_decisions.sql): điều kiện/quyền, index accepted/completed, trạng thái xử lý, lịch sử và rollback toàn hàng khi lỗi ghi lịch sử; toàn bộ fixture/DDL thử lỗi tự rollback.
- Runner `npm run test:db` hiện yêu cầu migration 0006 sau 0001–0005. Bổ sung token actor, accept/accept khác claim, accept/cancel và accept/reject cùng claim; kiểm tra dữ liệu cuối, claim khác, lịch sử và cleanup/readback theo tin. Không thay thế UI E2E hoặc kiểm thử tải.

## A8a: form gửi claim

- `unit/claim-form-context.test.ts`: đúng phiên/filter/projection tối thiểu; khách, thiếu profile, chủ tin, tin không đủ điều kiện, năm trạng thái claim đã tồn tại và lỗi đọc đều được kiểm tra.
- `unit/claim-section.test.tsx` và `unit/post-detail-page.test.tsx`: đăng nhập quay lại đúng tin, form có nhãn, trạng thái hiện có, lỗi an toàn; giữ 404/lỗi trang chi tiết. Các kiểm tra action A6/A7 vẫn chạy nguyên vẹn.
- Script browser ngoài Git: `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env D:/Codex/work/unilost/a8a/browser.mjs`. Chỉ dùng project test đã xác nhận, tạo/dọn fixture riêng; không chứa credential. Chờ hydration trước khi nhập liệu; kiểm tra pending, trim/giữ input, double-click/DB readback, khóa sau reload, phiên hết hạn và hủy phản hồi POST sau commit. Không tự retry mutation.
- Minh chứng: `D:/Codex/outputs/unilost/a8a/`, gồm summary, log và ảnh viewport 1086/390×844, DPR 1. Đây là browser dev với Supabase test, chưa phải production/HTTPS/Worker hoặc luồng A8b/A9.
