-- Public demonstration data is physically separated from all farm tables.
-- Visitors can only read and edit records in this demo-only table.
create table if not exists public.public_demo_records (
  id text primary key,
  database_name text not null check (database_name in (
    'ntamba-farm-operations', 'ntamba-animal-records', 'ntamba-crop-master',
    'ntamba-inventory', 'ntamba-finance', 'ntamba-qhse', 'ntamba-administration'
  )),
  table_name text not null check (length(table_name) between 1 and 80),
  record_key text not null check (length(record_key) between 1 and 200),
  payload jsonb not null check (octet_length(payload::text) <= 65536),
  writer_id text not null check (length(writer_id) between 1 and 80),
  updated_at timestamptz not null default now(),
  constraint public_demo_records_key_unique unique (database_name, table_name, record_key)
);

alter table public.public_demo_records enable row level security;
alter table public.public_demo_records replica identity full;
revoke all on table public.public_demo_records from anon, authenticated;
grant select, insert, update, delete on table public.public_demo_records to anon;

drop policy if exists public_demo_records_visitor_access on public.public_demo_records;
create policy public_demo_records_visitor_access
  on public.public_demo_records
  for all
  to anon
  using (true)
  with check (true);

-- Do not grant any demo role access to production operational tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'public_demo_records'
     ) then
    alter publication supabase_realtime add table public.public_demo_records;
  end if;
end
$$;
