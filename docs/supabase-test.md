# Môi trường Supabase test A2

## B1c — sửa/đóng tin (21/10/2026)

- Migration `0008_b1c_edit_close_posts.sql` đã áp dụng trên đúng `unilost-a2-test` (`lsaukzzmwbsztnlcrdpk`) qua SQL Editor, sau preflight và lượt rollback. Hai RPC trước đó chưa tồn tại; sau rollback vẫn chưa tồn tại, số hàng posts/profiles/claim_requests/status_history giữ 11/7/13/2. Không chạy lại migration đã áp dụng hoặc tự ghi migration history CLI.
- Sáu suite `a2_permissions.sql`, `a2_rls.sql`, `a3a_create_found.sql`, `a6_claims.sql`, `a7_claim_decisions.sql`, `b1c_posts.sql` hosted PASS. Fixture và DDL thử lỗi nằm trong transaction rollback; direct UPDATE vẫn khóa, RPC chỉ cho authenticated EXECUTE.
- Replay REST dùng lệnh B1a bên dưới, nay bao gồm B1c. Kết quả cuối và giới hạn tại checkpoint B1c trong `docs/progress.md`; bằng chứng ngoài Git tại `D:/Codex/outputs/unilost/b1c/hosted/`. Không suy rộng sang production, UI hoặc browser sửa/đóng tin.

## B1a — tạo lost (20/10/2026)

- Project test vẫn là `unilost-a2-test`, ref `lsaukzzmwbsztnlcrdpk`; không áp dụng production. Preflight đọc policy INSERT, grants theo cột và số tin trước migration: hai policy chỉ cho found, tám cột INSERT của authenticated, 11 tin và không có lost.
- Chạy migration `0007_b1a_create_lost_posts.sql` với rollback trước; xác nhận hai policy gốc vẫn tồn tại, rồi áp dụng nguyên migration một lần. Không giả lập migration history CLI. Không chạy lại nếu policy đã chuyển sang `users create own posts` / `post insert guard`.
- Chạy năm suite SQL như A7; `a3a_create_found.sql` hiện yêu cầu 0007 và bổ sung lost hợp lệ thay cho assertion cũ cấm lost. Fixture tự rollback; tổng tin sau SQL vẫn là 11.
- Replay REST: `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-permissions.mjs`. Runner giữ hồi quy claim/Storage và kiểm tra cả lost/found theo actor; credential ở ngoài Git. Kết quả và giới hạn xem checkpoint B1a trong progress và `D:/Codex/outputs/unilost/b1a/`.
- UI lost, sửa/đóng tin, ảnh, browser lost, email PKCE mới và production chưa thuộc phiên này.

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

- Runner dùng API quản trị tạo ba thành viên và một admin giả lập (chủ tin, người gửi claim, người ngoài độc lập và admin), password ngẫu nhiên chỉ trong bộ nhớ, email `@example.test`, không gửi email. Metadata cố tình chứa role admin; trigger phải vẫn tạo role user. Chỉ API quản trị mới gán admin test.
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

Tạo tin found đã có ở A3a; tạo/hủy claim qua RPC được bổ sung ở A6. Ghi trực tiếp claim vẫn khóa kể cả admin ứng dụng; accept/reject được bổ sung ở A7, UI chưa hoàn tất. Ảnh bucket public vẫn truy cập được bằng URL đã biết (S05), chưa chuyển private/signed URL. API test tự động không thay thế email PKCE hoặc HTTPS/Worker. Không đóng #12/#36 chỉ vì unit test hoặc fixture mô phỏng đạt.


## A3a — tạo found (17/10/2026)

