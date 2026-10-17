-- Read-only assertions; run after 0002, before the REST fixture runner.
begin;
do $$
declare
  table_name text;
  role_name text;
  operation text;
  column_name text;
  allowed boolean;
begin
  if (select count(*) from pg_constraint where connamespace = 'public'::regnamespace
      and conname in ('profiles_id_fkey', 'post_images_post_id_fkey', 'claim_requests_post_id_fkey',
        'status_history_post_id_fkey', 'moderation_actions_post_id_fkey') and confdeltype = 'c') <> 5 then
    raise exception 'Bootstrap foreign-key cascades differ from migration 0001';
  end if;
  foreach table_name in array array['profiles', 'posts', 'post_images', 'claim_requests', 'status_history', 'moderation_actions'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass) then
      raise exception 'RLS disabled: %', table_name;
    end if;
    foreach role_name in array array['anon', 'authenticated'] loop
      foreach operation in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(role_name, 'public.' || table_name, operation) then
          raise exception 'Unexpected table privilege: %.% %', role_name, table_name, operation;
        end if;
      end loop;
      for column_name in select attname from pg_attribute where attrelid = ('public.' || table_name)::regclass and attnum > 0 and not attisdropped loop
        foreach operation in array array['INSERT', 'UPDATE', 'REFERENCES'] loop
          allowed := role_name = 'authenticated' and table_name = 'profiles'
            and column_name in ('full_name', 'faculty') and operation = 'UPDATE';
          if has_column_privilege(role_name, 'public.' || table_name, column_name, operation) is distinct from allowed then
            raise exception 'Wrong column privilege: %.%.% %', role_name, table_name, column_name, operation;
          end if;
        end loop;
      end loop;
    end loop;
    foreach operation in array array['INSERT', 'UPDATE', 'DELETE'] loop
      if not has_table_privilege('service_role', 'public.' || table_name, operation) then
        raise exception 'Trusted fixture administration unavailable: % %', table_name, operation;
      end if;
    end loop;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'users upload own post images') then
    raise exception 'Old upload policy remains';
  end if;
  if (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('A2 blocks post image inserts', 'A2 blocks post image updates', 'A2 blocks post image deletes')
      and permissive = 'RESTRICTIVE' and roles = array['public']::name[]) <> 3 then
    raise exception 'Missing restrictive bucket write policies';
  end if;
end $$;
rollback;
