-- Inspection only. Compare with 0001 and project migration history before applying 0002.
select rolname, rolsuper, rolbypassrls from pg_roles
where rolname in ('anon', 'authenticated', 'service_role');

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in
  ('profiles', 'posts', 'post_images', 'claim_requests', 'status_history', 'moderation_actions')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename, policyname;

select grantor, grantee, table_name, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and table_name in
  ('profiles', 'posts', 'post_images', 'claim_requests', 'status_history', 'moderation_actions')
order by table_name, grantee, privilege_type;

select grantee, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name in
  ('profiles', 'posts', 'post_images', 'claim_requests', 'status_history', 'moderation_actions')
order by table_name, grantee, column_name, privilege_type;

select n.nspname as schema_name, c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
  ('profiles', 'posts', 'post_images', 'claim_requests', 'status_history', 'moderation_actions');

select n.nspname, p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('is_admin', 'handle_new_user');

select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

select id, public from storage.buckets where id = 'post-images';
select to_regclass('supabase_migrations.schema_migrations') as migration_history_table;
-- If present, also inspect supabase_migrations.schema_migrations via the trusted SQL connection.
