begin;

-- RLS limits rows; revoke table AND column grants before allowing editable fields.
revoke insert, update, delete, truncate, references, trigger on table
  public.profiles, public.posts, public.post_images, public.claim_requests,
  public.status_history, public.moderation_actions from public, anon, authenticated;

revoke insert (id, full_name, faculty, role, created_at),
  update (id, full_name, faculty, role, created_at),
  references (id, full_name, faculty, role, created_at)
  on public.profiles from public, anon, authenticated;
revoke insert (id, owner_id, type, title, category, color, description, location, occurred_at, status, moderation, deleted_at, created_at, updated_at),
  update (id, owner_id, type, title, category, color, description, location, occurred_at, status, moderation, deleted_at, created_at, updated_at),
  references (id, owner_id, type, title, category, color, description, location, occurred_at, status, moderation, deleted_at, created_at, updated_at)
  on public.posts from public, anon, authenticated;
revoke insert (id, post_id, storage_path, alt_text, created_at),
  update (id, post_id, storage_path, alt_text, created_at),
  references (id, post_id, storage_path, alt_text, created_at)
  on public.post_images from public, anon, authenticated;
revoke insert (id, post_id, requester_id, proof, status, created_at, updated_at),
  update (id, post_id, requester_id, proof, status, created_at, updated_at),
  references (id, post_id, requester_id, proof, status, created_at, updated_at)
  on public.claim_requests from public, anon, authenticated;
revoke insert (id, post_id, from_status, to_status, actor_id, note, created_at),
  update (id, post_id, from_status, to_status, actor_id, note, created_at),
  references (id, post_id, from_status, to_status, actor_id, note, created_at)
  on public.status_history from public, anon, authenticated;
revoke insert (id, post_id, admin_id, action, reason, created_at),
  update (id, post_id, admin_id, action, reason, created_at),
  references (id, post_id, admin_id, action, reason, created_at)
  on public.moderation_actions from public, anon, authenticated;

grant update (full_name, faculty) on public.profiles to authenticated;
-- Existing self-only UPDATE and SELECT policies remain in effect, including for admins.

drop policy "users upload own post images" on storage.objects;
-- Freeze this bucket without changing grants or uploads for other buckets.
create policy "A2 blocks post image inserts" on storage.objects as restrictive
  for insert to public with check (bucket_id <> 'post-images');
create policy "A2 blocks post image updates" on storage.objects as restrictive
  for update to public using (bucket_id <> 'post-images') with check (bucket_id <> 'post-images');
create policy "A2 blocks post image deletes" on storage.objects as restrictive
  for delete to public using (bucket_id <> 'post-images');

commit;
