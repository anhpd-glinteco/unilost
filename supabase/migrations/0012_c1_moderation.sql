begin;
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check check(action in ('publish','hide','restore'));
create function public.moderate_post(p_post_id uuid,p_action text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.posts%rowtype; expected public.moderation_state; destination public.moderation_state;
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor and role='admin') then
    raise exception using errcode='42501',message='Admin required';
  end if;
  case p_action
    when 'publish' then expected:='pending'; destination:='published';
    when 'hide' then expected:='published'; destination:='hidden';
    when 'restore' then expected:='hidden'; destination:='published';
    else raise exception using errcode='22023',message='Invalid moderation action';
  end case;
  select * into target from public.posts where id=p_post_id for update;
  if not found or target.deleted_at is not null or target.moderation<>expected then
    raise exception using errcode='42501',message='Post unavailable';
  end if;
  update public.posts set moderation=destination,updated_at=clock_timestamp() where id=target.id;
  insert into public.moderation_actions(post_id,admin_id,action,reason) values(target.id,actor,p_action,null);
  return target.id;
end $$;
revoke all on function public.moderate_post(uuid,text) from public,anon,authenticated;
grant execute on function public.moderate_post(uuid,text) to authenticated;
commit;
