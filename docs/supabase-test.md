# Môi trường Supabase test A2

## Trạng thái

Project test `unilost-a2-test` đã được tạo, ref `lsaukzzmwbsztnlcrdpk`, gói Free, vùng Tokyo theo cấu hình người dùng. Đã bootstrap 0001 và khóa quyền 0002 qua SQL Editor trên DB trống, kiểm tra và căn lại đầy đủ FK cascade theo nguồn gốc. Đây là áp dụng SQL thủ công, có snippet/checkpoint; chưa dùng CLI để tạo `supabase_migrations.schema_migrations` và không giả lập lịch sử CLI.

SQL assertions và 77 kiểm tra actor trên PostgreSQL hosted đạt. Runner đã đạt **113 kiểm tra Auth/REST/Storage** sau đối chiếu schema và dọn toàn bộ fixture tự động. Email/PKCE thật, trigger và form sửa hồ sơ trên DB thật đã đạt với hộp thư test thứ nhất; hộp thư thứ hai đã nhận thư và hoàn tất PKCE thật ngày 17/10/2026: token exchange 200, đọc hồ sơ thật, DB xác nhận email/role `user`/hồ sơ giữ nguyên, logout 204. Sau khi cấu hình Gmail SMTP với App Password hợp lệ, đã gửi/nhận link mới, đăng nhập lại bằng PKCE và đọc hồ sơ thật thành công. DB readback xác nhận last sign-in mới, cùng ID/tên/khoa/role/ngày tạo so với snapshot trước xác nhận; logout lại thành công. Các lỗi 429 và SMTP 534 trước đó là lịch sử đã khắc phục trên project test. Tài khoản email test thứ nhất được giữ để tiếp tục sử dụng, các tài khoản `@example.test` tự động đã xóa.

`.env.example` vẫn mặc định `SUPABASE_PROFILE_EDIT_ENABLED=false`. Cấu hình `.env.local` bị Git ignore đã bật cờ **chỉ cho project test trên** sau kiểm tra quyền và email/PKCE thật. Không bật production; còn chờ kiểm tra HTTPS/Worker trước nghiệm thu rộng hơn. Service key chỉ ở file test ngoài repo, không có trong app hoặc build.

Custom SMTP Gmail đã hoạt động trên project test ngày 17/10/2026: `smtp.gmail.com`, TLS cổng 465. Người dùng thay bằng App Password hợp lệ trực tiếp trên Dashboard; gửi/nhận thư và đăng nhập lại thật đạt. Không lưu credential hoặc địa chỉ email vào repo. Gmail có hạn mức/phân loại thư riêng; chưa coi cấu hình test là nghiệm thu production.

## 1. Tạo project test riêng

