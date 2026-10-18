begin;

do $$
begin
  if exists(select 1 from public.claim_requests where status in ('accepted', 'completed') group by post_id having count(*) > 1) then
    raise exception 'A7 migration blocked: multiple accepted/completed claims on a post; review existing data';
  end if;
end;
$$;
create unique index claim_requests_one_recipient_idx on public.claim_requests(post_id)
  where status in ('accepted', 'completed');

create function public.accept_claim(p_claim_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.posts%rowtype; result uuid;
begin
  if actor is null or not exists(select 1 from public.profiles where id = actor) then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select p.* into target from public.posts p
    where p.id = (select post_id from public.claim_requests where id = p_claim_id) for update;
  if not found or target.owner_id <> actor or target.type <> 'found'
    or target.moderation <> 'published' or target.deleted_at is not null
    or target.status not in ('searching', 'matched')
    or exists(select 1 from public.claim_requests where post_id = target.id and status in ('accepted', 'completed')) then
    raise exception using errcode = '42501', message = 'Claim unavailable';
  end if;
  update public.claim_requests set status = 'accepted', updated_at = clock_timestamp()
    where id = p_claim_id and post_id = target.id and status = 'pending' returning id into result;
  if result is null then
    raise exception using errcode = '42501', message = 'Claim unavailable';
  end if;
  update public.posts set status = 'verifying', updated_at = clock_timestamp() where id = target.id;
  insert into public.status_history(post_id, from_status, to_status, actor_id, note)
    values(target.id, target.status, 'verifying', actor, null);
  return result;
end;
$$;

create function public.reject_claim(p_claim_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.posts%rowtype; result uuid;
begin
  if actor is null or not exists(select 1 from public.profiles where id = actor) then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select p.* into target from public.posts p
    where p.id = (select post_id from public.claim_requests where id = p_claim_id) for update;
  if not found or target.owner_id <> actor then
    raise exception using errcode = '42501', message = 'Claim unavailable';
  end if;
  update public.claim_requests set status = 'rejected', updated_at = clock_timestamp()
    where id = p_claim_id and post_id = target.id and status = 'pending' returning id into result;
  if result is null then
    raise exception using errcode = '42501', message = 'Claim unavailable';
  end if;
  return result;
end;
$$;

revoke all on function public.accept_claim(uuid), public.reject_claim(uuid) from public, anon, authenticated;
grant execute on function public.accept_claim(uuid), public.reject_claim(uuid) to authenticated;

commit;
