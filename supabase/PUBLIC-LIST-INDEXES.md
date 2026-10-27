# #18 — public-list indexes (B2)

Owner: Vũ Xuân Trường. Base: frontend image UI commit 10fe6db / PR #64. This package adds two partial indexes; it does not modify rows, schema columns, RLS, grants or old migrations. It supports #19 ordering by created_at + id and the combined type/category filter. Existing general/full-text indexes stay intact.

0010 has two CREATE INDEX CONCURRENTLY statements and no transaction wrapper. Execute each statement separately in autocommit mode only after a reviewed test-environment preflight. A runner that wraps migrations in BEGIN is incompatible: do not blindly run db push or paste this inside another transaction. No hosted migration was applied to validate the package.

Preflight: check same-named indexes do not exist, or inspect pg_get_indexdef/indisvalid/indisready if they do. Never automatically retry after an ambiguous response. An interrupted concurrent build can leave an invalid index: inspect first, then remove only the confirmed invalid task-owned index with DROP INDEX CONCURRENTLY before a deliberate retry. CREATE INDEX is not IF NOT EXISTS, so drift is not silently accepted. Keep statements outside a transaction.

Rollback: separately run DROP INDEX CONCURRENTLY public.posts_public_type_category_created_id_idx; then DROP INDEX CONCURRENTLY public.posts_public_created_id_idx; no data rollback is required. After either action, read pg_indexes/pg_index and compare counts/grants/policies. Do not run rollback against an unrelated existing index.

supabase/tests/b2_public_list_indexes.sql is a rollback-only synthetic SQL suite after index creation. Local EXPLAIN on 5,000 synthetic rows is evidence for planner eligibility/results, not production latency or ROI. Substring ILIKE keyword search in #19 is not accelerated by these btree indexes. Offset pagination remains suitable for the small project dataset; use a measured cursor/search-index change if dataset growth makes deep pages or substring filters slow.

Issue completion still needs member review/commit/PR, CI, hosted test preflight/acceptance and the Week 4 report. The package alone does not complete #18; never apply migrations to production merely to test a patch.
