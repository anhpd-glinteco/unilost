# Đặc tả use case UniLost

Phiên bản A0, cập nhật hợp đồng claim A4 ngày 18/10/2026. **Thiết kế mục tiêu**, chưa xác nhận triển khai; đối chiếu [baseline](../baseline.md) và [checkpoint](../progress.md) để biết trạng thái thật. Dùng chung cho #6/#8/#10; [hợp đồng claim A4](../../features/claims/README.md) là nguồn chi tiết về quyền, chuyển trạng thái và nghiệm thu trước mutation.

## Actor và quy tắc chung

- Khách: xem/tìm tin công khai; cần đăng nhập trước thao tác riêng tư/ghi.
- Thành viên: có các khả năng của khách, đăng/quản lý tin của mình; khi là người yêu cầu được gửi/xem/hủy claim; khi là chủ tin được xem/xử lý claim nhận vào và xác nhận hoàn trả.
- Admin: có khả năng thành viên, thêm kiểm duyệt và đọc claim phục vụ kiểm duyệt; không mặc định được quyết định nhận đồ thay chủ tin.
- Người yêu cầu và chủ tin là vai trò theo từng đối tượng, không phải quyền admin hay hai loại tài khoản riêng.

Sơ đồ: [Hình 2.1 — Use case tổng quan](diagrams/use-cases.puml).

## UC01 — Đăng nhập / quản lý phiên

- **Actor:** Khách/Thành viên. **Yêu cầu:** R02, #9/#11/#12.
- **Tiền điều kiện:** Supabase được cấu hình; email hợp lệ.
- **Luồng chính:** Nhập email → server/provider gửi link → mở callback → xác thực phiên → vào trang được phép; đăng xuất hủy phiên.
- **Ngoại lệ:** Thiếu env không báo gửi thành công; link sai/hết hạn, lỗi mạng/provider báo lỗi rõ; return URL chỉ nhận đường dẫn nội bộ an toàn.
- **Hậu điều kiện:** Phiên Supabase đã xác thực hoặc không có phiên khi lỗi/đăng xuất. Header ChatGPT không được dùng thay cho phiên này.

## UC02 — Đăng tin mất / nhặt được

- **Actor:** Thành viên. **Yêu cầu:** R04, #13–#16.
- **Tiền điều kiện:** Có phiên và profile hợp lệ.
- **Luồng chính:** Chọn lost/found → nhập mô tả, thời gian, địa điểm → tùy chọn ảnh → server validate và lấy owner từ phiên → lưu tin pending → phản hồi và hiển thị trong tin của mình.
- **Ngoại lệ:** Chưa login chuyển đăng nhập; input sai, file sai MIME/quá 5 MB, lỗi upload/DB phải thông báo và không báo thành công giả hoặc để mất kiểm soát tệp mồ côi.
- **Hậu điều kiện:** Tin thuộc người gửi; chưa tự công khai trước khi admin duyệt. Sửa/đóng tin chỉ chủ tin được phép theo trạng thái hợp lệ; server không cho sửa owner/moderation tùy ý.

## UC03 — Tìm và xem tin / gợi ý

- **Actor:** Khách/Thành viên. **Yêu cầu:** R05/R06, #17–#24.
- **Tiền điều kiện:** Không cần login để xem dữ liệu công khai.
- **Luồng chính:** Nhập từ khóa/bộ lọc → truy vấn tin published chưa xóa → sắp xếp/phân trang → xem chi tiết và gợi ý kèm lý do/điểm.
- **Ngoại lệ:** Không có kết quả hiển thị empty; lỗi truy vấn có phản hồi; ID không tồn tại/không được xem trả 404, không thay bằng bài đầu; không đưa proof vào dữ liệu công khai.
- **Hậu điều kiện:** Không đổi dữ liệu; tin ẩn/riêng tư không lộ cho người không có quyền.

## UC04 — Gửi và xem claim

- **Actor:** Thành viên với vai trò người yêu cầu. **Yêu cầu:** R07, #25–#28.
- **Tiền điều kiện:** Có phiên; tin found đã published, chưa xóa, đang searching/matched; không phải tin của mình; chưa có claim của người gửi trên tin này.
- **Luồng chính:** Mở chi tiết → nhập proof → server xác thực, kiểm tra tin, trim đầu/cuối proof rồi validate 10–1.000 ký tự → lưu proof đã parse trong claim pending → xem claim trong danh sách đã gửi.
- **Ngoại lệ:** Sai điều kiện/quyền, proof sai, tin đã đổi trạng thái, gửi trùng hoặc lỗi mạng/DB phải thất bại rõ ràng; không tạo bản ghi trùng. Không tự retry bằng cách tạo claim mới khi kết quả gửi chưa rõ.
- **Hậu điều kiện:** Một claim pending của đúng người gửi hoặc không thay đổi khi thất bại; proof chỉ người gửi, chủ tin và admin được đọc.

