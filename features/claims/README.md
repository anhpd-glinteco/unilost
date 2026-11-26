# Hợp đồng claim — A4

Chốt ngày 18/10/2026 cho #8, #11, #27. Đây là **thiết kế mục tiêu** cho A5–A7, chưa phải luồng claim đã triển khai. [Kế hoạch](../../docs/plan.md), [use case UC04–UC07](../../docs/report/use-cases.md) và [checkpoint](../../docs/progress.md) theo dõi phạm vi và bằng chứng thực tế.

## Danh tính, input và điều kiện tạo

- Server lấy người gửi từ Supabase Auth đã xác thực và vai trò từ dữ liệu được bảo vệ; không tin requester, role hoặc chủ tin do client gửi. Header ChatGPT không thay thế danh tính Supabase.
- Chỉ tạo claim cho tin `found`, `published`, `deleted_at is null`, trạng thái `searching` hoặc `matched`; người gửi không được là chủ tin. Kiểm tra lại điều kiện tại thời điểm ghi, không chỉ khi mở trang.
- Mỗi cặp `post_id/requester_id` có tối đa một claim trong MVP, kể cả sau `cancelled` hoặc `rejected`; không xóa claim để gửi lại. Kết quả gửi chưa rõ do mất mạng phải được đối chiếu, không tự tạo claim mới.
- Dùng `claimSchema` và kiểu suy luận `ClaimInput` từ [validation](../../lib/validation.ts): trim đầu/cuối proof rồi kiểm tra 10–1.000 ký tự; lưu giá trị đã parse, giữ khoảng trắng bên trong. Độ dài theo chuỗi JavaScript/Zod hiện có, không đếm grapheme. ID tin/claim phải được kiểm tra ở trust boundary khi A6/A7 triển khai giao diện ghi.
- Tái sử dụng `ClaimStatus` trong [domain types](../../lib/types.ts): `pending`, `accepted`, `rejected`, `cancelled`, `completed`. A4 không định nghĩa API/RPC hoặc kiểu payload riêng cho luồng chưa triển khai.

## Ma trận quyền mục tiêu

| Thao tác | Khách / người ngoài | Người gửi claim | Chủ tin | Admin |
| --- | --- | --- | --- | --- |
| Tạo claim | Khách: không; thành viên: chỉ khi đủ điều kiện tạo | Theo điều kiện tạo, không tạo trùng | Không tự claim | Theo điều kiện tạo như thành viên |
| Đọc claim và proof | Không | Claim của mình | Claim trên tin của mình | Có, phục vụ kiểm duyệt |
| Hủy pending | Không | Claim của mình | Không | Chỉ khi chính là người gửi |
| Chấp nhận / từ chối pending | Không | Không | Claim trên tin của mình | Chỉ khi chính là chủ tin |
| Hoàn trả accepted (C1) | Không | Không | Claim trên tin của mình | Chỉ khi chính là chủ tin |

Vai trò người gửi/chủ tin xét theo từng đối tượng. Quyền admin chỉ bổ sung đọc để kiểm duyệt, không quyết định thay chủ tin. Quyền đọc claim/proof của các bên liên quan không phụ thuộc tin còn công khai hay còn mở; không suy từ quyền xem trang chi tiết tin ra quyền đọc claim. Proof không được xuất hiện trong listing/payload công khai, log hoặc minh chứng chứa dữ liệu thật.

## Chuyển trạng thái và giao dịch

| Thao tác | Chuyển trạng thái | Điều kiện và hiệu ứng |
| --- | --- | --- |
| Tạo (A6) | Chưa có → `pending` | Đủ điều kiện tạo ở trên; không đổi trạng thái tin |
| Hủy (A6) | `pending` → `cancelled` | Đúng người gửi; không yêu cầu tin còn công khai/còn mở |
| Từ chối (A7) | `pending` → `rejected` | Đúng chủ tin; không yêu cầu tin còn công khai/còn mở |
| Chấp nhận (A7) | `pending` → `accepted`; tin → `verifying` | Đúng chủ tin; tin found/published/chưa xóa/searching hoặc matched; chưa có accepted/completed |
| Hoàn trả (C1) | `accepted` → `completed`; tin `verifying` → `returned` | Đúng chủ tin; cùng giao dịch với lịch sử |

- Chấp nhận phải khóa hàng tin, đọc lại quyền/điều kiện và trạng thái claim trong giao dịch; cập nhật claim, tin và `status_history` cùng commit hoặc cùng rollback. DB phải bảo đảm tối đa một claim `accepted`/`completed` trên một tin; hai lần accept cạnh tranh chỉ một thành công.
- Hủy/từ chối phải kiểm tra pending tại thời điểm ghi. Thao tác lặp hoặc claim đã xử lý bị từ chối và đọc lại trạng thái mới; không tạo thêm lịch sử hoặc ghi dở.
- Mọi thao tác trên một claim giữ nguyên claim khác. Sau accepted, các claim khác vẫn pending nhưng không được accepted tiếp vì tin đã verifying; người gửi vẫn có thể hủy và chủ tin vẫn có thể từ chối chúng.
- Không mở chuyển trạng thái ngược từ accepted, gửi lại sau hủy/từ chối, hay tự đổi matched bằng matching. Quy tắc sửa/đóng tin ở B1 và hoàn trả ở C1 nằm ngoài A4.

