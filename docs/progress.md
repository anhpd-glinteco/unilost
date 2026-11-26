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

## Mẫu checkpoint cho phiên sau

- Phiên / ngày / phạm vi / issue:
- Branch / base / commit / PR:
- Đầu ra và tiêu chí đạt:
- Quyết định khác kế hoạch và lý do:
- Lệnh kiểm tra / kết quả / môi trường / minh chứng:
- Thay đổi dữ liệu / migration / cấu hình:
- Chưa làm / rủi ro / điều kiện còn thiếu:
- Phiên tiếp theo và đầu vào cần đọc:
