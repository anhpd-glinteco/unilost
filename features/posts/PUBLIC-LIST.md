# #19 — danh sách và tìm kiếm thật

Người phụ trách: Vũ Minh Đức. Base 10fe6dbca9d09547532d8ae7f283220107e517aa / PR #64. Gói này nối /posts vào Supabase hiện có; không còn featuredPosts hoặc lọc toàn bộ mảng demo tại route này. Homepage/dashboard demo ngoài phạm vi vẫn giữ nguyên.

GET /posts nhận q, type=all|lost|found, category (chuỗi chính xác), sort=newest|oldest, page=1..999999. Mặc định q/category rỗng, all/newest/page 1. q trim tối đa 120 ký tự UTF-16, category tối đa 100; tham số lặp/sai giá trị trả thông báo và link đặt lại, không query DB. Tìm chuỗi con không phân biệt hoa thường trên title/description/location, giữ dấu tiếng Việt; %, _ và PostgREST quote/backslash được escape ở hai lớp. Không hỗ trợ full-text ranking hoặc tìm bỏ dấu.

Chỉ SELECT projection cần cho card và bắt buộc moderation=published/deleted_at IS NULL, kể cả khi owner/admin có RLS rộng hơn. Không chọn hoặc gửi owner/proof/metadata Storage cho listing. Hàng trả về được kiểm tra trước map. Không dùng service key. Lỗi DB/config/validation có error state, không fallback demo. Không cache dữ liệu giữa phiên.

Trang có 20 hàng, count exact trong cùng bộ lọc, thứ tự created_at rồi id cùng chiều để ổn định khi trùng thời gian. Form GET giữ state trên URL, thay filter tự về trang 1; link phân trang giữ filter. Đây là offset pagination, không snapshot: dữ liệu thêm/xóa giữa hai lần xem có thể dịch trang. q ILIKE và count exact có thể tốn chi phí khi bảng lớn; cần số đo trước khi đổi cursor/search index. #18 là tối ưu chỉ mục độc lập, không cần áp dụng migration đó để chức năng chạy đúng.

SearchShell giữ layout/card sẵn có và chuyển form sang submit GET; query DB chạy server. PostCard chỉ thu hẹp kiểu dữ liệu đầu vào xuống các trường nó thật sự hiển thị, các caller homepage/dashboard vẫn tương thích. Không thêm dependency/API mutation/migration/grant hoặc đổi flow claim.

Kiểm tra: npm test -- --maxWorkers=1 --no-file-parallelism; npm run typecheck; npm run lint; npm run build. Unit phủ parser, quyền/projection, escape, filter/order/page, private/malformed/error, SSR form/link/reset/empty và route thật. Browser dùng local dev + Supabase test với fixture riêng, kiểm tra page 1/2, tie-break, filter/sort, literal %, _, quotes, invalid/empty, mobile/desktop và owner/admin không thấy tin riêng trong public listing; kết quả thực tế được ghi riêng trong gói, không coi ma trận dự kiến là PASS.

Gói chờ thành viên review/commit/push/PR và CI; chưa hoàn thành tổng hợp Tuần 4, review độc lập hoặc production/hiệu năng hosted. Không chạy migration hoặc hosted writer chỉ để verify patch.
