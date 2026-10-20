begin;

drop policy "users create own found posts" on public.posts;
drop policy "found post insert guard" on public.posts;
create policy "users create own posts" on public.posts for insert to authenticated
  with check (owner_id = auth.uid() and type in ('lost', 'found') and status = 'searching'
    and moderation = 'pending' and deleted_at is null);
create policy "post insert guard" on public.posts as restrictive for insert to authenticated
  with check (owner_id = auth.uid() and type in ('lost', 'found') and status = 'searching'
    and moderation = 'pending' and deleted_at is null);

commit;