## Đối chiếu DB và phần còn thiếu

| Nguồn hiện tại | Đã có trong mã migration | Còn phải triển khai / nghiệm thu |
| --- | --- | --- |
| [0001](../../supabase/migrations/0001_initial.sql) | Enum claim khớp `ClaimStatus`; default pending; unique(post_id, requester_id); policy SELECT cho requester/chủ tin/admin | A5 kiểm tra quyền đọc proof qua API trực tiếp, kể cả tin ẩn/đã xóa; không suy ra đã nghiệm thu từ policy |
| [0002](../../supabase/migrations/0002_a2_permissions.sql) | Thu hồi quyền ghi bảng và cột claim của public/anon/authenticated, gồm tài khoản admin ứng dụng | Policy INSERT/UPDATE cũ còn tồn tại nhưng không tự cấp lại quyền ghi; A6/A7 phải mở đúng đường ghi được bảo vệ |
| [0003](../../supabase/migrations/0003_a3a_create_found_posts.sql) | Chỉ mở tạo tin found, không mở ghi claim | A6: tạo/hủy, validation tại DB và chống trùng; A7: quyết định nguyên tử, khóa tin, ràng buộc một accepted/completed và lịch sử |

Unique theo người/tin chưa bảo đảm một accepted/completed trên toàn tin. Hiện chưa có ràng buộc đó hoặc quy trình quyết định nguyên tử. Validation TypeScript không bảo vệ được API DB trực tiếp. A4 không sửa migration, grants, dữ liệu hosted, action, RPC hoặc UI.

## Tiêu chí nghiệm thu

- **A4:** test trim, proof toàn khoảng trắng, biên 9/10/1.000/1.001 sau trim, sai kiểu; unit/typecheck/lint/build đạt; tài liệu và liên kết nhất quán.
- **A5:** guest/người ngoài không đọc được claim/proof; requester/chủ tin/admin đọc đúng quyền qua API trực tiếp, gồm tin không công khai/đã xóa; listing và log không lộ proof.
- **A6:** chặn giả danh, tự claim, trùng, proof sai và tin không đủ điều kiện; tạo pending/hủy đúng quyền; hủy được pending khi tin đã ẩn/đóng/xóa; không gửi lại sau hủy/từ chối. Ghi trực tiếp không vượt quy trình.
- **A7:** chỉ chủ tin quyết định; từ chối pending được khi tin đã ẩn/đóng/xóa; accepted kiểm tra lại đủ điều kiện; hai accept cạnh tranh chỉ một thành công; accept/hủy cạnh tranh không ghi đè trạng thái; lỗi giữa giao dịch rollback claim/tin/lịch sử; giữ nguyên claim khác và xử lý thao tác lặp an toàn.

Các tiêu chí A5–A7 là đầu việc tương lai, không phải kết quả kiểm thử của A4. UI thật và E2E thuộc A8–A9; hoàn trả thuộc C1.

## Kiểm chứng A5 — 18/10/2026

- Runner `scripts/test-permissions.mjs` đã kiểm tra 100 lượt REST đọc claim/proof trên project Supabase test: guest/requester/owner/stranger/admin × published/pending/hidden/xóa mềm/closed × danh sách theo tin, hai ID claim và quan hệ lồng từ tin.
- Guest/người ngoài không đọc được claim; requester chỉ đọc claim của mình, không đọc claim khác cùng tin; owner/admin đọc cả hai. Quyền đọc trực tiếp vẫn giữ trên tin ẩn, đóng hoặc xóa mềm. Truy vấn lồng chỉ trả claim khi cả hàng tin và claim đều qua RLS; requester không xem được tin ẩn/xóa nhưng vẫn đọc trực tiếp claim của mình.
- Chính sách SELECT hiện tại đạt ma trận này, không cần migration hay thay grants. Các kiểm tra chống ghi trực tiếp vẫn giữ; A6/A7 chưa triển khai.
- Rà mã listing công khai: feed dùng mock posts; query chi tiết chỉ chọn trường tin, không lấy claim/proof; không có logging proof trong app. Trang dashboard claim vẫn là demo sau đăng nhập, chưa đọc claim thật. Đây chưa phải nghiệm thu UI riêng tư A8.
- Đã thử lỗi transport ở lượt đọc A5 đầu tiên: runner đi qua `finally`, readback sáu bảng không còn fixture và cả bốn Auth user đã bị xóa. Không in response/proof/token; minh chứng và script tái chạy ở `D:\Codex\outputs\unilost\a5\`.
