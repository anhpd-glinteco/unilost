-- Dedicated test DB only; fixtures and injected trigger roll back.
begin;
create temporary table b1e_ids as select gen_random_uuid() owner_id,gen_random_uuid() other_id;
insert into auth.users(id,raw_user_meta_data) select owner_id,'{}'::jsonb from b1e_ids union all select other_id,'{}'::jsonb from b1e_ids;
create function public.b1e_image_failure() returns trigger language plpgsql as $$
begin if current_setting('b1e.fail',true)='yes' then raise exception using errcode='P0002',message='Injected image failure'; end if; return new; end $$;
create trigger b1e_image_failure before update on public.posts for each row execute function public.b1e_image_failure();
do $$
declare owner_id uuid; other_id uuid; p uuid; path text; next_path text; typ text; mod text; state text; before_post jsonb;
begin
  select i.owner_id,i.other_id into owner_id,other_id from b1e_ids i;
  if has_function_privilege('anon','public.set_post_image(uuid,uuid,text,text)','execute')
    or has_function_privilege('authenticated','public.set_post_image(uuid,uuid,text,text)','execute')
    or not has_function_privilege('service_role','public.set_post_image(uuid,uuid,text,text)','execute') then raise exception 'RPC grants'; end if;
  if (select public from storage.buckets where id='post-images') then raise exception 'Public bucket'; end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='B1e server reads post images' and permissive='RESTRICTIVE') then raise exception 'Direct read/sign not blocked'; end if;
  foreach typ in array array['lost','found'] loop
    foreach mod in array array['published','pending','hidden'] loop
      foreach state in array array['searching','matched','verifying','returned','closed','deleted'] loop
        insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at,status,moderation,deleted_at)
          values(owner_id,typ::public.post_type,'Image fixture','other','black','Disposable image fixture content','Test','2026-01-01',
            case when state='deleted' then 'searching'::public.post_status else state::public.post_status end,mod::public.moderation_state,
            case when state='deleted' then now() else null end) returning id into p;
        path := owner_id::text||'/'||p::text||'/'||gen_random_uuid()::text||'.png';
        next_path := owner_id::text||'/'||p::text||'/'||gen_random_uuid()::text||'.jpg';
        insert into storage.objects(bucket_id,name) values('post-images',path),('post-images',next_path);
        select to_jsonb(t) into before_post from public.posts t where id=p;
        begin perform public.set_post_image(other_id,p,null,path); raise exception 'Outsider allowed'; exception when insufficient_privilege then null; end;
        if state in ('searching','matched') then
          begin perform public.set_post_image(owner_id,p,null,'../forged.png'); raise exception 'Forged path'; exception when invalid_parameter_value then null; end;
          perform set_config('b1e.fail','yes',true);
          begin perform public.set_post_image(owner_id,p,null,path); raise exception 'Fault not injected'; exception when sqlstate 'P0002' then null; end;
          if exists(select 1 from public.post_images where post_id=p) or (select to_jsonb(t) from public.posts t where id=p)<>before_post then raise exception 'Not atomic'; end if;
          perform set_config('b1e.fail','no',true);
          perform public.set_post_image(owner_id,p,null,path);
          if not exists(select 1 from public.posts where id=p and status=state::public.post_status and moderation=(case when mod='published' then 'pending' else mod end)::public.moderation_state) then raise exception 'Post effects'; end if;
          begin perform public.set_post_image(owner_id,p,null,next_path); raise exception 'Stale CAS allowed'; exception when serialization_failure then null; end;
          perform public.set_post_image(owner_id,p,path,next_path);
          if (select count(*) from public.post_images where post_id=p)<>1 or (select storage_path from public.post_images where post_id=p)<>next_path then raise exception 'Single replacement'; end if;
          perform public.set_post_image(owner_id,p,next_path,null);
          select to_jsonb(t) into before_post from public.posts t where id=p;
          perform public.set_post_image(owner_id,p,null,null);
          if exists(select 1 from public.post_images where post_id=p) or (select to_jsonb(t) from public.posts t where id=p)<>before_post then raise exception 'Repeated delete effects'; end if;
        else
          begin perform public.set_post_image(owner_id,p,null,path); raise exception 'Ineligible image allowed'; exception when insufficient_privilege then null; end;
          if (select to_jsonb(t) from public.posts t where id=p)<>before_post then raise exception 'Denied post changed'; end if;
        end if;
      end loop;
    end loop;
  end loop;
  insert into public.post_images(post_id,storage_path) values(p,path);
  begin
    insert into public.post_images(post_id,storage_path) values(p,next_path);
    raise exception 'Multiple images allowed';
  exception when unique_violation then null; end;
  if to_regclass('public.post_images_one_per_post') is null or to_regclass('public.post_images_unique_path') is null then raise exception 'Unique image indexes missing'; end if;
end $$;
select 'PASS B1e matrix, CAS, moderation, rollback, service-only RPC' as result;
rollback;
