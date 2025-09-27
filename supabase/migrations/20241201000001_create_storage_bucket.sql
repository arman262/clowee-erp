-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true);

-- Allow authenticated users to upload files
create policy "Users can upload attachments" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- Allow public access to view files
create policy "Public can view attachments" on storage.objects
  for select using (bucket_id = 'attachments');

-- Allow users to delete their own uploads
create policy "Users can delete attachments" on storage.objects
  for delete using (bucket_id = 'attachments' and auth.role() = 'authenticated');