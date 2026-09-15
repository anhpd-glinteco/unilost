# ADR 0001: Supabase làm backend

## Quyết định

UniLost dùng Supabase PostgreSQL, Auth và Storage; các thao tác ghi được gọi qua server-side client/Route Handler và luôn được bảo vệ bởi RLS.

## Lý do

Giảm hạ tầng phải vận hành, phù hợp nhóm sinh viên và vẫn có schema, migration, audit trail và policy rõ ràng.

## Hệ quả

Môi trường local cần Supabase CLI hoặc project hosted. UI có mock fallback để xem demo khi chưa có credentials; dữ liệu thật không được lẫn vào mock production.
