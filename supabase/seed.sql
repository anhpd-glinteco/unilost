-- Local demo only. Requires an existing synthetic profile ID supplied by the local runner.
-- Never invoke against hosted environments as part of patch verification.
do $$
declare demo_owner uuid := nullif(current_setting('unilost.demo_owner',true),'')::uuid;
begin
  if demo_owner is null or not exists(select 1 from public.profiles where id=demo_owner) then
    raise exception 'Set unilost.demo_owner to an existing synthetic profile first';
  end if;
  if exists(select 1 from public.posts where id in ('00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000092') and posts.owner_id<>demo_owner) then
    raise exception 'Demo IDs already belong to another profile';
  end if;
  insert into public.posts(id,owner_id,type,title,category,color,description,location,occurred_at,status,moderation) values
    ('00000000-0000-4000-8000-000000000091',demo_owner,'found','Ví xanh demo','Khác','xanh','Dữ liệu giả để trình diễn tìm đồ','Thư viện','2026-10-01','searching','pending'),
    ('00000000-0000-4000-8000-000000000092',demo_owner,'lost','Ví xanh thất lạc demo','Khác','xanh','Dữ liệu giả để trình diễn gợi ý','Thư viện','2026-10-01','searching','published')
    on conflict(id) do nothing;
end $$;
