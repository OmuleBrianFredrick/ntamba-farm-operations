-- Enforce the organization/farm scope encoded by the protected document path.
-- Paths created by the client follow:
-- organization-id / farm-id-or-all-farms / module / record-id / file-name

create or replace function public.is_farm_document_member(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select coalesce(array_length(storage.foldername(object_name), 1), 0) >= 5
    and exists (
      select 1
      from public.memberships m
      where m.organization_id::text = (storage.foldername(object_name))[1]
        and m.is_active = true
        and (
          (m.farm_id is null and (storage.foldername(object_name))[2] = 'all-farms')
          or m.farm_id::text = (storage.foldername(object_name))[2]
        )
    );
$$;

drop policy if exists "farm documents read members" on storage.objects;
drop policy if exists "farm documents upload members" on storage.objects;
drop policy if exists "farm documents update members" on storage.objects;
drop policy if exists "farm documents delete members" on storage.objects;

create policy "farm documents read members"
on storage.objects for select
to authenticated
using (bucket_id = 'farm-documents' and public.is_farm_document_member(name));

create policy "farm documents upload members"
on storage.objects for insert
to authenticated
with check (bucket_id = 'farm-documents' and public.is_farm_document_member(name));

create policy "farm documents update members"
on storage.objects for update
to authenticated
using (bucket_id = 'farm-documents' and public.is_farm_document_member(name))
with check (bucket_id = 'farm-documents' and public.is_farm_document_member(name));

create policy "farm documents delete members"
on storage.objects for delete
to authenticated
using (bucket_id = 'farm-documents' and public.is_farm_document_member(name));
