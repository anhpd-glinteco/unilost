# Kế hoạch thực hiện UniLost

Ngày chốt: 17/10/2026 (Asia/Saigon). Thực hiện: người dùng cùng Codex, tuần tự từng phiên nhỏ.

## Nguồn và mục tiêu

- [Kế hoạch nhóm](https://docs.google.com/spreadsheets/d/14VWv84b3aSMzJMCcpRAQL0RUEfYfeSGBguYJ93KyNB0/edit?gid=274651441#gid=274651441).
- [Issues](https://github.com/anhpd-glinteco/unilost/issues): 36 issue #6–#41 còn mở tại lần kiểm tra 17/10/2026.
- Tuần 6: 20–26/10/2026. Ưu tiên nền tảng tối thiểu → claim thật → phần tồn tuần 3–5 → tuần 7–9.
- Hiện trạng và rủi ro: [baseline](baseline.md). Bàn giao từng phiên: [progress](progress.md). Báo cáo: [hướng dẫn](report/README.md).

Không coi UI demo, phần trăm trong Sheet hoặc số commit là bằng chứng hoàn thành. Không triển khai AI/ML, realtime chat, SMS, GPS hay app mobile riêng trong MVP.

## Hợp đồng mỗi phiên

1. Đọc tài liệu này, checkpoint mới nhất, issue và code liên quan; kiểm tra branch và thay đổi đang có.
2. Chọn một đầu ra có thể kiểm chứng; chia phiên con trước khi sửa nếu có nhiều đầu ra độc lập.
3. Tái sử dụng cấu trúc hiện có; không đổi lịch sử migration đã áp dụng, không thêm abstraction/dependency không cần thiết.
4. Với code: test hành vi thay đổi, typecheck, lint; cuối chặng chạy toàn bộ unit test và build. Với tài liệu: kiểm tra nguồn, liên kết và sự nhất quán.
5. Commit nhỏ; lập PR khi có phần độc lập hoàn chỉnh. Không merge/deploy chỉ vì đã commit.
6. Ghi đầu ra, commit/PR, kiểm tra, dữ liệu thay đổi, tồn đọng và bước tiếp vào progress; không chứa secret/proof thật.

Giữ người phụ trách issue làm người rà soát: Phùng Đức Anh (frontend), Vũ Xuân Trường (dữ liệu), Vũ Minh Đức (nghiệp vụ), Hoàng Minh Nhật (kiểm thử/tài liệu); tuần 1 có phân công kết hợp theo issue. Không tự đóng issue hay sửa Sheet khi mới xong một phần.

## A — Nền tảng và tuần 6

| Phiên | Điều kiện đầu vào | Issue | Một đầu ra nghiệm thu |
| --- | --- | --- | --- |
| A0 | Đọc repo và nguồn kế hoạch | #6–#8, #10 | Baseline, ma trận yêu cầu, use case tổng quan và bàn giao; #6/#8 dùng chung đặc tả. |
| A1a | A0 | #9, #11 | Đăng nhập email/callback/đăng xuất Supabase và phiên server; không báo thành công khi thiếu cấu hình. |
| A1b | A1a | #9, #11, #12 | Đăng ký/hồ sơ, UI phiên và kiểm tra bảo vệ route/thao tác ghi; tài khoản/fixture test Auth. |
| A2 | A1b; DB test riêng | #36, #7, #12 | Migration bổ sung và test quyền nền: không tự nâng role, tự duyệt tin hay đổi trường nhạy cảm. |
| A3a | A2 | #15 | Tạo tin found thật bằng danh tính server và validation, mặc định pending. |
| A3b | A3a; tin test được admin xuất bản | #19 | Đọc chi tiết thật, 404 đúng, khách không thấy tin riêng/ẩn/xóa; không fallback ID sai về tin demo. |
| A4 | A0; đối chiếu A2/A3 | #8, #11, #27 | Khóa đặc tả claim, bảng quyền, chuyển trạng thái và types dùng chung trước mutation. |
| A5 | A2, A4 | #26 | Chính sách đọc proof và test API trực tiếp theo vai trò; không lộ trong listing công khai/log. |
| A6 | A3b, A5 | #27, #28 | Tạo/hủy claim đúng quyền, validation, chống trùng và tin không đủ điều kiện. |
| A7 | A6 | #27, #28 | Chấp nhận/từ chối nguyên tử, khóa tin, ràng buộc duy nhất và test cạnh tranh. |
| A8a | A6 | #25 | Form gửi claim trên chi tiết tin, trạng thái tải/lỗi/thành công và chống gửi lặp. |
| A8b | A7, A8a | #25 | Danh sách claim đã gửi/đã nhận riêng tư, trạng thái rỗng/lỗi/tải và đúng quyền. |
| A9a | A8b | #25 | Nút hủy/chấp nhận/từ chối nối server, cập nhật trạng thái và thông báo lỗi. |
| A9b | A9a | #25–#28 | E2E nhiều tài khoản, test RLS/cạnh tranh, bảng kết quả và minh chứng tuần 6. |

A4 có thể làm phần đặc tả sau A0 nhưng chỉ cập nhật hợp đồng code khi đã đối chiếu A2/A3. Chưa cần hoàn tất matching hoặc tối ưu feed trước claim.

### Quy tắc claim đã chọn

- Server lấy danh tính từ Supabase Auth đã xác thực; không nhận requester/role/chủ tin từ client. Header ChatGPT không thay thế danh tính Supabase.
- Chỉ claim tin found đã published, chưa xóa, còn mở (searching/matched); không tự claim. Proof 10–1.000 ký tự theo schema hiện có.
- Mỗi cặp tin/người gửi có một claim trong MVP; chưa gửi lại sau hủy/từ chối.
- Pending → accepted/rejected: chủ tin; pending → cancelled: người gửi. Admin đọc để kiểm duyệt, không quyết định thay chủ tin.
- Accepted đưa tin sang verifying; claim khác giữ pending nhưng không thể accepted tiếp. Hoàn trả/completed thuộc C1.
- DB bảo đảm tối đa một claim accepted/completed trên một tin; giao dịch khóa tin khi quyết định. Ghi trực tiếp không được vượt quy trình.
- Proof chỉ người gửi, chủ tin và admin được đọc; không đưa vào payload công khai, log hoặc minh chứng chứa dữ liệu thật.

## B/C — Phần tồn và bàn giao

Mỗi chặng có ba phiên nối tiếp: **dữ liệu/nghiệp vụ → UI → nghiệm thu**. Đầu phiên ghi phạm vi chi tiết và kiểm tra vào progress, không làm cả chặng trong một lần.

| Chặng | Điều kiện | Issue | Đầu ra |
| --- | --- | --- | --- |
| B1 | A2/A3 | #13–#16 | Đăng/sửa/đóng tin, ảnh, MIME/dung lượng, quyền sở hữu, xử lý upload lỗi. |
| B2 | B1 | #17–#20 | Feed, tìm kiếm/lọc/sắp xếp/phân trang thật; quyền xem, chỉ mục và seed. |
| B3 | B2 | #21–#24 | Ứng viên thật, điểm/lý do, test tiếng Việt/ngưỡng/thứ tự/biên. Giữ trọng số 35/20/20/15/10 và ngưỡng 25 hiện có trừ khi có căn cứ thay đổi. |
| C1 — W7, 27/10–02/11 | A9b, B1 | #29–#32 | Chủ giữ đồ hoàn trả: claim completed, tin returned, lịch sử cùng giao dịch; admin xuất bản/ẩn/khôi phục và audit. |
| C2 — W8, 03–09/11 | B3, C1 | #33–#35, #37 | Sửa tích hợp; a11y/mobile; seed/env; E2E, build Cloudflare và giới hạn thực tế. |
| C3 — W9, 10–16/11 | C2 | #38–#41 | Demo, deploy, smoke production, báo cáo DOCX/PDF và hướng dẫn bàn giao. |

PR dependency #1–#5 rà riêng, không trộn với claim/phân quyền. Đánh giá lại khả năng đạt hạn tuần 6 sau A0–A3; không hứa hoàn tất phần tồn theo lịch cũ khi chưa có kết quả test.

## Cổng nghiệm thu

- RLS: khách, người yêu cầu, chủ tin, người lạ, admin; giả danh, tự nâng role, đọc proof và sửa trạng thái qua API trực tiếp.
- Nghiệp vụ: tự claim, trùng, hủy/từ chối, thao tác lặp, tin ẩn/đóng/xóa; hai lần chấp nhận đồng thời chỉ một thành công, không ghi dở.
- E2E: login → tạo tin → duyệt → tìm → claim → xử lý → trả; nhánh hủy/từ chối/moderation.
- Báo cáo: yêu cầu → issue → code → test → minh chứng; phân biệt kết quả thực tế với thiết kế dự kiến.
- Chỉ đề xuất cập nhật Sheet sau khi có bằng chứng; đóng issue theo toàn bộ tiêu chí issue.
