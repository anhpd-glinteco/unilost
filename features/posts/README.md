# Posts feature

Đặt các UI component, query, action và validation riêng cho tin `lost`/`found` tại đây.

Quy ước:

- `components/`: UI theo nghiệp vụ bài đăng.
- `actions.ts`: mutation phía server, kiểm tra Auth/RLS trước khi ghi.
- `queries.ts`: đọc danh sách, chi tiết và filter.
- `schemas.ts`: schema Zod của feature.

## B1a — tạo tin lost

`createLostPost(previous, FormData)` dùng cùng `CreatePostState` và validation nội dung/ngày với `createFoundPost`. Mỗi action cố định loại tin phía server, lấy chủ tin từ phiên đã xác minh và chỉ ghi các trường nội dung cho phép. Không tự retry khi chưa xác nhận được kết quả ghi.

Migration `0007_b1a_create_lost_posts.sql` mở INSERT cho lost/found chính chủ với trạng thái searching/pending, chưa xóa; không mở UPDATE hoặc quyền Storage/claim. Áp dụng migration trước khi nối UI lost. UI hiện vẫn chỉ tạo found; sửa/đóng tin tiếp tục ở #49.
