# UniLost

Website hỗ trợ tìm kiếm đồ thất lạc trong khuôn viên trường.

## MVP

- Xem, tìm kiếm và lọc tin mất đồ/nhặt được.
- Đăng nhập, đăng và quản lý tin cá nhân.
- Gợi ý tin liên quan bằng thuật toán chấm điểm giải thích được.
- Gửi yêu cầu nhận đồ với thông tin xác minh riêng tư.
- Theo dõi trạng thái hoàn trả và dashboard kiểm duyệt cơ bản.

## Công nghệ

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/Storage, Zod, Vitest và Playwright.

## Chạy local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Không có credentials Supabase? UI sẽ dùng dữ liệu mẫu để trình diễn. Khi dùng dữ liệu thật, chạy migration trong `supabase/migrations` và cấu hình biến môi trường theo [hướng dẫn triển khai](docs/deployment.md).

## Cấu trúc

`app/` route và layout · `components/` UI · `lib/` domain logic, types và validation · `supabase/` migration/RLS/seed · `docs/` yêu cầu, ADR, test plan.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Git workflow

Dùng branch `feat/...`, `fix/...`, `docs/...`, `test/...`; PR nhỏ, ít nhất một reviewer và CI xanh trước khi squash merge vào `main`.

## Trách nhiệm và riêng tư

UniLost không nhận diện danh tính, không công khai bằng chứng xác minh và không lưu dữ liệu ngoài mục đích xử lý đồ thất lạc. Hãy chỉ tải lên hình ảnh bạn có quyền sử dụng.
