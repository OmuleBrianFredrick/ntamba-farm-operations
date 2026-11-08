-- Protected evidence and supporting-document storage for the farm application.
-- The bucket was created in the live project with the same settings.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'farm-documents',
  'farm-documents',
  false,
  20971520,
  array[
    'image/*',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "farm documents read members" on storage.objects;
drop policy if exists "farm documents upload members" on storage.objects;
drop policy if exists "farm documents update members" on storage.objects;
drop policy if exists "farm documents delete members" on storage.objects;

create policy "farm documents read members"
on storage.objects for select
to authenticated
using (
  bucket_id = 'farm-documents'
  and exists (
    select 1 from public.memberships m
    where m.organization_id = '10000000-0000-4000-8000-000000000001'::uuid
      and m.user_id = (select auth.uid())
      and m.is_active = true
      and (m.farm_id is null or m.farm_id = '20000000-0000-4000-8000-000000000001'::uuid)
  )
);

create policy "farm documents upload members"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'farm-documents'
  and exists (
    select 1 from public.memberships m
    where m.organization_id = '10000000-0000-4000-8000-000000000001'::uuid
      and m.user_id = (select auth.uid())
      and m.is_active = true
      and (m.farm_id is null or m.farm_id = '20000000-0000-4000-8000-000000000001'::uuid)
  )
);

create policy "farm documents update members"
on storage.objects for update
to authenticated
using (
  bucket_id = 'farm-documents'
  and exists (
    select 1 from public.memberships m
    where m.organization_id = '10000000-0000-4000-8000-000000000001'::uuid
      and m.user_id = (select auth.uid())
      and m.is_active = true
      and (m.farm_id is null or m.farm_id = '20000000-0000-4000-8000-000000000001'::uuid)
  )
)
with check (
  bucket_id = 'farm-documents'
  and exists (
    select 1 from public.memberships m
    where m.organization_id = '10000000-0000-4000-8000-000000000001'::uuid
      and m.user_id = (select auth.uid())
      and m.is_active = true
      and (m.farm_id is null or m.farm_id = '20000000-0000-4000-8000-000000000001'::uuid)
  )
);

create policy "farm documents delete members"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'farm-documents'
  and exists (
    select 1 from public.memberships m
    where m.organization_id = '10000000-0000-4000-8000-000000000001'::uuid
      and m.user_id = (select auth.uid())
      and m.is_active = true
      and (m.farm_id is null or m.farm_id = '20000000-0000-4000-8000-000000000001'::uuid)
  )
);
