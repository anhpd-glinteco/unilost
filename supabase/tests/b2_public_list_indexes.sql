-- Run after 0010 against a disposable local database. Fixture DML always rolls back.
begin;
do $$
begin
  if (select count(*) from pg_index i join pg_class c on c.oid=i.indexrelid
      where c.relname in ('posts_public_created_id_idx','posts_public_type_category_created_id_idx')
        and c.relnamespace='public'::regnamespace and i.indisvalid and i.indisready) <> 2 then
    raise exception 'B2 public-list indexes missing or invalid';
  end if;
end $$;
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-4000-8000-000000000b20','{"full_name":"B2 synthetic index fixture"}');
insert into public.posts(id,owner_id,type,title,category,color,description,location,occurred_at,status,moderation,deleted_at,created_at)
select md5('b2-index-'||n)::uuid,'00000000-0000-4000-8000-000000000b20',
  (case when n%2=0 then 'lost' else 'found' end)::public.post_type,
  'B2 synthetic '||n, case when n%3=0 then 'keys' else 'other' end,'black','Synthetic fixture description for index verification','Test',date '2026-01-01',
  'searching', (case when n%7=0 then 'hidden' else 'published' end)::public.moderation_state,
  case when n%11=0 then timestamptz '2026-01-02' else null end,
  timestamptz '2026-01-01' + (n%100)*interval '1 minute'
from generate_series(1,5000) n;
analyze public.posts;
-- Prove forward/backward pagination and predicates preserve result sets with/without indexes.
create temp table b2_before as select id from public.posts
where moderation='published' and deleted_at is null order by created_at desc,id desc limit 20 offset 20;
set local enable_indexscan=off;
set local enable_bitmapscan=off;
do $$
begin
 if exists ((select id from b2_before except select id from (select id from public.posts where moderation='published' and deleted_at is null order by created_at desc,id desc limit 20 offset 20) q)
   union all (select id from (select id from public.posts where moderation='published' and deleted_at is null order by created_at desc,id desc limit 20 offset 20) q except select id from b2_before)) then
   raise exception 'Index changes public page result';
 end if;
end $$;
set local role anon;
do $$ begin
 if exists(select 1 from public.posts where owner_id='00000000-0000-4000-8000-000000000b20' and (moderation <> 'published' or deleted_at is not null)) then
  raise exception 'Public index query exposed hidden/deleted data';
 end if;
end $$;
reset role;
rollback;
