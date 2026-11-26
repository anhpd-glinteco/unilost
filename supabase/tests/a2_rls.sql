-- Transactional behavior checks on the dedicated test DB; all fixtures/DDL roll back.
begin;
create temporary table a2_actor_ids (member_id uuid, stranger_id uuid, admin_id uuid);
insert into a2_actor_ids values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
grant select on a2_actor_ids to anon, authenticated;
insert into auth.users (id, raw_user_meta_data)
select id, '{"full_name":"A2 SQL fixture","role":"admin"}'::jsonb
from a2_actor_ids cross join lateral unnest(array[member_id, stranger_id, admin_id]) as actor(id);

do $$
begin
  if (select count(*) from public.profiles where id in
      (select unnest(array[member_id, stranger_id, admin_id]) from a2_actor_ids)
      and role = 'user' and full_name = 'A2 SQL fixture') <> 3 then
    raise exception 'Auth trigger must create profiles with user role regardless of metadata';
  end if;
end $$;
update public.profiles set role = 'admin' where id = (select admin_id from a2_actor_ids);
insert into storage.objects (bucket_id, name)
select 'post-images', member_id::text || '/a2-sql-original.txt' from a2_actor_ids;
-- Even a future permissive policy must not bypass the A2 restrictive bucket rules.
create policy a2_test_permissive on storage.objects for all to authenticated using (true) with check (true);

create function pg_temp.a2_check_actor(actor_id uuid, other_id uuid) returns integer
language plpgsql security invoker as $$
declare
  checks integer := 0;
  affected integer;
  table_name text;
  statement text;
begin
  update public.profiles set full_name = 'A2 edited', faculty = null where id = actor_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Own profile update must affect one row'; end if;
  checks := checks + 1;
  update public.profiles set full_name = 'Forbidden other edit' where id = other_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Other profile must not change'; end if;
  checks := checks + 1;

  foreach statement in array array[
    format('update public.profiles set role = ''user'' where id = %L', actor_id),
    format('update public.profiles set id = gen_random_uuid() where id = %L', actor_id),
    format('update public.profiles set created_at = now() where id = %L', actor_id),
    'insert into public.profiles(id,full_name) values (gen_random_uuid(),''Injected'')',
    format('delete from public.profiles where id = %L', actor_id)
  ] loop
    begin
      execute statement;
      raise exception 'Forbidden profile mutation unexpectedly permitted';
    exception when insufficient_privilege then checks := checks + 1;
    end;
  end loop;

  foreach table_name in array array['posts','post_images','claim_requests','status_history','moderation_actions'] loop
    foreach statement in array array[
      format('insert into public.%I default values', table_name),
      format('update public.%I set id = gen_random_uuid()', table_name),
      format('delete from public.%I', table_name)
    ] loop
      begin
        execute statement;
        raise exception 'Forbidden table mutation unexpectedly permitted';
      exception when insufficient_privilege then checks := checks + 1;
      end;
    end loop;
  end loop;
  begin
    insert into storage.objects(bucket_id,name) values ('post-images',actor_id::text || '/a2-sql-injected.txt');
    raise exception 'Forbidden upload metadata unexpectedly permitted';
  exception when insufficient_privilege then checks := checks + 1;
  end;
  update storage.objects set name = actor_id::text || '/a2-sql-overwrite.txt' where bucket_id = 'post-images';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Storage metadata changed'; end if;
  checks := checks + 1;
  begin
    delete from storage.objects where bucket_id = 'post-images';
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Storage metadata deleted'; end if;
  exception when insufficient_privilege then
    -- Hosted Storage also rejects direct SQL DELETE before evaluating RLS.
    null;
  end;
  return checks + 1;
end $$;

create temporary table a2_results (actor text, checks integer);
grant insert on a2_results to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', member_id::text, true) from a2_actor_ids;
insert into a2_results select 'member', pg_temp.a2_check_actor(member_id, stranger_id) from a2_actor_ids;
select set_config('request.jwt.claim.sub', stranger_id::text, true) from a2_actor_ids;
insert into a2_results select 'stranger', pg_temp.a2_check_actor(stranger_id, member_id) from a2_actor_ids;
select set_config('request.jwt.claim.sub', admin_id::text, true) from a2_actor_ids;
insert into a2_results select 'admin', pg_temp.a2_check_actor(admin_id, member_id) from a2_actor_ids;
reset role;
set local role anon;
do $$
begin
  begin
    update public.profiles set full_name = 'Guest edit' where id = (select member_id from a2_actor_ids);
    raise exception 'Guest profile update unexpectedly permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
insert into a2_results values ('guest', 1), ('metadata/default role', 1);
do $$
begin
  if (select count(*) from public.profiles where id in
      (select unnest(array[member_id, stranger_id, admin_id]) from a2_actor_ids)
      and full_name = 'A2 edited' and faculty is null) <> 3 then
    raise exception 'Profile readback does not match expected edits';
  end if;
  if (select role from public.profiles where id = (select admin_id from a2_actor_ids)) <> 'admin'
    or exists (select 1 from public.profiles where id in (select unnest(array[member_id,stranger_id]) from a2_actor_ids) and role <> 'user') then
    raise exception 'Protected roles changed';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'post-images' and name like '%/a2-sql-%') <> 1 then
    raise exception 'Storage fixture readback failed';
  end if;
end $$;
select 'PASS' as result, sum(checks) as checks, 'Postgres Auth trigger + member/stranger/admin/guest behavior; fixtures rolled back' as coverage from a2_results;
rollback;