- Sau 0002, áp dụng `supabase/migrations/0003_a3a_create_found_posts.sql` trên project test riêng. Không chạy lại 0001/0002 trên schema hosted đã bootstrap. SQL Editor không tự ghi migration history của CLI; đối chiếu schema trước khi repair history.
- Preflight: chạy phần `begin`/`alter table ... add constraint posts_content_valid` của 0003 rồi `rollback`; kiểm tra lỗi dữ liệu hiện hữu trước khi chạy nguyên migration. Constraint tự validate toàn bộ dữ liệu và transaction rollback nếu không tương thích; không tự sửa/xóa tin cũ để vượt preflight.
- Chạy lần lượt `supabase/tests/a2_permissions.sql`, `supabase/tests/a2_rls.sql`, `supabase/tests/a3a_create_found.sql`, rồi runner `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-permissions.mjs`. Hai file A2 hiện kiểm tra trạng thái quyền sau 0003; không dùng phiên bản mới để nghiệm thu schema chỉ có 0002.
- Quyền mới: authenticated INSERT đúng các cột nội dung và owner_id; chỉ found của mình, searching/pending/chưa xóa. ID/thời gian/trạng thái/kiểm duyệt không có quyền INSERT; UPDATE/DELETE, claim, ảnh và Storage vẫn khóa. API trực tiếp phải tuân thủ constraint nội dung và ngày hợp lệ.
- Trên `unilost-a2-test` (`lsaukzzmwbsztnlcrdpk`): preflight PASS, migration 0003 áp dụng qua SQL Editor, assertions hosted PASS; REST/Auth/Storage **180 kiểm tra PASS**, fixture đã dọn. Snippet kiểm tra: `f53110a1-82b9-4049-9c8d-a9f25f7235d9`.
- Browser localhost: email thật/PKCE → `/posts/new` → double-click tạo đúng một tin found/searching/pending, owner khớp Auth; hiện mã tin/chờ duyệt. Nút tạo tin khác reset form; lỗi validation phía server giữ input. Desktop 1086px và mobile 390×844 không tràn ngang; không có browser console error. Tin giả browser đã xóa đúng UUID bằng fixture client ngoài app.
- DB/network error được kiểm tra bằng unit mocks; chưa gây lỗi transport DB chủ động trên browser. HTTPS/Worker chưa nghiệm thu. Không dùng kết quả localhost để tuyên bố staging/production đạt.
- Minh chứng ngoài Git: `D:\Codex\outputs\unilost\a3a\` (hosted-rest.log, hosted-sql.png, desktop-success.png, mobile-success.png, mobile-validation-error.png, browser-db.json và log local). Không lưu email/token/key trong tài liệu hoặc ứng dụng.

## A3b — đọc chi tiết (18/10/2026)

- Không có migration mới. Tái chạy runner theo lệnh A3a ở trên: ma trận đọc bổ sung kiểm tra published/pending/hidden/deleted cho bốn actor; tổng hiện tại **212 checks PASS** trên project test, fixture đã dọn.
- Raw RLS cho chủ tin/admin đọc cả hàng deleted; truy vấn trang thêm `deleted_at=is.null` để mọi actor nhận 404 đối với tin xóa. Người lạ/khách không đọc pending/hidden. Không mở rộng quyền SELECT hay đưa service key vào app.
- Browser dùng fixture Auth riêng: 25 trường hợp quyền xem, ID sai/không tồn tại và chuyển từ owner sang guest đạt; 1086px/390px không tràn ngang. Tài khoản/tin fixture đều dọn; đây không phải lượt kiểm tra email/PKCE mới.
- Log/ảnh và giới hạn kiểm tra: `D:\Codex\outputs\unilost\a3b\verification.md`. Lỗi tải dữ liệu đã có unit/render tests; chưa mô phỏng DB outage trên browser. HTTPS/Worker còn chờ staging.

## A5 — quyền đọc proof (18/10/2026)

- Chạy cùng runner/lệnh A3a; không có migration mới. Bốn tài khoản fixture tách biệt chủ tin, requester, người ngoài và admin. Hai claim cùng tin có proof giả khác nhau; chỉ đọc dữ liệu fixture, không ghi proof vào log.
- 100 kiểm tra REST bổ sung: năm vai trò gồm guest, năm trạng thái tin published/pending/hidden/xóa mềm/closed, mỗi tổ hợp kiểm tra danh sách theo tin, hai ID claim và `posts?select=id,claim_requests(id,proof)`.
- Guest/người ngoài không nhận claim; requester chỉ nhận claim của mình; chủ tin/admin nhận cả hai. Tin không công khai/đã xóa mềm không làm mất quyền đọc claim trực tiếp của các bên liên quan. Truy vấn lồng còn chịu quyền đọc hàng tin: requester không nhận hàng tin ẩn/xóa, dù vẫn đọc trực tiếp claim của mình.
- Runner giữ các kiểm tra chống ghi trực tiếp và bổ sung readback ID sáu bảng sau cleanup. Thử lỗi transport ở truy vấn A5 đầu tiên đã xác nhận cleanup vẫn chạy, không còn hàng fixture và bốn Auth user đều trả 404 khi đọc quản trị.
- Script thử lỗi cùng log đã loại secret ở `D:\Codex\outputs\unilost\a5\check-failure-cleanup.mjs` và `failure-cleanup.log`. Chạy bằng `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env D:/Codex/outputs/unilost/a5/check-failure-cleanup.mjs`; script nhập runner từ đường dẫn repo hiện tại.
- Feed hiện dùng dữ liệu demo; truy vấn chi tiết không chọn claim/proof, app không log proof. Claim UI thật, mutation, kiểm tra đồng thời và HTTPS/Worker vẫn ngoài A5.
- Kết quả hosted cuối: **315 checks PASS**, fixture đã dọn và readback sáu bảng đều rỗng. Lượt trước từng báo lỗi request cleanup moderation; đối chiếu không còn parent/Auth fixture, chạy lại đầy đủ đạt. Log cuối `D:\Codex\outputs\unilost\a5\hosted-rest-rerun.log`; lịch sử/giới hạn ở `verification.md` cùng thư mục.

## A6 — tạo/hủy claim (18/10/2026)

- Xác nhận đúng project test; đọc schema/grants và sự tồn tại hai RPC trước khi áp dụng [0004](../supabase/migrations/0004_a6_create_cancel_claims.sql). Migration chỉ thêm function/grant EXECUTE, không sửa dữ liệu hay thêm constraint trên proof cũ. Nếu RPC đã có hoặc schema drift thì đối chiếu trước, không ghi đè function hoặc chạy lại migration mù.
- Preflight bằng nội dung 0004 thay `commit` cuối thành `rollback`, kiểm tra hai function không còn sau rollback. Sau đó áp dụng nguyên migration một lần qua SQL Editor. Không giả lập migration history CLI; không áp dụng production.
- Áp dụng tiếp [0005](../supabase/migrations/0005_a6_claim_proof_json_type.sql), thay tham số proof text bằng jsonb chỉ nhận JSON string. Probe API thật phát hiện PostgREST ép số/object/array thành text ở 0004; giữ nguyên migration đã áp dụng và khắc phục bằng migration kế tiếp. Caller RPC vẫn gửi chuỗi trong JSON như cũ, không tự JSON.stringify proof trong action.
- Chạy `supabase/tests/a2_permissions.sql`, `a2_rls.sql`, `a3a_create_found.sql` và `a6_claims.sql` sau 0005; fixture SQL tự rollback. Chạy runner theo lệnh A3a với biến test-only hiện có, không dùng service key cho request được nghiệm thu.
- Runner giữ toàn bộ A5 và chống ghi trực tiếp, thêm tạo/hủy qua RPC: 12 vector proof dùng chung TypeScript, tự claim/giả danh/trùng/tin không hợp lệ, quyền admin theo đối tượng, hủy pending trên tin published/pending/hidden/deleted/closed, không đổi dữ liệu khác, không gửi lại sau xử lý, hai tạo hoặc hai hủy cạnh tranh chỉ một thành công.
- Minh chứng tại `D:\Codex\outputs\unilost\a6\`. Script `check-failure-cleanup.mjs` tại đó cố tình làm mất phản hồi sau RPC đã commit, xác nhận claim không được runner ghi nhận ID vẫn bị dọn qua cascade khi xóa đúng tin fixture, cùng readback bảng và bốn Auth user. Chạy bằng `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env D:/Codex/outputs/unilost/a6/check-failure-cleanup.mjs`.
- A6 không có browser claim UI; không coi password fixture/API hoặc PostgreSQL mô phỏng là nghiệm thu email, HTTPS/Worker, A7 hay production. Kết quả thực chạy xem checkpoint A6.
- Kết quả cuối sau 0005: **433 checks PASS**, fixture đã dọn và readback sáu bảng đạt; gồm 118 kiểm tra A6 mới. Bốn SQL suite hosted PASS. Probe số/object/array đều bị từ chối; thử mất phản hồi sau commit xác nhận claim chưa ghi nhận ID vẫn được cascade dọn và bốn Auth user không còn. Xem `verification.md`, `hosted-rest.log`, `hosted-sql.png`, `proof-types-after.log`, `failure-cleanup.log` trong thư mục minh chứng A6. Lượt 426 trước sửa kiểu chỉ là lịch sử.

## A7 — chấp nhận/từ chối claim (18/10/2026)

- Sau 0005, đối chiếu đúng project test và xác nhận chưa có RPC/index A7. Áp dụng [0006](../supabase/migrations/0006_a7_decide_claims.sql) trong transaction rollback trước, rồi nguyên migration một lần. Nếu có duplicate accepted/completed hoặc schema drift thì dừng, không tự sửa dữ liệu. SQL Editor không tự ghi lịch sử migration CLI.
- Chạy năm suite `a2_permissions.sql`, `a2_rls.sql`, `a3a_create_found.sql`, `a6_claims.sql`, [a7_claim_decisions.sql](../supabase/tests/a7_claim_decisions.sql). A7 cố tình gây lỗi ở bước ghi lịch sử và đối chiếu toàn hàng claim/tin cùng lịch sử sau rollback. Fixture, function/trigger thử lỗi đều nằm trong transaction tự rollback.
- Runner giữ A2–A6, bổ sung quyền quyết định theo đối tượng, điều kiện accept, reject trên tin không công khai/đóng/xóa, index một người nhận, projection đọc lại của chủ tin và ba kiểu tranh chấp. Mỗi kiểu tranh chấp chạy ba fixture độc lập; đây không phải đo tải. Chạy cùng lệnh test-only ở A3a.
- Cleanup dọn đúng fixture, lịch sử tự sinh được cascade theo tin; readback thêm status_history theo post_id để bắt hàng chưa kịp ghi nhận ID khi mất phản hồi.
- Minh chứng và script thử mất phản hồi sau accept đã commit ở `D:/Codex/outputs/unilost/a7/`. Chạy bằng `node --env-file=D:/Codex/work/unilost/a2/supabase-test.env D:/Codex/outputs/unilost/a7/check-failure-cleanup.mjs`. Không ghi proof thật/token/key vào log.
- UI/browser claim, HTTPS/Worker, C1 và production không thuộc nghiệm thu A7.

- Lượt hosted đầy đủ sau 0006: **558 checks PASS** (125 mới A7), fixture được dọn, readback sáu bảng và lịch sử theo post_id đạt. Năm SQL suite hosted và 214 unit test/typecheck/lint/build đạt; xem checkpoint A7 và minh chứng ngoài Git.
- Thử mất phản hồi sau accept đã commit PASS: lịch sử chưa được ghi nhận ID vẫn được cascade dọn theo tin; readback bảng/lịch sử đạt, claim không còn và bốn Auth user trả 404. Log `failure-cleanup.log` trong thư mục A7.
