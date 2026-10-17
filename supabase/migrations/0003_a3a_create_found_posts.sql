begin;

-- ADD CONSTRAINT validates existing rows; incompatible data rolls back the whole migration.
alter table public.posts add constraint posts_content_valid check (
  char_length(title) between 4 and 100 and title ~ '[^[:space:]]'
  and char_length(category) >= 1 and category ~ '[^[:space:]]'
  and char_length(color) between 1 and 40 and color ~ '[^[:space:]]'
  and char_length(description) between 20 and 1000 and description ~ '[^[:space:]]'
  and char_length(location) between 2 and 120 and location ~ '[^[:space:]]'
  and title = regexp_replace(title, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  and category = regexp_replace(category, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  and color = regexp_replace(color, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  and description = regexp_replace(description, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  and location = regexp_replace(location, '^[[:space:]]+|[[:space:]]+$', '', 'g')
  and occurred_at between date '0001-01-01' and date '9999-12-31'
);

drop policy "users create own posts" on public.posts;
create policy "users create own found posts" on public.posts for insert to authenticated
  with check (owner_id = auth.uid() and type = 'found' and status = 'searching'
    and moderation = 'pending' and deleted_at is null);
-- Restrictive guard also protects against future permissive INSERT policies.
create policy "found post insert guard" on public.posts as restrictive for insert to authenticated
  with check (owner_id = auth.uid() and type = 'found' and status = 'searching'
    and moderation = 'pending' and deleted_at is null);
grant insert (owner_id, type, title, category, color, description, location, occurred_at)
  on public.posts to authenticated;

commit;
