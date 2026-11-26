begin;

drop function public.create_claim(uuid, text);

create function public.create_claim(p_post_id uuid, p_proof jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target public.posts%rowtype;
  normalized text;
  proof_length integer;
  result uuid;
begin
  if actor is null or not exists(select 1 from public.profiles where id = actor) then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  -- Match ECMAScript trim and UTF-16 length, including supplementary characters.
  if jsonb_typeof(p_proof) is distinct from 'string' then
    raise exception using errcode = '22023', message = 'Invalid claim proof';
  end if;
  normalized := btrim(p_proof #>> '{}', U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
  if normalized is null or char_length(normalized) > 1000 then
    raise exception using errcode = '22023', message = 'Invalid claim proof';
  end if;
  select coalesce(sum(case when ascii(substr(normalized, n, 1)) > 65535 then 2 else 1 end), 0)
    into proof_length from generate_series(1, char_length(normalized)) as n;
  if proof_length not between 10 and 1000 then
    raise exception using errcode = '22023', message = 'Invalid claim proof';
  end if;
  select * into target from public.posts where id = p_post_id for update;
  if not found or target.owner_id = actor or target.type <> 'found'
    or target.moderation <> 'published' or target.deleted_at is not null
    or target.status not in ('searching', 'matched') then
    raise exception using errcode = '42501', message = 'Claim unavailable';
  end if;
  insert into public.claim_requests(post_id, requester_id, proof)
    values(p_post_id, actor, normalized) returning id into result;
  return result;
end;
$$;

revoke all on function public.create_claim(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_claim(uuid, jsonb) to authenticated;

commit;
