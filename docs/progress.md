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

### Phiên tiếp theo: A1a — Auth và phiên server

1. Đọc plan, baseline R02/S06/S07, UC01 và issue #9/#11/#12; kiểm tra trạng thái branch và thay đổi người dùng trước khi làm.
2. Đọc các callers `lib/supabase.ts`, login/register/header và `app/chatgpt-auth.ts`; kiểm tra execution profile/Cloudflare trước khi chọn cơ chế callback/cookie. Chỉ sử dụng Supabase làm danh tính nghiệp vụ.
3. Cài bằng lockfile (`npm ci`), chạy baseline typecheck/lint/test/build và ghi kết quả thật; lỗi có sẵn phải phân biệt với lỗi do sửa.
4. Chốt một đầu ra: OTP login/callback/logout + phiên server đã xác thực, không thành công giả khi thiếu env, không open redirect. Tách UI đăng ký/profile sang A1b.
5. Viết test hồi quy cho thiếu cấu hình, return URL sai và phiên không hợp lệ; kiểm tra provider/callback thật trên Supabase test khi có cấu hình. Không yêu cầu người dùng gửi secret vào chat; không ghi secret ra log.
6. Chạy kiểm tra, cập nhật progress và ma trận, commit nhỏ. Nếu chưa có môi trường Supabase test thì ghi rõ phần integration chưa kiểm chứng; không ghi Auth đạt đầy đủ.

## Mẫu checkpoint cho phiên sau

- Phiên / ngày / phạm vi / issue:
- Branch / base / commit / PR:
- Đầu ra và tiêu chí đạt:
- Quyết định khác kế hoạch và lý do:
- Lệnh kiểm tra / kết quả / môi trường / minh chứng:
- Thay đổi dữ liệu / migration / cấu hình:
- Chưa làm / rủi ro / điều kiện còn thiếu:
- Phiên tiếp theo và đầu vào cần đọc:
