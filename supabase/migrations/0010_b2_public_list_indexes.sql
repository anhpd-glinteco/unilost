-- Run each statement in autocommit mode, outside BEGIN/COMMIT.
-- Existing indexes/policies remain; these cover public pagination and the combined filter.
create index concurrently posts_public_created_id_idx
  on public.posts (created_at desc, id desc)
  where moderation = 'published' and deleted_at is null;

create index concurrently posts_public_type_category_created_id_idx
  on public.posts (type, category, created_at desc, id desc)
  where moderation = 'published' and deleted_at is null;
