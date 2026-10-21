begin;

create function public.update_post(p_post_id uuid, p_content jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); target public.posts%rowtype; field text; value text;
  content jsonb := '{}'::jsonb; length integer; bounds integer[]; day date;
begin
  if actor is null or not exists(select 1 from public.profiles where id = actor) then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if jsonb_typeof(p_content) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Invalid post content';
  end if;
  if (select count(*) from jsonb_object_keys(p_content)) <> 6 then
    raise exception using errcode = '22023', message = 'Invalid post content';
  end if;
  foreach field in array array['title','category','color','description','location','occurredAt'] loop
    if jsonb_typeof(p_content->field) is distinct from 'string' then
      raise exception using errcode = '22023', message = 'Invalid post content';
    end if;
    value := btrim(p_content->>field, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
    select coalesce(sum(case when ascii(substr(value,n,1)) > 65535 then 2 else 1 end),0)
      into length from generate_series(1,char_length(value)) n;
    bounds := case field when 'title' then array[4,100] when 'category' then array[1,2147483647]
      when 'color' then array[1,40] when 'description' then array[20,1000]
      when 'location' then array[2,120] else array[10,10] end;
    if length < bounds[1] or length > bounds[2] then
      raise exception using errcode = '22023', message = 'Invalid post content';
    end if;
    content := content || jsonb_build_object(field,value);
  end loop;
  if exists(select 1 from jsonb_object_keys(p_content) k where k not in ('title','category','color','description','location','occurredAt')) then
    raise exception using errcode = '22023', message = 'Invalid post content';
  end if;
  if content->>'occurredAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(content->>'occurredAt',4) = '0000' then
    raise exception using errcode = '22023', message = 'Invalid post date';
  end if;
  begin day := (content->>'occurredAt')::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception using errcode = '22023', message = 'Invalid post date';
  end;
  select * into target from public.posts where id=p_post_id for update;
  if not found or target.owner_id <> actor or target.deleted_at is not null or target.status not in ('searching','matched') then
    raise exception using errcode = '42501', message = 'Post unavailable';
  end if;
  update public.posts set title=content->>'title', category=content->>'category', color=content->>'color',
    description=content->>'description', location=content->>'location', occurred_at=day,
    moderation=case when target.moderation='published' then 'pending'::public.moderation_state else target.moderation end,
    updated_at=clock_timestamp() where id=target.id;
  return target.id;
end;
$$;

create function public.close_post(p_post_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target public.posts%rowtype;
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor) then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select * into target from public.posts where id=p_post_id for update;
  if not found or target.owner_id <> actor or target.deleted_at is not null or target.status not in ('searching','matched','closed') then
    raise exception using errcode = '42501', message = 'Post unavailable';
  end if;
  if target.status='closed' then return target.id; end if;
  update public.posts set status='closed', updated_at=clock_timestamp() where id=target.id;
  insert into public.status_history(post_id,from_status,to_status,actor_id,note)
    values(target.id,target.status,'closed',actor,null);
  return target.id;
end;
$$;
revoke all on function public.update_post(uuid,jsonb), public.close_post(uuid) from public, anon, authenticated;
grant execute on function public.update_post(uuid,jsonb), public.close_post(uuid) to authenticated;
commit;
