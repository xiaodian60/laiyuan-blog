-- ═══════════════════════════════════════════════════════════
--   Supabase 数据库初始化脚本
--   在 Supabase SQL Editor 中执行此脚本
-- ═══════════════════════════════════════════════════════════

-- ── 创建表 ────────────────────────────────────────────────

-- 文章表
create table if not exists posts (
  id          uuid default gen_random_uuid() primary key,
  title       text    not null,
  content     text    not null,
  tags        text[]  default '{}',
  image_url   text,
  is_pinned   boolean default false,
  likes_count integer default 0,
  created_at  timestamptz default now()
);

-- 评论表
create table if not exists comments (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts(id) on delete cascade not null,
  author     text    not null,
  content    text    not null,
  parent_id  uuid references comments(id) on delete cascade,
  created_at timestamptz default now()
);

-- 公司文件表
create table if not exists files (
  id         uuid default gen_random_uuid() primary key,
  name       text    not null,
  url        text    not null,
  size       bigint  default 0,
  created_at timestamptz default now()
);

-- ── 启用 RLS ──────────────────────────────────────────────

alter table posts    enable row level security;
alter table comments enable row level security;
alter table files    enable row level security;

-- ── RLS 策略（允许匿名读写）──────────────────────────────

-- Posts
create policy "posts_select" on posts    for select to anon, authenticated using (true);
create policy "posts_insert" on posts    for insert to anon, authenticated with check (true);
create policy "posts_update" on posts    for update to anon, authenticated using (true) with check (true);
create policy "posts_delete" on posts    for delete to anon, authenticated using (true);

-- Comments
create policy "comments_select" on comments for select to anon, authenticated using (true);
create policy "comments_insert" on comments for insert to anon, authenticated with check (true);
create policy "comments_delete" on comments for delete to anon, authenticated using (true);

-- Files
create policy "files_select" on files    for select to anon, authenticated using (true);
create policy "files_insert" on files    for insert to anon, authenticated with check (true);
create policy "files_delete" on files    for delete to anon, authenticated using (true);

-- ── Storage Buckets ───────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('company-files', 'company-files', true)
on conflict (id) do nothing;

-- ── Storage 策略 ─────────────────────────────────────────

-- post-images: 公开读取 + 匿名上传
create policy "post_images_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'post-images');

create policy "post_images_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'post-images');

-- company-files: 公开读取 + 匿名上传
create policy "company_files_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'company-files');

create policy "company_files_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'company-files');
