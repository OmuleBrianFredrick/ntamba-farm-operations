-- storage.foldername() returns only directory segments; the file name is not included.
-- A valid protected path is organization / farm / module / record / file.
create or replace function public.is_farm_document_member(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select coalesce(array_length(storage.foldername(object_name), 1), 0) >= 4
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
