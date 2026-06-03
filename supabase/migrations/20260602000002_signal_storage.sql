insert into storage.buckets (id, name, public)
values 
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "Allow authenticated read access on attachments"
  on storage.objects for select
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');

create policy "Allow authenticated upload to attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

create policy "Users can delete own attachments"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
