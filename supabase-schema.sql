-- ═══════════════════════════════════════════════════════════
--   Supabase 完整初始化脚本（请在 SQL Editor 中执行）
--   修复：创建缺失的存储桶、表、RLS 策略
-- ═══════════════════════════════════════════════════════════

-- ━━━ 第一步：创建数据表 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 文章表（如果已存在则跳过）
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

-- 公司文件表（之前缺失！）
create table if not exists files (
  id         uuid default gen_random_uuid() primary key,
  name       text    not null,
  url        text    not null,
  size       bigint  default 0,
  created_at timestamptz default now()
);

-- ━━━ 第二步：启用 RLS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

alter table posts    enable row level security;
alter table comments enable row level security;
alter table files    enable row level security;

-- ━━━ 第三步：数据表 RLS 策略（允许匿名完整读写）━━━━

-- 先删除可能存在的旧策略（避免冲突）
drop policy if exists "posts_select"    on posts;
drop policy if exists "posts_insert"    on posts;
drop policy if exists "posts_update"    on posts;
drop policy if exists "posts_delete"    on posts;
drop policy if exists "comments_select" on comments;
drop policy if exists "comments_insert" on comments;
drop policy if exists "comments_delete" on comments;
drop policy if exists "files_select"    on files;
drop policy if exists "files_insert"    on files;
drop policy if exists "files_delete"    on files;

-- Posts：完整 CRUD
create policy "posts_select" on posts    for select to anon, authenticated using (true);
create policy "posts_insert" on posts    for insert to anon, authenticated with check (true);
create policy "posts_update" on posts    for update to anon, authenticated using (true) with check (true);
create policy "posts_delete" on posts    for delete to anon, authenticated using (true);

-- Comments：读取 + 插入 + 删除
create policy "comments_select" on comments for select to anon, authenticated using (true);
create policy "comments_insert" on comments for insert to anon, authenticated with check (true);
create policy "comments_delete" on comments for delete to anon, authenticated using (true);

-- Files：读取 + 插入 + 删除
create policy "files_select" on files    for select to anon, authenticated using (true);
create policy "files_insert" on files    for insert to anon, authenticated with check (true);
create policy "files_delete" on files    for delete to anon, authenticated using (true);

-- ━━━ 第四步：创建存储桶 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 文章图片桶
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- 公司文件桶
insert into storage.buckets (id, name, public)
values ('company-files', 'company-files', true)
on conflict (id) do nothing;

-- ━━━ 第五步：存储桶 RLS 策略 ━━━━━━━━━━━━━━━━━━━━━━━━

-- 先删除可能存在的旧策略
drop policy if exists "post_images_select" on storage.objects;
drop policy if exists "post_images_insert" on storage.objects;
drop policy if exists "post_images_delete" on storage.objects;
drop policy if exists "company_files_select" on storage.objects;
drop policy if exists "company_files_insert" on storage.objects;
drop policy if exists "company_files_delete" on storage.objects;

-- post-images：公开读取 + 匿名上传 + 匿名删除
create policy "post_images_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'post-images');

create policy "post_images_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'post-images');

create policy "post_images_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'post-images');

-- company-files：公开读取 + 匿名上传 + 匿名删除
create policy "company_files_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'company-files');

create policy "company_files_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'company-files');

create policy "company_files_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'company-files');
