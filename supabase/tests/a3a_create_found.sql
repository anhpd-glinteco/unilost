-- Run after 0003; disposable fixtures roll back.
begin;
create temporary table a3a_ids (owner_id uuid, other_id uuid);
insert into a3a_ids values (gen_random_uuid(), gen_random_uuid());
insert into auth.users(id,raw_user_meta_data)
select owner_id,'{"full_name":"A3a fixture"}'::jsonb from a3a_ids
union all select other_id,'{"full_name":"A3a other"}'::jsonb from a3a_ids;
grant select on a3a_ids to authenticated, anon;
set local role authenticated;
select set_config('request.jwt.claim.sub',owner_id::text,true) from a3a_ids;
do $$
declare post_id uuid; rejected boolean; attack text; actor uuid; other_actor uuid;
begin
 select owner_id,other_id into actor,other_actor from a3a_ids;
 insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at)
 values(actor,'found','Found wallet','other','black','Disposable found post fixture','Library','2024-02-29') returning id into post_id;
 if not exists(select 1 from public.posts where id=post_id and status='searching' and moderation='pending' and deleted_at is null) then
 raise exception 'Owner/defaults incorrect'; end if;
 foreach attack in array array[
 format('insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at) values(%L,''found'',''Found wallet'',''other'',''black'',''Disposable found post fixture'',''Library'',''2024-02-29'')',other_actor),
 format('insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at) values(%L,''lost'',''Found wallet'',''other'',''black'',''Disposable found post fixture'',''Library'',''2024-02-29'')',actor),
 'insert into public.posts(id) values(gen_random_uuid())',
 'insert into public.posts(moderation) values(''published'')',
 'insert into public.posts(status) values(''returned'')',
 'insert into public.posts(created_at) values(now())',
 'update public.posts set title=''Changed''',
 'delete from public.posts'
 ] loop
 rejected:=false;
 begin execute attack; exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Forbidden write succeeded'; end if;
 end loop;
 rejected:=false;
 begin
 insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at)
 values(actor,'found','    ','other','black','Disposable found post fixture','Library','2024-02-29');
 exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'Blank title accepted'; end if;
 perform set_config('request.jwt.claim.sub',other_actor::text,true);
 if exists(select 1 from public.posts where id=post_id) then raise exception 'Stranger sees pending post'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
 if exists(select 1 from public.posts where title='Found wallet' and moderation='pending') then raise exception 'Guest sees pending fixture'; end if;
 begin
 insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at)
 select owner_id,'found','Found wallet','other','black','Disposable found post fixture','Library','2024-02-29' from a3a_ids;
 raise exception 'Guest insert allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
