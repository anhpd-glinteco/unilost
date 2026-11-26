-- Disposable fixtures and injected history failure are rolled back together.
begin;
create temporary table a7_ids as select gen_random_uuid() owner_id, gen_random_uuid() requester_id,
  gen_random_uuid() other_id, gen_random_uuid() admin_id;
grant select on a7_ids to authenticated;
insert into auth.users(id,raw_user_meta_data)
select owner_id,'{}'::jsonb from a7_ids union all select requester_id,'{}'::jsonb from a7_ids
union all select other_id,'{}'::jsonb from a7_ids union all select admin_id,'{}'::jsonb from a7_ids;
update public.profiles set role='admin' where id=(select admin_id from a7_ids);
do $$
declare fn text;
begin
  foreach fn in array array['public.accept_claim(uuid)','public.reject_claim(uuid)'] loop
    if has_function_privilege('anon',fn,'execute') or not has_function_privilege('authenticated',fn,'execute') then
      raise exception 'Incorrect A7 RPC privileges';
    end if;
  end loop;
  if has_table_privilege('authenticated','public.claim_requests','insert,update,delete')
    or has_any_column_privilege('authenticated','public.claim_requests','insert,update') then
    raise exception 'Direct claim writes opened';
  end if;
end;
$$;
-- Failure injection exists only inside this rolled-back test transaction.
create function public.a7_test_history_failure() returns trigger language plpgsql as $$
begin
  if current_setting('a7.fail_history',true)='yes' then raise exception 'Injected history failure' using errcode='P0002'; end if;
  return new;
end;
$$;
create trigger a7_test_history_failure before insert on public.status_history
  for each row execute function public.a7_test_history_failure();

do $$
declare owner_id uuid; requester uuid; outsider uuid; admin_id uuid; p uuid; c uuid; other_claim uuid;
  state text; outcome text; actor uuid; denied boolean; before_post jsonb; before_claim jsonb; target_claim jsonb; h record;
begin
  select i.owner_id,i.requester_id,i.other_id,i.admin_id into owner_id,requester,outsider,admin_id from a7_ids i;
  foreach state in array array['searching','matched','hidden','pending','deleted','closed','verifying','returned','lost'] loop
    insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at,status,moderation,deleted_at)
      values(owner_id,case when state='lost' then 'lost'::public.post_type else 'found'::public.post_type end,
      'A7 fixture','other','black','Disposable A7 fixture','Test','2026-01-01',
      case when state in ('matched','closed','verifying','returned') then state::public.post_status else 'searching' end,
      case when state in ('hidden','pending') then state::public.moderation_state else 'published' end,
      case when state='deleted' then now() else null end) returning id into p;
    insert into public.claim_requests(post_id,requester_id,proof) values(p,requester,'Disposable proof') returning id into c;
    insert into public.claim_requests(post_id,requester_id,proof) values(p,outsider,'Other disposable proof') returning id into other_claim;
    select to_jsonb(t) into before_post from public.posts t where id=p;
    select to_jsonb(t) into target_claim from public.claim_requests t where id=c;
    select to_jsonb(t) into before_claim from public.claim_requests t where id=other_claim;
    foreach actor in array array[null::uuid,requester,outsider,admin_id] loop
      perform set_config('request.jwt.claim.sub',coalesce(actor::text,''),true);
      denied:=false;
      begin perform public.accept_claim(c); exception when insufficient_privilege then denied:=true; end;
      if not denied then raise exception 'Unauthorized accept'; end if;
      denied:=false;
      begin perform public.reject_claim(c); exception when insufficient_privilege then denied:=true; end;
      if not denied then raise exception 'Unauthorized reject'; end if;
    end loop;
    perform set_config('request.jwt.claim.sub',owner_id::text,true);
    if state in ('searching','matched') then
      -- Assert full rollback after writes to claim and post but before history insert.
      perform set_config('a7.fail_history','yes',true);
      denied:=false;
      begin perform public.accept_claim(c); exception when no_data_found then denied:=true; end;
      perform set_config('a7.fail_history','no',true);
      if not denied or (select to_jsonb(t) from public.claim_requests t where id=c)<>target_claim
        or (select to_jsonb(t) from public.posts t where id=p)<>before_post
        or exists(select 1 from public.status_history where post_id=p) then raise exception 'Accept rollback failed'; end if;
      if public.accept_claim(c)<>c then raise exception 'Incorrect accept result'; end if;
      if (select status from public.claim_requests where id=c)<>'accepted'
        or (select status from public.posts where id=p)<>'verifying'
        or (select count(*) from public.status_history where post_id=p)<>1 then raise exception 'Accept effects incorrect'; end if;
      select * into h from public.status_history where post_id=p;
      if h.from_status<>state::public.post_status or h.to_status<>'verifying' or h.actor_id<>owner_id or h.note is not null then
        raise exception 'Incorrect history'; end if;
      denied:=false;
      begin perform public.accept_claim(other_claim); exception when insufficient_privilege then denied:=true; end;
      if not denied then raise exception 'Second accept allowed'; end if;
      if (select to_jsonb(t) from public.claim_requests t where id=other_claim)<>before_claim then raise exception 'Other claim changed'; end if;
      perform public.reject_claim(other_claim);
      if (select count(*) from public.status_history where post_id=p)<>1 then raise exception 'Reject wrote history'; end if;
    else
      denied:=false;
      begin perform public.accept_claim(c); exception when insufficient_privilege then denied:=true; end;
      if not denied then raise exception 'Ineligible post accepted'; end if;
      perform public.reject_claim(c);
      if (select status from public.claim_requests where id=c)<>'rejected'
        or (select to_jsonb(t) from public.posts t where id=p)<>before_post
        or exists(select 1 from public.status_history where post_id=p)
        or (select to_jsonb(t) from public.claim_requests t where id=other_claim)<>before_claim then raise exception 'Reject effects incorrect'; end if;
    end if;
    foreach outcome in array array['accepted','completed'] loop
      -- Trusted fixture writes test the index independently of RPC guards.
      update public.claim_requests set status='pending' where post_id=p;
      update public.claim_requests set status=outcome::public.claim_status where id=c;
      denied:=false;
      begin update public.claim_requests set status=outcome::public.claim_status where id=other_claim;
        exception when unique_violation then denied:=true; end;
      if not denied then raise exception 'Multiple recipients allowed'; end if;
    end loop;
    foreach outcome in array array['accepted','completed','cancelled','rejected'] loop
      update public.claim_requests set status=outcome::public.claim_status where id=c;
      denied:=false;
      begin perform public.reject_claim(c); exception when insufficient_privilege then denied:=true; end;
      if not denied then raise exception 'Non-pending reject allowed'; end if;
      update public.posts set status='searching',moderation='published',deleted_at=null,type='found' where id=p;
      denied:=false;
      begin perform public.accept_claim(c); exception when insufficient_privilege then denied:=true; end;
      if not denied then raise exception 'Non-pending accept allowed'; end if;
    end loop;
  end loop;
  -- Admin decision is valid only as the actual owner.
  update public.posts set owner_id=admin_id,status='searching' where id=p;
  update public.claim_requests set status='pending' where post_id=p;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.accept_claim(c);
  perform public.reject_claim(other_claim);
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  denied:=false;
  begin perform public.reject_claim(gen_random_uuid()); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Missing profile accepted'; end if;
end;
$$;
rollback;