- Kết nối Supabase trong ứng dụng Codex bằng tài khoản sở hữu project. Không gửi password, access token hoặc service-role key vào chat.
- Tạo project tên `unilost-a2-test`, gói Free, vùng Singapore nếu còn khả dụng. Nếu có nhiều tổ chức thì chọn tổ chức của dự án UniLost; nếu chưa xác định được hoặc không còn quota Free thì cần người dùng chọn, không tự tạo tài nguyên trả phí.
- Không tái sử dụng production. Lưu project ref và cấu hình bí mật vào file local ở `D:\Codex\work\unilost\a2\`; không đưa vào thư mục source. Việc tạo/kết nối project vẫn cần thực hiện khi tài khoản sẵn sàng, không coi tài liệu này là bằng chứng đã tạo.

## 2. Kiểm tra và áp dụng migration

1. Xác nhận project ref trên Dashboard/kết nối SQL đúng project test vừa tạo. Chạy `supabase/tests/a2_preflight.sql` bằng kết nối quản trị tin cậy; lưu kết quả ngoài Git. Nếu có bảng migration history, đọc cả lịch sử đã áp dụng.
2. Project mới, chưa có schema UniLost: áp dụng `0001_initial.sql` một lần và ghi nhận trong lịch sử migration của công cụ quản lý project. Project đã có schema: đối chiếu đủ sáu bảng, enum, trigger, function, policy và grants với migration/lịch sử hiện có. Có khác biệt chưa giải thích được thì dừng, không reset hay ghi đè schema.
3. Áp dụng `0002_a2_permissions.sql` một lần qua cùng công cụ quản lý migration. Không chạy seed cũ hoặc sửa migration 0001. Migration mới chỉ đổi quyền/policy, không xóa dữ liệu.
4. Chạy `supabase/tests/a2_permissions.sql`. Script kiểm tra RLS, grants theo bảng/cột, quyền quản trị fixture và policy Storage, không tạo dữ liệu. Sau đó chạy `supabase/tests/a2_rls.sql`: 77 kiểm tra trigger và mutation với guest/member/stranger/admin trong một transaction, cuối cùng rollback toàn bộ fixture/DDL tạm. SQL DELETE của Storage hosted còn bị guard riêng chặn; kiểm chứng file thật phải qua runner Storage API.

## 3. Chạy kiểm tra REST/Storage có fixture tự dọn

Tạo file ngoài Git, ví dụ `D:\Codex\work\unilost\a2\supabase-test.env`, gồm:

```dotenv
SUPABASE_TEST_PROJECT_REF=<ref của project test, 20 ký tự>
SUPABASE_TEST_URL=https://<ref>.supabase.co
SUPABASE_TEST_ANON_KEY=<public key của project test>
SUPABASE_TEST_SERVICE_ROLE_KEY=<service-role/secret key của project test>
```

Chạy tại repo:

```powershell
node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-permissions.mjs
```

Hoặc nạp riêng các biến test vào process rồi chạy `npm run test:db`.
Runner từ chối URL không khớp ref và không tự lấy cấu hình ứng dụng để tránh chạy nhầm production.

- Runner dùng API quản trị tạo hai thành viên và một admin giả lập, password ngẫu nhiên chỉ trong bộ nhớ, email `@example.test`, không gửi email. Metadata cố tình chứa role admin; trigger phải vẫn tạo role user. Chỉ API quản trị mới gán admin test.
- Kiểm tra đăng nhập password không ghi đè hồ sơ; tên/khoa tự sửa được, các trường hệ thống và hồ sơ người khác không sửa được. Khách không ghi được. Với tin/claim/ảnh/lịch sử/moderation, thử insert/update/delete trực tiếp cho cả bốn actor. Kiểm tra cả dữ liệu sau request và kết quả HTTP; không chấp nhận lỗi constraint làm bằng chứng quyền.
- Storage được seed một file text giả; upload/overwrite/delete qua tài khoản thường và admin ứng dụng đều phải bị chặn. File gốc và danh sách file phải giữ nguyên.
- Dọn đúng UUID/path tạo trong lần chạy, kể cả dữ liệu attack; không dùng truncate/reset hoặc xóa hàng có sẵn. Chỉ in PASS khi dọn xong. Nếu cleanup lỗi, log có run ID để rà đúng fixture; giữ cờ sửa hồ sơ tắt.
- Service key chỉ phục vụ fixture và xác nhận dữ liệu sau request. Các request đang được kiểm tra dùng public key/token của từng actor; service key không đi vào ứng dụng hoặc bundle trình duyệt.

## 4. Email/PKCE và mở form

1. Dùng hai hộp thư test nhóm kiểm soát, đăng ký qua UI và mở link trong cùng trình duyệt đã yêu cầu. Không dùng tài khoản giả `@example.test` để xác minh email.
2. Kiểm tra trigger tạo đúng ID/tên/default role user, email cũ đăng nhập lại không ghi đè tên/khoa. Gán admin test qua công cụ quản trị đáng tin cậy. Kiểm tra khách/member/admin và logout.
3. Copy `.env.example` sang `.env.local` local, điền URL/public key của **cùng project đã kiểm chứng**. Cấu hình Auth Site URL `http://localhost:5173`, redirect `http://localhost:5173/auth/callback**`; dùng template `{{ .ConfirmationURL }}` theo `docs/deployment.md`.
4. Chỉ sau migration, SQL assertions, REST/Storage và email/PKCE thật đạt, đặt `SUPABASE_PROFILE_EDIT_ENABLED=true`, khởi động lại ứng dụng rồi smoke desktop/mobile: tên/khoa, khoa rỗng, lỗi, submit lặp, header đổi tên, thiếu/hết phiên. Đối với Cloudflare local, đặt cờ trong `.env.local` để Worker nhận biến; chỉ đặt biến ở shell chưa đủ cho Worker. Production phải khai báo riêng biến runtime sau nghiệm thu môi trường đó; không bật theo kết quả project khác.
5. Không copy service key vào `.env.local` ứng dụng. Lưu log đã loại secret tại `D:\Codex\outputs\unilost\a2\`, cập nhật checkpoint theo kết quả thật.

## Giới hạn còn lại

Chưa có workflow mutation tin/claim; quyền ghi của chúng đang khóa kể cả admin ứng dụng. Ảnh bucket public vẫn truy cập được bằng URL đã biết (S05), chưa chuyển private/signed URL. API test tự động không thay thế email PKCE, HTTPS/Worker và kiểm tra đồng thời ở các phiên sau. Không đóng #12/#36 chỉ vì unit test hoặc fixture mô phỏng đạt.


## A3a — tạo found (17/10/2026)

- Sau 0002, áp dụng `supabase/migrations/0003_a3a_create_found_posts.sql` trên project test riêng. Không chạy lại 0001/0002 trên schema hosted đã bootstrap. SQL Editor không tự ghi migration history của CLI; đối chiếu schema trước khi repair history.
- Preflight: chạy phần `begin`/`alter table ... add constraint posts_content_valid` của 0003 rồi `rollback`; kiểm tra lỗi dữ liệu hiện hữu trước khi chạy nguyên migration. Constraint tự validate toàn bộ dữ liệu và transaction rollback nếu không tương thích; không tự sửa/xóa tin cũ để vượt preflight.
- Chạy lần lượt `supabase/tests/a2_permissions.sql`, `supabase/tests/a2_rls.sql`, `supabase/tests/a3a_create_found.sql`, rồi runner `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-permissions.mjs`. Hai file A2 hiện kiểm tra trạng thái quyền sau 0003; không dùng phiên bản mới để nghiệm thu schema chỉ có 0002.
- Quyền mới: authenticated INSERT đúng các cột nội dung và owner_id; chỉ found của mình, searching/pending/chưa xóa. ID/thời gian/trạng thái/kiểm duyệt không có quyền INSERT; UPDATE/DELETE, claim, ảnh và Storage vẫn khóa. API trực tiếp phải tuân thủ constraint nội dung và ngày hợp lệ.
- Trên `unilost-a2-test` (`lsaukzzmwbsztnlcrdpk`): preflight PASS, migration 0003 áp dụng qua SQL Editor, assertions hosted PASS; REST/Auth/Storage **180 kiểm tra PASS**, fixture đã dọn. Snippet kiểm tra: `f53110a1-82b9-4049-9c8d-a9f25f7235d9`.
- Browser localhost: email thật/PKCE → `/posts/new` → double-click tạo đúng một tin found/searching/pending, owner khớp Auth; hiện mã tin/chờ duyệt. Nút tạo tin khác reset form; lỗi validation phía server giữ input. Desktop 1086px và mobile 390×844 không tràn ngang; không có browser console error. Tin giả browser đã xóa đúng UUID bằng fixture client ngoài app.
- DB/network error được kiểm tra bằng unit mocks; chưa gây lỗi transport DB chủ động trên browser. HTTPS/Worker chưa nghiệm thu. Không dùng kết quả localhost để tuyên bố staging/production đạt.
- Minh chứng ngoài Git: `D:\Codex\outputs\unilost\a3a\` (hosted-rest.log, hosted-sql.png, desktop-success.png, mobile-success.png, mobile-validation-error.png, browser-db.json và log local). Không lưu email/token/key trong tài liệu hoặc ứng dụng.
