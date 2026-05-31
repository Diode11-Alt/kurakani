-- ============================================================
-- Create Storage Buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('posts', 'posts', true),
  ('stories', 'stories', true),
  ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- ============================================================
-- Storage Policies for 'avatars'
-- ============================================================
create policy "Allow public read access on avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Allow authenticated upload to avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Allow user to update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Allow user to delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- ============================================================
-- Storage Policies for 'posts'
-- ============================================================
create policy "Allow public read access on posts"
  on storage.objects for select
  using (bucket_id = 'posts');

create policy "Allow authenticated upload to posts"
  on storage.objects for insert
  with check (bucket_id = 'posts' and auth.role() = 'authenticated');

create policy "Allow user to delete their own posts media"
  on storage.objects for delete
  using (bucket_id = 'posts' and auth.role() = 'authenticated');

-- ============================================================
-- Storage Policies for 'stories'
-- ============================================================
create policy "Allow public read access on stories"
  on storage.objects for select
  using (bucket_id = 'stories');

create policy "Allow authenticated upload to stories"
  on storage.objects for insert
  with check (bucket_id = 'stories' and auth.role() = 'authenticated');

create policy "Allow user to delete their own stories media"
  on storage.objects for delete
  using (bucket_id = 'stories' and auth.role() = 'authenticated');

-- ============================================================
-- Storage Policies for 'chat-media'
-- ============================================================
create policy "Allow public read access on chat-media"
  on storage.objects for select
  using (bucket_id = 'chat-media');

create policy "Allow authenticated upload to chat-media"
  on storage.objects for insert
  with check (bucket_id = 'chat-media' and auth.role() = 'authenticated');

create policy "Allow user to delete their own chat-media"
  on storage.objects for delete
  using (bucket_id = 'chat-media' and auth.role() = 'authenticated');
