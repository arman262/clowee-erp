-- ======================
-- ATTACHMENTS TABLE
-- ======================
create table attachments (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references franchises(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null, -- 'agreement_copy' or 'trade_nid_copy'
  file_size bigint,
  mime_type text,
  uploaded_at timestamp default now()
);

-- Add RLS policies
alter table attachments enable row level security;

-- Allow authenticated users to manage attachments
create policy "Users can manage attachments" on attachments
  for all using (auth.role() = 'authenticated');