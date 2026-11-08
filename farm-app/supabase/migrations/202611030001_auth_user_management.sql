-- Complete the authenticated user directory used by the administration frontend.

alter table public.profiles add column if not exists email text;

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email is not null
  and profile.email is distinct from lower(auth_user.email);

create unique index if not exists profiles_email_lower_idx
on public.profiles (lower(email))
where email is not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    is_active = true,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_user_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
  set email = lower(new.email), updated_at = now()
  where id = new.id;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_email_updated'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_email_updated
    after update of email on auth.users
    for each row execute function public.sync_user_email();
  end if;
end;
$$;
