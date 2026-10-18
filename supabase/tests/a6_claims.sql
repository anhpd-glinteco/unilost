-- Run after 0004 on the dedicated test project. All fixtures roll back.
begin;
do $$
begin
  if to_regprocedure('public.create_claim(uuid,text)') is not null
    or has_function_privilege('anon', 'public.create_claim(uuid,jsonb)', 'execute')
    or has_function_privilege('anon', 'public.cancel_claim(uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.create_claim(uuid,jsonb)', 'execute')
    or not has_function_privilege('authenticated', 'public.cancel_claim(uuid)', 'execute') then
    raise exception 'RPC privileges incorrect';
  end if;
  if has_table_privilege('authenticated', 'public.claim_requests', 'insert,update,delete')
    or has_any_column_privilege('authenticated', 'public.claim_requests', 'insert,update') then
    raise exception 'Direct claim writes must stay locked';
  end if;
end;
$$;
create temporary table a6_ids as select gen_random_uuid() owner_id, gen_random_uuid() requester_id, gen_random_uuid() post_id;
grant select on a6_ids to authenticated;
insert into auth.users(id, raw_user_meta_data)
select owner_id, '{"full_name":"A6 fixture owner"}'::jsonb from a6_ids
union all select requester_id, '{"full_name":"A6 fixture requester"}'::jsonb from a6_ids;
insert into public.posts(id,owner_id,type,title,category,color,description,location,occurred_at,moderation)
select post_id,owner_id,'found','Found fixture','other','black','Disposable A6 SQL fixture','Test','2026-01-01','published' from a6_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub', requester_id::text, true) from a6_ids;
do $$
declare claim_id uuid; target uuid; rejected boolean; bad_proof jsonb;
begin
  select post_id into target from a6_ids;
  foreach bad_proof in array array['null'::jsonb, '1234567890'::jsonb, '{"note":"Long fake proof"}'::jsonb, '["Long fake proof"]'::jsonb] loop
    rejected := false;
    begin perform public.create_claim(target, bad_proof); exception when invalid_parameter_value then rejected := true; end;
    if not rejected then raise exception 'Non-string proof accepted'; end if;
  end loop;
  claim_id := public.create_claim(target, to_jsonb(U&'\FEFF  abcdefghij \3000'::text));
  if not exists(select 1 from public.claim_requests where id=claim_id and proof='abcdefghij' and status='pending' and requester_id=auth.uid()) then
    raise exception 'Claim defaults or normalization incorrect';
  end if;
  rejected := false;
  begin perform public.create_claim(target, to_jsonb('Duplicate fake proof'::text)); exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Duplicate claim accepted'; end if;
  perform public.cancel_claim(claim_id);
  if not exists(select 1 from public.claim_requests where id=claim_id and status='cancelled') then raise exception 'Cancel failed'; end if;
  rejected := false;
  begin perform public.cancel_claim(claim_id); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Repeated cancellation accepted'; end if;
end;
$$;
select set_config('request.jwt.claim.sub', owner_id::text, true) from a6_ids;
do $$
declare rejected boolean := false;
begin
  begin perform public.create_claim((select post_id from a6_ids), to_jsonb('Self claim fake proof'::text)); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Self claim accepted'; end if;
end;
$$;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$
declare rejected boolean := false;
begin
  begin perform public.create_claim((select post_id from a6_ids), to_jsonb('Missing profile proof'::text)); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Missing profile accepted'; end if;
end;
$$;
reset role;
select 'PASS' as result;
rollback;
