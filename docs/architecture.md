# Kiến trúc UniLost

```text
app/                 Route và page của Next.js App Router
components/          UI dùng chung (header, card, search)
features/            Logic theo nghiệp vụ: posts, claims, admin
lib/                 Domain types, mock data, matching, validation, Supabase client
supabase/
  migrations/        Schema PostgreSQL, enum, index và RLS policies
  seed.sql            Hướng dẫn seed dữ liệu demo
tests/                Unit, component, E2E và fixtures
docs/                 Requirements, ADR, test/deployment docs
```

Luồng dữ liệu production: Browser → Next.js Server Actions/Route Handlers → Supabase Auth/Postgres/Storage. Môi trường chưa có credentials dùng `lib/mock-data.ts` chỉ cho preview, không phải nguồn dữ liệu production.
