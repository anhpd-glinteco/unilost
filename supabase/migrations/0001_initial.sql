create extension if not exists "pgcrypto";
create type public.post_type as enum ('lost', 'found');
create type public.post_status as enum ('searching', 'matched', 'verifying', 'returned', 'closed');
create type public.moderation_state as enum ('published', 'hidden', 'pending');
create type public.user_role as enum ('user', 'admin');
create type public.claim_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'completed');

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null, faculty text, role public.user_role not null default 'user', created_at timestamptz not null default now());
create table public.posts (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), type public.post_type not null, title text not null, category text not null, color text not null, description text not null, location text not null, occurred_at date not null, status public.post_status not null default 'searching', moderation public.moderation_state not null default 'pending', deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.post_images (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, storage_path text not null, alt_text text, created_at timestamptz not null default now());
create table public.claim_requests (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, requester_id uuid not null references public.profiles(id), proof text not null, status public.claim_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(post_id, requester_id));
create table public.status_history (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, from_status public.post_status, to_status public.post_status not null, actor_id uuid references public.profiles(id), note text, created_at timestamptz not null default now());
create table public.moderation_actions (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, admin_id uuid not null references public.profiles(id), action text not null check (action in ('hide', 'restore')), reason text, created_at timestamptz not null default now());

create index posts_search_idx on public.posts using gin (to_tsvector('simple', title || ' ' || description || ' ' || location));
create index posts_filters_idx on public.posts(type, category, location, occurred_at, status, moderation);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Thành viên mới')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security; alter table public.posts enable row level security; alter table public.post_images enable row level security; alter table public.claim_requests enable row level security; alter table public.status_history enable row level security; alter table public.moderation_actions enable row level security;
create policy "public can read published posts" on public.posts for select using (moderation = 'published' and deleted_at is null or owner_id = auth.uid() or public.is_admin());
create policy "users create own posts" on public.posts for insert with check (owner_id = auth.uid());
create policy "owners update posts" on public.posts for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "profiles are visible to self" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "users update self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "related users read claims" on public.claim_requests for select using (requester_id = auth.uid() or exists (select 1 from public.posts where posts.id = post_id and posts.owner_id = auth.uid()) or public.is_admin());
create policy "users create own claims" on public.claim_requests for insert with check (requester_id = auth.uid());
create policy "related users update claims" on public.claim_requests for update using (requester_id = auth.uid() or exists (select 1 from public.posts where posts.id = post_id and posts.owner_id = auth.uid()) or public.is_admin());
create policy "public reads published images" on public.post_images for select using (exists (select 1 from public.posts where posts.id = post_id and (posts.moderation = 'published' or posts.owner_id = auth.uid() or public.is_admin())));
create policy "owners manage images" on public.post_images for all using (exists (select 1 from public.posts where posts.id = post_id and posts.owner_id = auth.uid()) or public.is_admin());
create policy "related users read history" on public.status_history for select using (exists (select 1 from public.posts where posts.id = post_id and (posts.owner_id = auth.uid() or public.is_admin())));
create policy "admins manage moderation" on public.moderation_actions for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true) on conflict (id) do nothing;
create policy "public reads post images" on storage.objects for select using (bucket_id = 'post-images');
create policy "users upload own post images" on storage.objects for insert with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
