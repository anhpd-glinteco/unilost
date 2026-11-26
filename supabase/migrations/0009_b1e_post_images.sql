begin;

-- Stop for human review rather than deleting or choosing between legacy images.
do $$ begin
  if exists(select 1 from public.post_images group by post_id having count(*) > 1)
    or exists(select 1 from public.post_images group by storage_path having count(*) > 1) then
    raise exception 'B1e: duplicate legacy images require review';
  end if;
  if not exists(select 1 from storage.buckets where id='post-images') then
    raise exception 'B1e: post-images bucket missing';
  end if;
end $$;
create unique index post_images_one_per_post on public.post_images(post_id);
create unique index post_images_unique_path on public.post_images(storage_path);
update storage.buckets set public=false, file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='post-images';

drop policy "public reads post images" on storage.objects;
-- Prevent direct downloads/signing even if another permissive policy is added later.
create policy "B1e server reads post images" on storage.objects as restrictive
  for select to public using (bucket_id <> 'post-images');
drop policy "public reads published images" on public.post_images;
drop policy "owners manage images" on public.post_images;
create policy "B1e visible post images" on public.post_images for select using (
  exists(select 1 from public.posts p where p.id=post_id and p.deleted_at is null
    and (p.moderation='published' or p.owner_id=auth.uid() or public.is_admin()))
);

-- Only the server may attach files, after validating their bytes. Clients cannot
-- bypass file validation or reattach an old path while the server cleans it up.
create function public.set_post_image(p_actor_id uuid, p_post_id uuid, p_expected_path text, p_new_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.posts%rowtype; current_path text;
begin
  if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id) then
    raise exception using errcode='42501', message='Authentication required';
  end if;
  select * into target from public.posts where id=p_post_id for update;
  if not found or target.owner_id<>p_actor_id or target.deleted_at is not null
    or target.status not in ('searching','matched') then
    raise exception using errcode='42501', message='Post unavailable';
  end if;
  select storage_path into current_path from public.post_images where post_id=p_post_id;
  if current_path is distinct from p_expected_path then
    raise exception using errcode='40001', message='Image changed; reload before retrying';
  end if;
  if p_new_path is not null then
    if p_new_path !~ ('^'||p_actor_id::text||'/'||p_post_id::text||'/[0-9a-f-]{36}\.(jpg|png|webp)$')
      or p_new_path is not distinct from current_path
      or not exists(select 1 from storage.objects where bucket_id='post-images' and name=p_new_path) then
      raise exception using errcode='22023', message='Invalid image path';
    end if;
    insert into public.post_images(post_id,storage_path) values(p_post_id,p_new_path)
      on conflict(post_id) do update set storage_path=excluded.storage_path,alt_text=null;
  else
    if current_path is null then return target.id; end if;
    delete from public.post_images where post_id=p_post_id;
  end if;
  update public.posts set moderation=case when moderation='published' then 'pending'::public.moderation_state else moderation end,
    updated_at=clock_timestamp() where id=p_post_id;
  return target.id;
end $$;
revoke all on function public.set_post_image(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.set_post_image(uuid,uuid,text,text) to service_role;
commit;
