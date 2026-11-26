begin;
create function public.complete_claim(p_claim_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.posts%rowtype; result uuid;
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor) then
    raise exception using errcode='42501', message='Authentication required';
  end if;
  select p.* into target from public.posts p where p.id=(select post_id from public.claim_requests where id=p_claim_id) for update;
  if not found or target.owner_id<>actor or target.type<>'found' or target.deleted_at is not null or target.status<>'verifying' then
    raise exception using errcode='42501', message='Claim unavailable';
  end if;
  update public.claim_requests set status='completed',updated_at=clock_timestamp()
    where id=p_claim_id and post_id=target.id and status='accepted' returning id into result;
  if result is null then raise exception using errcode='42501', message='Claim unavailable'; end if;
  update public.posts set status='returned',updated_at=clock_timestamp() where id=target.id;
  insert into public.status_history(post_id,from_status,to_status,actor_id,note) values(target.id,'verifying','returned',actor,null);
  return result;
end $$;
revoke all on function public.complete_claim(uuid) from public,anon,authenticated;
grant execute on function public.complete_claim(uuid) to authenticated;
commit;
