# Bàn giao UniLost

Kế hoạch: [plan.md](plan.md). Hiện trạng: [baseline.md](baseline.md). Báo cáo: [report/README.md](report/README.md).

## Checkpoint A0 — 17/10/2026

- **Phạm vi:** chốt hiện trạng, ma trận R01–R12, rủi ro S01–S08, đặc tả UC01–UC08, sơ đồ use case nguồn, khung báo cáo và quy trình bàn giao.
- **Branch:** `codex/unilost-a0-baseline`; base `ca1a170ea0cde0b005d5b0de24c2158bf0406f65`.
- **Issue liên quan:** #6/#7/#8/#10; chưa đóng. Tài liệu A0 là đầu vào rà soát, không đồng nghĩa mọi tiêu chí các issue đã nghiệm thu.
- **Kiểm chứng:** đọc source Auth/posts/search/claims/admin, types/validation/matching, migration, test và CI; GitHub CLI xác nhận 36 issue mở #6–#41. Không có `.codegraph/`; không có `node_modules` tại đầu phiên.
- **Phát hiện chính:** UI mutation còn demo; login thiếu cấu hình vẫn báo sent; quyền cập nhật role/moderation/claim còn rộng; chưa giao dịch/unique accepted; ảnh bucket public; matching cần test tiếng Việt/returned.
- **Quyết định:** mỗi phiên một đầu ra nhỏ theo yêu cầu người dùng; A0 chỉ tài liệu, không tự tiếp tục A1 trong cùng phiên. Dùng chung đặc tả cho #6/#8. Header ChatGPT không thay Supabase Auth. Không ghi kết quả test chưa chạy.
- **Kiểm tra tài liệu:** PASS kiểm tra Python (UTF-8, liên kết nội bộ, tham chiếu #6–#41 và UC01–UC08); `git diff --check` đạt. PlantUML 1.2025.2 render SVG/PNG thành công bằng Java local; đã xem PNG, tiếng Việt đọc được và không cắt nội dung. Hình ở `D:\Codex\outputs\unilost\a0\use-cases.svg` và `use-cases.png`; JAR tải từ Maven Central vào `D:\Codex\downloads\unilost\`, không thêm dependency dự án.
- **Dữ liệu/môi trường:** không đổi migration/schema/dữ liệu/env; không sửa Sheet hay issue GitHub; không cài dependency ứng dụng.
- **Commit/PR:** commit tài liệu `docs: establish UniLost A0 baseline and session handoff` trên branch trên (tra bằng `git log -1` sau phiên); chưa push/PR. Không ghi SHA của chính commit vào nội dung commit để tránh tham chiếu vòng.
- **Chưa kiểm tra:** không chạy unit/typecheck/lint/build vì phiên chỉ sửa tài liệu, chưa cài `node_modules`; chưa xác minh DB Supabase thực tế hoặc runtime UI. Không xác nhận các lỗi SQL đã khai thác thành công trên production.

### Đầu vào A1a (đã thực hiện bên dưới)

1. Đọc plan, baseline R02/S06/S07, UC01 và issue #9/#11/#12; kiểm tra trạng thái branch và thay đổi người dùng trước khi làm.
2. Đọc các callers `lib/supabase.ts`, login/register/header và `app/chatgpt-auth.ts`; kiểm tra execution profile/Cloudflare trước khi chọn cơ chế callback/cookie. Chỉ sử dụng Supabase làm danh tính nghiệp vụ.
3. Cài bằng lockfile (`npm ci`), chạy baseline typecheck/lint/test/build và ghi kết quả thật; lỗi có sẵn phải phân biệt với lỗi do sửa.
4. Chốt một đầu ra: OTP login/callback/logout + phiên server đã xác thực, không thành công giả khi thiếu env, không open redirect. Tách UI đăng ký/profile sang A1b.
5. Viết test hồi quy cho thiếu cấu hình, return URL sai và phiên không hợp lệ; kiểm tra provider/callback thật trên Supabase test khi có cấu hình. Không yêu cầu người dùng gửi secret vào chat; không ghi secret ra log.
6. Chạy kiểm tra, cập nhật progress và ma trận, commit nhỏ. Nếu chưa có môi trường Supabase test thì ghi rõ phần integration chưa kiểm chứng; không ghi Auth đạt đầy đủ.

## Checkpoint A1a — 17/10/2026

- **Phạm vi / issue:** #9/#11, đối chiếu #12; OTP email PKCE, callback, logout phiên hiện tại và user server được Supabase xác thực. Đã đọc nội dung issue bằng GitHub CLI; không đóng issue/sửa Sheet.
- **Branch / base:** `codex/unilost-a1a-auth`, base A0 `4a4b25b`. Commit phiên dùng tiêu đề `feat: implement Supabase email auth and server sessions`; chưa push/PR.
- **Đầu ra:** browser dùng cookie SSR; callback `/auth/callback` đổi code và gọi `getUser`; helper server không nhận danh tính từ cookie user/header ChatGPT; proxy lưu token refresh cho request và response; logout bằng server action, không dùng GET. Trang login hiển thị user đã xác thực và nút logout; header/profile/guard nghiệp vụ để A1b.
- **Validation / lỗi:** thiếu env không báo gửi thành công; email sai/provider/mạng lỗi có thông báo; chặn submit lặp; form POST tránh email vào query khi chưa hydrate; return path chặn external/protocol-relative/backslash/control/encoded Auth loop. Callback lỗi không đưa chi tiết provider/token vào thông báo. Không cache phản hồi phiên/callback.
- **Dependency / cấu hình:** thêm `@supabase/ssr` 0.12.7 chính thức và lockfile, không tự viết bộ lưu/refresh cookie; bổ sung `.env.example` chỉ chứa tên biến rỗng. Không tạo `.env.local`, không đổi Supabase/schema/migration/dữ liệu thật. Cookie production có Secure, cần HTTPS.
- **Baseline trước sửa:** `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test` (4/4) và `npm run build` đều PASS. Môi trường Windows, Node 24.19.0, execution profile portable (Vinext/Cloudflare Vite).
- **Kiểm tra sau sửa:** typecheck, lint, unit test và build PASS; 56/56 test, gồm SDK thật với HTTP Auth mô phỏng cho PKCE, refresh token, logout và từ chối token sai. Proxy test kiểm tra forwarding cookie và cache header. Build sinh `dist/server/wrangler.json`; chưa deploy.
- **Smoke browser:** không env tại localhost:5173: lỗi cấu hình đúng, không sent, callback lỗi đúng, query trùng và error key lạ không làm trang lỗi. Auth HTTP mô phỏng loopback + app localhost:5174: gửi OTP có PKCE, callback 303 vào dashboard, login render đúng user, server-action logout 303 xóa session, code dùng lại lỗi và không đi sang domain ngoài. Không có lỗi console trình duyệt; dev server có cảnh báo dependency optimization và React nhiều renderer khi HMR. Đã dừng hai dev server và provider mô phỏng sau kiểm tra.
- **Minh chứng:** log/snapshot Playwright và tóm tắt ở `D:\Codex\outputs\unilost\a1a\`; provider mô phỏng tạm ở `D:\Codex\work\unilost\a1a\`, không thêm vào dependencies hay runtime ứng dụng.
- **Giới hạn:** chưa có env/tài khoản Supabase test; chưa gửi/nhận email thật, xác minh redirect allowlist/template/provider, thử cookie HTTPS/refresh trên Worker hoặc RLS thực tế. Không coi R02 hoặc #9/#11/#12 đã nghiệm thu toàn bộ.

### Phiên tiếp theo: A1b — Đăng ký, hồ sơ và bảo vệ thao tác

1. Đọc checkpoint này, R02/S07, UC01 và issue #9/#11/#12. Dùng `getSupabaseUser()` cho danh tính server; tái sử dụng client cookie hiện có.
2. Nối UI đăng ký/profile và trạng thái tài khoản trong header; xác định quyền từ dữ liệu server, không lấy role từ client/header ChatGPT.
3. Nối guard Supabase cho route/thao tác ghi của dashboard/posts/admin theo yêu cầu; không đồng nhất đăng nhập với quyền admin. Giữ các phần dữ liệu đang demo được ghi rõ.
4. Chuẩn bị tài khoản/fixture Auth-RLS test và chạy luồng email thật khi có project riêng; không yêu cầu gửi secret vào chat. Nếu chưa có cấu hình thì tiếp tục test mô phỏng, ghi phần integration còn thiếu.
5. Chạy kiểm tra, cập nhật ma trận/checkpoint và commit phiên. A2 chỉ bắt đầu khi đủ đầu vào DB test riêng.

### Đồng bộ GitHub sau A1a — 17/10/2026

- Đã push `codex/unilost-a1a-auth`; [PR #42](https://github.com/anhpd-glinteco/unilost/pull/42) mở vào `main`, gồm A0 và A1a. Commit code `efaeabe`; chưa merge/deploy. [CI web](https://github.com/anhpd-glinteco/unilost/actions/runs/39022510996) PASS trên GitHub, gồm install/typecheck/lint/56 test/build.
- **Đã đóng #7:** hoàn tất rà soát schema/RLS/Auth/Storage và ghi rủi ro A0. Sửa quyền và test DB thật tiếp tục ở #36/A2, #14/B1, #26–#28/A5–A9; đóng audit không đồng nghĩa đã khắc phục rủi ro.
- **Đã đóng #10:** hoàn tất ma trận yêu cầu, kế hoạch kiểm thử và bàn giao A0. Test tích hợp, E2E và báo cáo cuối vẫn ở #12/#28/#37/#41.
- **Giữ mở #6/#8:** đã có rà soát UI/UC01–UC08; còn khóa hợp đồng quyền/trạng thái sau đối chiếu A2/A3 ở A4. **Giữ mở #9/#11/#12:** A1a có code/test, còn A1b, tài khoản Supabase test và kiểm tra Auth/RLS thật. Đã thêm checklist, minh chứng và phiên kế tiếp vào cả 7 issue #6–#12.
- Đã đọc lại Sheet bằng connector, không sửa: tab `Kế hoạch` (`gid=274651441`) hiện có header hàng 8, Tuần 1 hàng 9, Tuần 2 hàng 10. Số dòng trong issue/kế hoạch cũ đã lệch; tra theo tuần/tên đầu việc và URL, không xem số dòng cũ hoặc phần trăm Sheet là bằng chứng nghiệm thu. Các số issue mở trong A0 là snapshot lịch sử.
- Phiên sau bắt đầu **A1b**, tái sử dụng A1a và kiểm tra trạng thái PR/issue mới nhất; không làm lại #7/#10. Khi checkout `main`, lưu ý PR #42 chưa merge nên tài liệu/code mới vẫn cần đọc từ nhánh/PR.

## Checkpoint A1b — 17/10/2026

- **Phạm vi / issue:** #9/#11/#12; đăng ký OTP tên/email, hồ sơ chỉ đọc, header phiên desktop/mobile và guard server. Theo lựa chọn người dùng, sửa hồ sơ và khóa role DB để A2; không thêm dependency/schema/migration.
- **Branch / base:** `codex/unilost-a1b-profile`, base `0787480`; commit `86030b7`. PR [#43](https://github.com/anhpd-glinteco/unilost/pull/43) mở vào `codex/unilost-a1a-auth` để xếp lớp trên [PR #42](https://github.com/anhpd-glinteco/unilost/pull/42); CI web PASS. Không merge/deploy hay sửa Sheet.
- **Đầu ra:** tái sử dụng form/link OTP A1a, tên trim 1–100 ký tự gửi trong metadata `full_name` cho trigger hiện hữu; email cũ dùng luồng login, không sửa profile. Chỉ báo gửi email, callback PKCE + getUser mới tạo phiên xác thực. Giữ safe next qua login/register.
- **Profile / quyền:** lấy ID từ `getSupabaseUser()`, query profile theo ID và kiểm tra dữ liệu trước hiển thị tên/khoa/ngày tham gia. Thiếu/lỗi profile có thông báo, không dùng người demo. Header server không lấy role từ metadata/header ChatGPT; mobile chỉ giữ trạng thái menu. Bốn route `/dashboard`, `/dashboard/claims`, `/posts/new`, `/admin` có guard; khách redirect login với next an toàn, member/thiếu/lỗi profile bị 404 admin.
- **Demo:** dashboard/claim/admin ghi rõ dữ liệu minh họa; form tin/upload, nút claim/moderation/cập nhật hồ sơ bị khóa; bỏ màn hình lưu tin thành công và tuyên bố audit giả. Chưa có mutation tin/claim/profile.
- **Kiểm chứng:** unit test 76/76, typecheck, lint và build portable Vinext/Cloudflare PASS. Fixture Auth/profile nằm trong tests; provider HTTP mô phỏng local dùng SDK thật, kiểm tra PKCE, metadata tên, hai submit chỉ một OTP, profile DB, role giả metadata, thiếu/lỗi profile, guest/member/admin, logout mobile, callback dùng lại và thiếu env. Viewport 390px không tràn ngang; guest desktop/mobile có login/register. Các request 404 admin là kết quả kiểm tra mong đợi, không có JS exception trong smoke đã đạt. Dev server có cảnh báo dependency optimization/HMR renderer; không đổi toolchain.
- **Minh chứng:** `D:\Codex\outputs\unilost\a1b\`; mock HTTP tại `D:\Codex\work\unilost\a1b\mock-auth.mjs`, chỉ bind loopback và dùng dữ liệu giả. Đã dừng server/provider test. Hướng dẫn tài khoản test thật ở `tests/README.md`.
- **Issue:** đã đóng #9 sau khi PR #43 có CI PASS; phạm vi giao diện đăng ký/session/profile hoàn tất. #11 và #12 vẫn mở do actor/mutation, email thật, trigger và RLS/API chưa xác minh. Policy tự sửa role còn S01/A2; guard ứng dụng chưa phải sửa quyền DB. Form cần JS; smoke cold-start trước hydration gặp POST tải lại trang, kiểm tra sau hydration đạt và email không vào query. Không coi R02/#9/#11/#12 đã nghiệm thu toàn bộ.

### Đồng bộ GitHub sau A1b — 17/10/2026

- Đã push nhánh `codex/unilost-a1b-profile`, mở [PR #43](https://github.com/anhpd-glinteco/unilost/pull/43) vào nhánh A1a. CI web PASS: install, typecheck, lint, unit test và build. PR #43 chưa merge; PR #42 vẫn OPEN.
- Đã đóng #9 khi phần UI đăng nhập/đăng ký, trạng thái phiên, header tài khoản và kiểm tra truy cập hoàn tất, có PR và CI. Phần email thật/provider và RLS không đánh dấu đã xác minh.
- Giữ mở #11/#12: còn hoàn thiện actor/mutation/quyền DB, project test riêng, callback/email thật và kiểm tra API/RLS trực tiếp.

### Phiên tiếp theo: A2 — Khóa quyền DB và chuẩn bị sửa hồ sơ

1. Đọc checkpoint A1b, S01–S05 và issue #36/#12; xác nhận project DB test riêng trước khi thay đổi dữ liệu/quyền.
2. Tạo tài khoản/fixture theo `tests/README.md`; xác minh email, trigger tạo profile và default role user trên provider thật, giữ secret ngoài Git/chat.
3. Thêm migration bổ sung khóa cập nhật role và trường hệ thống; không sửa migration đã áp dụng. Test REST trực tiếp với khách/thành viên/người lạ/admin, gồm tự nâng role.
4. Sau khi quyền cột/DB an toàn mới nối sửa tên/khoa; server lấy ID và whitelist trường, không nhận role từ client.
5. Chạy test DB/quyền và kiểm tra ứng dụng, cập nhật ma trận/bàn giao. Không bắt đầu mutation tin/claim trước khi đủ cổng quyền A2.

## Checkpoint A2 (code chuẩn bị; chưa nghiệm thu DB thật) — 17/10/2026

- **Phạm vi / issue:** #36/#12, tiếp nối #11; migration quyền nền và sửa hồ sơ. Người dùng bổ sung yêu cầu tạo môi trường test. Sau làm rõ, chưa có project Supabase test thực tế; lựa chọn “đã có project” ở bước kế hoạch là hiểu nhầm, không phải bằng chứng cấu hình đã tồn tại.
- **Branch / base:** `codex/unilost-a2-permissions`, base `1debebd` từ A1b. Thay đổi đang ở working tree, chưa commit/push/PR; không merge/deploy, đóng issue hay sửa Sheet.
- **Migration:** thêm `0002_a2_permissions.sql`, không sửa 0001. Thu hồi quyền ghi bảng và cột từ PUBLIC/anon/authenticated, chỉ cấp UPDATE tên/khoa hồ sơ; giữ self-only RLS và trigger. Khóa ghi tin/claim/ảnh/history/moderation cho cả admin ứng dụng; bỏ policy upload cũ và thêm policy restrictive theo bucket để khóa cả insert/update/delete Storage. Không thay policy đọc hoặc bucket public, không xóa dữ liệu.
- **Hồ sơ:** server action lấy user đã xác minh, whitelist tên/khoa, trim/giới hạn 100 ký tự và lưu khoa rỗng thành null. Lỗi Auth/DB/thiếu hàng/sai hàng không báo thành công; chỉ xác nhận khi DB trả đúng ID và giá trị. Form có label, pending, giữ input khi lỗi, không hiển thị success cũ khi sửa tiếp; revalidate layout cập nhật header/dashboard. Không thêm endpoint/dependency ứng dụng/service key.
- **Cổng quyền:** `SUPABASE_PROFILE_EDIT_ENABLED=false` mặc định ở `.env.example`; UI và action cùng kiểm tra cờ phía server. Chỉ bật sau khi project tương ứng đạt migration/SQL/API/email thật. Cờ local trong Worker cần `.env.local`, biến shell riêng không được chuyển tự động. Phiên smoke dùng cấu hình giả tạm, đã xóa file này sau kiểm tra; không tạo cấu hình thật.
- **Bộ test / môi trường:** có SQL preflight đọc schema/grants/policies/trigger, SQL assertions và `npm run test:db`. Runner chỉ nhận biến `SUPABASE_TEST_*` với URL khớp ref rõ ràng; tạo ba Auth user giả, test metadata/default role, profile và ghi REST/Storage qua từng actor, xác nhận dữ liệu trước/sau rồi dọn đúng UUID/path. Service key chỉ dùng fixture/readback, không vào app. Runner không gửi email, không thay kiểm tra PKCE.
- **Baseline:** trước sửa, 76/76 unit test, typecheck và lint PASS. Sau sửa: **107/107 unit test**, typecheck, lint (không warning) và build portable Vinext/Cloudflare PASS; log tại `D:\Codex\outputs\unilost\a2\`. `npm run test:db` dừng đúng tại bước thiếu project ref, không kết nối hay tạo fixture từ xa.
- **SQL cục bộ:** PGlite PostgreSQL đặt ngoài repo tại `D:\Codex\work\unilost\a2\sql-runtime`; chạy migration thật trên schema Auth/Storage mô phỏng. **77 kiểm tra PASS**, phát hiện baseline 0001 không an toàn, chống grant cột kế thừa PUBLIC, role/id/ngày tạo không sửa được, member/admin chỉ sửa tên/khoa của mình, ghi bảng khác bị chặn, restrictive bucket chống cả policy permissive bổ sung; dữ liệu tin có sẵn được giữ nguyên. Đây không phải Supabase test project hay bằng chứng API/Storage/provider thật. Script tái chạy `verify-sql.mjs` và log `sql-checks.log` nằm ngoài Git.
- **Smoke:** provider HTTP giả ở loopback 54330, app 5175; SDK thật đổi PKCE code giả rồi vào dashboard. Desktop 1101×884 DPR 1 và mobile 390×844 DPR 1 không tràn ngang; tên/khoa/khoa rỗng, header desktop/menu mobile cập nhật, double-click chỉ một PATCH, DB lỗi không báo thành công và giữ input, cờ false không render form. Không có browser JS error trong smoke; dev server có warning optimizer/HMR nhiều renderer như phiên trước. Hai server đã dừng, cổng đã đóng.
- **Kết nối còn thiếu:** tìm thấy tích hợp Supabase nhưng chưa cài/kết nối. Dashboard trên trình duyệt cũng chuyển tới đăng nhập; đã để trang đó cho người dùng tiếp tục. Chưa tạo project, chưa đọc schema/grants từ xa, chưa áp dụng migration, chưa chạy runner với API thật hoặc gửi/nhận email. Docker CLI có nhưng daemon chưa chạy; không tự khởi động hay tải stack Supabase nặng.
- **Bàn giao / rủi ro:** [supabase-test.md](supabase-test.md) ghi rõ tạo project Free riêng, preflight, migration, cấu hình local và thứ tự mở form. A2 còn **chưa nghiệm thu**; giữ #12/#36 mở và hồ sơ chỉ đọc. Ảnh public S05 và workflow/transaction claim vẫn là phần sau. Không dùng test mô phỏng để mở mutation tin/claim hoặc ghi DB đã an toàn.

### Cập nhật kết nối A2 — 17/10/2026

- Người dùng đã đăng nhập Dashboard Supabase; xác nhận tổ chức duy nhất `New generation of Frontend` gói Free. Đã chuẩn bị form project `unilost-a2-test`, vùng Singapore. Chưa gửi form, chưa có project ref hay migration từ xa; bước đặt mật khẩu DB và gửi form được bàn giao người dùng theo quy tắc thao tác trình duyệt với thông tin đăng nhập mới.

### Cập nhật A2 hosted và smoke thật — 17/10/2026

- **Project:** người dùng đã tạo `unilost-a2-test`, ref `lsaukzzmwbsztnlcrdpk`, Free/Tokyo. Preflight xác nhận public tables/Auth users/buckets đều 0, chưa có bảng migration history; anon/authenticated không superuser hoặc bypass RLS, service_role có bypass RLS.
- **Áp dụng:** bootstrap 0001 và quyền 0002 trong cùng transaction qua SQL Editor, không có khoảng quyền rộng đã commit. Lưu snippet bootstrap `d9bba531-27ef-4dba-af34-5c03534b5d6f` và assertions `14aef79e-a941-438d-a179-b4c8440ac7d6`. Chưa tạo lịch sử CLI tự động; không tuyên bố `supabase db push` đã chạy. Khi chuyển sang CLI cần đối chiếu schema và repair history theo nguồn, không chạy lại 0001 lên schema đã có.
- **Đối chiếu schema:** phát hiện thao tác chuyển SQL vào editor bỏ sót ON DELETE CASCADE cho claim/history/moderation → sửa ba constraint trên project test cho khớp 0001, xác nhận định nghĩa sau sửa. Không sửa migration gốc, không xóa dữ liệu; đã cập nhật bản bootstrap đã lưu cho khớp nguồn để tránh sao chép lại FK sai. Thêm kiểm tra năm FK cascade vào SQL assertions để bắt lại sai lệch bootstrap này. Query sửa/đối chiếu `49c403f6-d3fd-4555-9875-c85ab2c67a31`; bộ assertions cuối đã lưu ở `7fb76b9a-cd6e-4988-b065-b82459f7e1b6`, gồm cả kiểm tra năm FK cascade và 77 kiểm tra actor, PASS sau sửa.
- **SQL hosted:** assertions bảng/cột/RLS/policy Storage PASS; thêm `supabase/tests/a2_rls.sql`, **77 kiểm tra actor/trigger PASS** (snippet `a3e6e080-5357-4f74-9887-cfa5a9c1d131`). Fixture và policy test đều rollback. Storage hosted có guard `storage.protect_delete()` trả 42501 cho SQL DELETE, test nhận diện guard mà không tắt nó; file thật được kiểm tra riêng qua Storage API.
- **REST/Storage thật:** người dùng lưu public/secret key ở file local ngoài repo. Runner dùng SDK/API thật đạt **113 kiểm tra** và dọn đúng toàn bộ UUID/path tự tạo; chạy lại sau sửa FK cũng PASS. Khách/member/stranger/admin không sửa role/ID/ngày tạo, không ghi tin/claim/bảng hệ thống hay upload/overwrite/delete file; dữ liệu readback giữ nguyên. Member/admin chỉ sửa tên/khoa của mình; metadata role admin không cấp quyền. Không log secret; service key không đi vào ứng dụng.
- **Email/Auth:** đã cấu hình Site URL `http://localhost:5173`, allowlist `http://localhost:5173/auth/callback**`. Hộp thư test thứ nhất nhận email thật, trigger tạo đúng profile/role user. Link đầu trả trạng thái đã dùng/hết hạn, chưa tạo session; link đăng nhập mới được mở bằng click trong cùng phiên trình duyệt, PKCE callback vào dashboard thành công và hồ sơ được giữ nguyên. Không quy kết nguyên nhân link đầu khi chưa có bằng chứng. Gmail connector chỉ đọc đúng thư xác thực của project; không lưu link/token vào repo hoặc báo cáo, file link tạm đã xóa.
- **Form/guard thật:** bật `SUPABASE_PROFILE_EDIT_ENABLED=true` chỉ trong `.env.local` của project test đã kiểm chứng; template vẫn false. Desktop/mobile lưu tên/khoa, khoa null, header/menu cập nhật và DB readback role vẫn user; double-click chỉ một POST lưu. Member vào admin nhận 404, logout thật thành công và khách vào dashboard redirect login với next an toàn. Tài khoản email test được giữ để sử dụng tiếp; runner chỉ xóa các account giả tự tạo.
- **Mobile/ổn định:** phát hiện tên 100 ký tự làm scrollWidth 1283 ở viewport 390×844 DPR1; sửa min-width grid/flex và xuống dòng, sau sửa tên/khoa 100 ký tự có scrollWidth 375, không tràn ngang. Form đồng bộ input với dữ liệu vừa lưu và giữ thông báo lỗi an toàn khi transport hỏng. Dev/HMR có warning optimizer/multiple-renderer; thao tác quá sớm trước hydration có thể tải lại trang như A1b, không coi lần đó là smoke UI sau hydration đạt.
- **Còn thiếu:** hộp thư thứ hai chưa nghiệm thu vì provider trả **429 `over_email_send_rate_limit`**. Chỉ log tạm status/code để xác định lỗi, đã bỏ logging và khôi phục `lib/auth/login.ts`. Không gửi tiếp, không tắt giới hạn hoặc dùng admin-confirm để giả bằng chứng email. Chưa kiểm tra HTTPS/Worker; #12/#36 vẫn mở, A2 chưa nghiệm thu trọn phạm vi email.
- **Kiểm tra cuối:** 107 unit test PASS với một worker, typecheck/lint/build PASS. Một lần chạy nhiều tiến trình gặp OOM của máy; dừng dev/helper và chạy tuần tự khắc phục được, không đổi test config/toolchain. Build không chứa service key. Minh chứng ở `D:\Codex\outputs\unilost\a2\`; cấu hình test ở `D:\Codex\work\unilost\a2\supabase-test.env`, chỉ public key có trong `.env.local` bị ignore. Không commit/push/merge/deploy hay đóng issue.

### Tiếp tục phần còn lại A2

1. Chờ hạn mức email phục hồi hoặc cấu hình SMTP test phù hợp; dùng đúng hộp thư thứ hai người dùng đã cung cấp (địa chỉ không ghi vào Git). Gửi OTP qua UI sau hydration, mở link bằng click trong cùng trình duyệt, xác minh callback/profile/default role và đăng nhập lại giữ hồ sơ. Không nhập link/mã vào chat.
2. Kiểm tra HTTPS/Worker trên môi trường test khi có URL; không dùng kết quả localhost để tuyên bố cookie production đã đạt. Giữ production gate tắt.
3. Cập nhật minh chứng và tiêu chí còn lại #12/#36; không tự đóng issue hay bắt đầu mutation tin/claim khi chưa đủ cổng nghiệm thu.

## Mẫu checkpoint cho phiên sau

- Phiên / ngày / phạm vi / issue:
- Branch / base / commit / PR:
- Đầu ra và tiêu chí đạt:
- Quyết định khác kế hoạch và lý do:
- Lệnh kiểm tra / kết quả / môi trường / minh chứng:
- Thay đổi dữ liệu / migration / cấu hình:
- Chưa làm / rủi ro / điều kiện còn thiếu:
- Phiên tiếp theo và đầu vào cần đọc:

### Công bố A2 — 17/10/2026

- Đã commit code `030f9a9`, push `codex/unilost-a2-permissions` và mở [PR #44](https://github.com/anhpd-glinteco/unilost/pull/44), base `codex/unilost-a1b-profile` (PR #43). Các ghi chú “chưa commit/push/PR” ở checkpoint trước là lịch sử trước công bố.
- Hoàn tất phạm vi code khóa quyền và form hồ sơ, 107 unit test/113 API checks thật; CI của PR được theo dõi trực tiếp trên GitHub. Minh chứng chi tiết trong `D:\Codex\outputs\unilost\a2\verification.md`.
- Không đóng #11/#12/#36: còn hợp đồng/workflow ghi tin/claim, email thứ hai bị giới hạn provider và kiểm tra HTTPS/Worker. Không ghi 100% tiến độ hoặc đóng issue rộng chỉ vì phần A2 đã có code và test. Không merge/deploy; production gate vẫn tắt.