## UC05 — Hủy claim

- **Actor:** Người yêu cầu. **Yêu cầu:** R07, #25/#27/#28.
- **Tiền điều kiện:** Claim của chính mình và còn pending; không yêu cầu tin còn công khai hoặc còn mở.
- **Luồng chính:** Chọn hủy → server kiểm tra danh tính/trạng thái hiện tại → chuyển cancelled → cập nhật UI.
- **Ngoại lệ:** Claim đã được xử lý hoặc không thuộc mình: từ chối, lấy lại trạng thái mới; thao tác lặp không gây chuyển trạng thái ngoài quy tắc.
- **Hậu điều kiện:** Claim cancelled; không xóa bằng chứng/lịch sử; MVP chưa cho gửi lại sau hủy.

## UC06 — Chấp nhận / từ chối claim

- **Actor:** Chủ tin found. **Yêu cầu:** R08, #25–#28.
- **Tiền điều kiện:** Claim pending trên tin của mình. Accepted chỉ khi tin found/published/chưa xóa/searching hoặc matched và chưa có accepted/completed; rejected không yêu cầu tin còn công khai hoặc còn mở.
- **Luồng chính:** Xem danh sách nhận và proof → chọn chấp nhận/từ chối → server khóa tin và kiểm tra lại → giao dịch cập nhật claim; nếu accepted thì tin verifying và ghi lịch sử → commit → phản hồi UI.
- **Ngoại lệ:** Người ngoài/admin không phải chủ tin không được quyết định; conflict, claim đã kết thúc hay DB lỗi phải rollback, không ghi dở. Hai lần accept cạnh tranh chỉ một thành công.
- **Hậu điều kiện:** Pending → accepted/rejected. Các claim khác giữ pending, không được accepted tiếp sau khi tin verifying. MVP chưa cho gửi lại claim đã rejected.

## UC07 — Xác nhận hoàn trả

- **Actor:** Chủ giữ đồ/chủ tin found. **Yêu cầu:** R09, #29–#32; thực hiện C1.
- **Tiền điều kiện:** Có accepted claim, tin verifying, người thực hiện đúng chủ tin.
- **Luồng chính:** Xác nhận đã trả → server kiểm tra quyền/trạng thái → cùng giao dịch chuyển claim completed, tin returned, ghi lịch sử.
- **Ngoại lệ:** Không đủ quyền, trạng thái đã đổi hoặc lỗi ghi: từ chối/rollback, không tạo lịch sử giả.
- **Hậu điều kiện:** Đồ đã hoàn trả, không nhận claim mới hay accepted khác; audit phản ánh actor và thời điểm thật.

## UC08 — Kiểm duyệt

- **Actor:** Admin. **Yêu cầu:** R09, #29–#32; thực hiện C1.
- **Tiền điều kiện:** Vai trò admin xác thực từ dữ liệu được bảo vệ.
- **Luồng chính:** Xem tin pending/nội dung → xuất bản, ẩn hoặc khôi phục → server kiểm tra và lưu thay đổi cùng audit; đọc claim khi phục vụ kiểm duyệt.
- **Ngoại lệ:** Người thường gọi API trực tiếp bị chặn; thay đổi trạng thái hoặc lỗi ghi được phản hồi, không ghi audit thành công khi thao tác thất bại.
- **Hậu điều kiện:** Chỉ nội dung published chưa xóa mới hiển thị công khai; không tự đổi quyết định claim của chủ tin.

## Chuyển trạng thái và quyền mục tiêu

| Đối tượng | Chuyển trạng thái | Actor | Phiên |
| --- | --- | --- | --- |
| Claim | tạo → pending | Người yêu cầu hợp lệ | A6 |
| Claim | pending → cancelled | Người yêu cầu của claim | A6 |
| Claim | pending → accepted/rejected | Chủ tin | A7 |
| Tin | searching/matched → verifying | Giao dịch accepted của chủ tin | A7 |
| Claim + tin | accepted → completed; verifying → returned | Chủ tin, cùng giao dịch | C1 |
| Moderation | pending → published; published → hidden; hidden → published | Admin | C1 |

Enum `matched` đã có nhưng không mặc định thuật toán matching sẽ tự đổi trạng thái. Quy tắc sửa/đóng tin và ảnh hưởng tới pending claim phải được khóa ở B1/C1 trước khi viết mutation đó; không suy ra quyền chuyển trạng thái tùy ý từ enum.
