-- Stage 2: scoped synchronization envelope for module-local offline records.
-- Each row is a current-state record or a tombstone. The client keeps failed
-- envelopes locally so a transient outage or a stale-write conflict is visible
-- and recoverable instead of being silently overwritten.

create table if not exists public.farm_sync_records (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  database_name text not null check (database_name in (
    'ntamba-animal-records', 'ntamba-crop-master', 'ntamba-inventory',
    'ntamba-finance', 'ntamba-qhse', 'ntamba-administration'
  )),
  table_name text not null check (length(table_name) between 1 and 80),
  record_key text not null check (length(record_key) between 1 and 200),
  operation text not null check (operation in ('upsert', 'delete')),
  payload jsonb,
  client_updated_at timestamptz not null,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farm_sync_records_payload_check check (
    (operation = 'delete' and payload is null)
    or (operation = 'upsert' and payload is not null and octet_length(payload::text) <= 262144)
  ),
  constraint farm_sync_records_scope_key unique (organization_id, farm_id, database_name, table_name, record_key)
);

create index if not exists farm_sync_records_scope_idx
  on public.farm_sync_records(organization_id, farm_id, database_name, table_name);
create index if not exists farm_sync_records_updated_at_idx
  on public.farm_sync_records(updated_at desc);

create or replace function public.set_farm_sync_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id
       or new.farm_id is distinct from old.farm_id
       or new.database_name is distinct from old.database_name
       or new.table_name is distinct from old.table_name
       or new.record_key is distinct from old.record_key then
      raise exception using errcode = 'P0001', message = 'SYNC_SCOPE_IMMUTABLE';
    end if;
    if new.client_updated_at < old.client_updated_at then
      raise exception using errcode = 'P0001', message = 'STALE_SYNC_RECORD';
    end if;
    if new.client_updated_at = old.client_updated_at
       and (new.operation is distinct from old.operation or new.payload is distinct from old.payload) then
      raise exception using errcode = 'P0001', message = 'SYNC_TIMESTAMP_CONFLICT';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists farm_sync_records_set_updated_at on public.farm_sync_records;
create trigger farm_sync_records_set_updated_at
before update on public.farm_sync_records
for each row execute function public.set_farm_sync_updated_at();

alter table public.farm_sync_records enable row level security;
alter table public.farm_sync_records replica identity full;
revoke all on public.farm_sync_records from anon;
grant select, insert, update on public.farm_sync_records to authenticated;

drop policy if exists farm_sync_records_select on public.farm_sync_records;
create policy farm_sync_records_select
on public.farm_sync_records for select to authenticated
using (
  (select public.is_org_member(organization_id))
  and (
    farm_id is null
    or exists (
      select 1 from public.memberships m
      where m.organization_id = farm_sync_records.organization_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
        and (m.farm_id is null or m.farm_id = farm_sync_records.farm_id)
    )
  )
);

drop policy if exists farm_sync_records_insert on public.farm_sync_records;
create policy farm_sync_records_insert
on public.farm_sync_records for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and (select public.is_org_member(organization_id))
  and (
    farm_id is null
    or exists (
      select 1 from public.memberships m
      where m.organization_id = farm_sync_records.organization_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
        and (m.farm_id is null or m.farm_id = farm_sync_records.farm_id)
    )
  )
);

drop policy if exists farm_sync_records_update on public.farm_sync_records;
create policy farm_sync_records_update
on public.farm_sync_records for update to authenticated
using (
  (select public.is_org_member(organization_id))
  and (
    farm_id is null
    or exists (
      select 1 from public.memberships m
      where m.organization_id = farm_sync_records.organization_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
        and (m.farm_id is null or m.farm_id = farm_sync_records.farm_id)
    )
  )
)
with check (
  updated_by = (select auth.uid())
  and (select public.is_org_member(organization_id))
  and (
    farm_id is null
    or exists (
      select 1 from public.memberships m
      where m.organization_id = farm_sync_records.organization_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
        and (m.farm_id is null or m.farm_id = farm_sync_records.farm_id)
    )
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'farm_sync_records'
     ) then
    alter publication supabase_realtime add table public.farm_sync_records;
  end if;
end
$$;
