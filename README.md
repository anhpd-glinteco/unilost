# UniLost

Repo nền tảng cho hệ thống hỗ trợ tìm kiếm đồ thất lạc trong khuôn viên trường.

> Trạng thái hiện tại: **scaffold + UI demo slice**. Schema, RLS và domain logic đã có; các mutation production sẽ được nối tiếp với Supabase project ở sprint kế tiếp.

## Cấu trúc thư mục

```text
.
├── app/                    # Route/page Next.js App Router
│   ├── auth/               # Đăng nhập, đăng ký
│   ├── dashboard/          # Bảng tin cá nhân, yêu cầu nhận đồ
│   ├── posts/              # Danh sách, chi tiết, form đăng tin
│   └── admin/              # Moderation dashboard
├── components/             # UI dùng chung và components theo trang
├── features/               # Logic chia theo nghiệp vụ
│   ├── posts/
│   ├── claims/
│   └── admin/
├── lib/                    # Types, mock data, matching, validation, Supabase client
├── supabase/
│   ├── migrations/         # PostgreSQL schema + RLS policies
│   └── seed.sql
├── tests/                  # Unit, component, E2E, fixtures
├── docs/                   # Requirements, architecture, ADR, test/deploy guides
├── .github/                # CI, Dependabot, PR/issue templates
└── public/                 # Favicon và static assets
```

Chi tiết trách nhiệm giữa các thư mục nằm trong [docs/architecture.md](docs/architecture.md).

## Phạm vi MVP

- Xem, tìm kiếm và lọc tin mất đồ/nhặt được.
- Auth email, đăng và quản lý tin cá nhân.
- Gợi ý tin liên quan bằng thuật toán chấm điểm giải thích được.
- Claim với thông tin xác minh riêng tư và quy trình hoàn trả.
- Dashboard kiểm duyệt cho admin.

Chưa làm trong MVP: chat realtime, AI/ML, SMS, GPS realtime và mobile app riêng.

## Công nghệ

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/Storage, Zod, Vitest và Playwright.

## Chạy local

```bash
npm ci
copy .env.example .env.local # PowerShell
npm run dev
```

Không có credentials Supabase, app sẽ hiển thị dữ liệu mẫu để xem UI. Khi có project thật, chạy migration trong `supabase/migrations` và cấu hình biến môi trường theo [docs/deployment.md](docs/deployment.md).

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Git workflow

Dùng branch `feat/...`, `fix/...`, `docs/...`, `test/...`; PR nhỏ, ít nhất một reviewer và CI xanh trước khi squash merge vào `main`.

## Riêng tư và trách nhiệm

UniLost không nhận diện danh tính, không công khai bằng chứng xác minh và chỉ lưu dữ liệu cho mục đích xử lý đồ thất lạc. Chỉ tải lên hình ảnh bạn có quyền sử dụng.
