-- All fixtures and failure injection are rolled back.
begin;
create temporary table b1c_ids as select gen_random_uuid() owner_id, gen_random_uuid() other_id;
insert into auth.users(id,raw_user_meta_data) select owner_id,'{}'::jsonb from b1c_ids union all select other_id,'{}'::jsonb from b1c_ids;
create function public.b1c_history_failure() returns trigger language plpgsql as $$
begin if current_setting('b1c.fail',true)='yes' then raise exception using errcode='P0002',message='Injected history failure'; end if; return new; end $$;
create trigger b1c_history_failure before insert on public.status_history for each row execute function public.b1c_history_failure();
do $$
declare owner_id uuid; other_id uuid; p uuid; typ text; mod text; state text; input jsonb;
  before_post jsonb; after_post jsonb; bad jsonb; fn text; c uuid; op text;
begin
  select i.owner_id,i.other_id into owner_id,other_id from b1c_ids i;
  foreach fn in array array['public.update_post(uuid,jsonb)','public.close_post(uuid)'] loop
    if has_function_privilege('anon',fn,'execute') or not has_function_privilege('authenticated',fn,'execute') then raise exception 'RPC grants'; end if;
  end loop;
  if has_table_privilege('authenticated','public.posts','update') or has_any_column_privilege('authenticated','public.posts','update') then raise exception 'Direct update open'; end if;
  input := jsonb_build_object('title','  Edited wallet  ','category','other','color','black','description','Disposable edited wallet description','location','Library','occurredAt','2024-02-29');
  foreach typ in array array['lost','found'] loop
    foreach mod in array array['published','pending','hidden'] loop
      foreach state in array array['searching','matched','verifying','returned','closed','deleted'] loop
        insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at,status,moderation,deleted_at)
          values(owner_id,typ::public.post_type,'Original wallet','other','black','Disposable original description','Test','2026-01-01',
            case when state='deleted' then 'searching'::public.post_status else state::public.post_status end,mod::public.moderation_state,
            case when state='deleted' then now() else null end) returning id into p;
        select to_jsonb(t) into before_post from public.posts t where id=p;
        perform set_config('request.jwt.claim.sub',other_id::text,true);
        begin perform public.update_post(p,input); raise exception 'Unauthorized update'; exception when insufficient_privilege then null; end;
        begin perform public.close_post(p); raise exception 'Unauthorized close'; exception when insufficient_privilege then null; end;
        perform set_config('request.jwt.claim.sub',owner_id::text,true);
        if state in ('searching','matched') then
          perform public.update_post(p,input);
          select to_jsonb(t) into after_post from public.posts t where id=p;
          if after_post->>'title'<>'Edited wallet' or after_post->>'moderation'<>(case when mod='published' then 'pending' else mod end)
            or after_post->>'status'<>state or after_post->>'type'<>typ or after_post->>'owner_id'<>owner_id::text then raise exception 'Update effects'; end if;
          foreach bad in array array[input-'title', input||'{"owner_id":"forged"}',input||'{"title":1234}',input||'{"title":"   "}',input||'{"occurredAt":"2026-02-29"}',input||jsonb_build_object('title',repeat('😀',51))] loop
            begin perform public.update_post(p,bad); raise exception 'Invalid update accepted'; exception when invalid_parameter_value then null; end;
          end loop;
          select to_jsonb(t) into before_post from public.posts t where id=p;
          perform set_config('b1c.fail','yes',true);
          begin perform public.close_post(p); raise exception 'Fault injection failed'; exception when sqlstate 'P0002' then null; end;
          select to_jsonb(t) into after_post from public.posts t where id=p;
          if after_post<>before_post then raise exception 'Close not atomic'; end if;
          perform set_config('b1c.fail','no',true);
          perform public.close_post(p); perform public.close_post(p);
          if (select count(*) from public.status_history where post_id=p)<>1 then raise exception 'Repeated history'; end if;
          if not exists(select 1 from public.status_history where post_id=p and from_status=state::public.post_status and to_status='closed' and actor_id=owner_id) then raise exception 'Incorrect history'; end if;
        else
          begin perform public.update_post(p,input); raise exception 'Ineligible update'; exception when insufficient_privilege then null; end;
          if state='closed' then perform public.close_post(p);
          else begin perform public.close_post(p); raise exception 'Ineligible close'; exception when insufficient_privilege then null; end; end if;
          select to_jsonb(t) into after_post from public.posts t where id=p;
          if after_post<>before_post then raise exception 'Ineligible data changed'; end if;
        end if;
      end loop;
    end loop;
  end loop;
  -- Deterministic orderings; actual concurrent requests are covered by the hosted runner.
  foreach op in array array['accept-first','edit-first','close-first'] loop
    insert into public.posts(owner_id,type,title,category,color,description,location,occurred_at,moderation)
      values(owner_id,'found','Original wallet','other','black','Disposable original description','Test','2026-01-01','published') returning id into p;
    insert into public.claim_requests(post_id,requester_id,proof) values(p,other_id,'Disposable B1c proof') returning id into c;
    if op='accept-first' then
      perform public.accept_claim(c);
      begin perform public.update_post(p,input); raise exception 'Edited verifying'; exception when insufficient_privilege then null; end;
      begin perform public.close_post(p); raise exception 'Closed verifying'; exception when insufficient_privilege then null; end;
    else
      if op='edit-first' then perform public.update_post(p,input); else perform public.close_post(p); end if;
      begin perform public.accept_claim(c); raise exception 'Accepted ineligible'; exception when insufficient_privilege then null; end;
      if (select status from public.claim_requests where id=c)<>'pending' then raise exception 'Claim changed'; end if;
    end if;
  end loop;
end $$;
rollback;

