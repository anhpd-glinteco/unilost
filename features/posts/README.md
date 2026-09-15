# Posts feature

Đặt các UI component, query, action và validation riêng cho tin `lost`/`found` tại đây.

Quy ước:

- `components/`: UI theo nghiệp vụ bài đăng.
- `actions.ts`: mutation phía server, kiểm tra Auth/RLS trước khi ghi.
- `queries.ts`: đọc danh sách, chi tiết và filter.
- `schemas.ts`: schema Zod của feature.
