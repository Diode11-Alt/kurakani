insert into storage.buckets (id, name, public)
values 
  ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "Allow public read access on attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "Allow authenticated upload to attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');
