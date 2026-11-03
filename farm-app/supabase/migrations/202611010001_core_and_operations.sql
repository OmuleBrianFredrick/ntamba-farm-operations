-- Ntamba Farm Operations - core tenancy, identity, permissions and daily work.
-- UUIDs are intentional: records are created offline on distributed devices.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum (
  'ceo', 'administrator', 'farm_manager', 'accountant', 'qhse_lead',
  'enterprise_supervisor', 'storekeeper', 'communications_officer', 'worker', 'auditor'
);
create type public.enterprise_kind as enum (
  'banana', 'coffee', 'seasonal_crops', 'garden_crops', 'dairy_cattle',
  'cattle', 'goats_sheep', 'pigs', 'poultry', 'fish', 'apiary', 'other'
);
create type public.record_status as enum (
  'draft', 'queued', 'submitted', 'under_review', 'approved', 'rejected', 'voided'
);
create type public.pay_basis as enum ('monthly_salary', 'daily_wage', 'task_rate', 'mixed');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  currency_code text not null default 'UGX' check (currency_code ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Kampala',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  country_code text not null default 'UG' check (country_code ~ '^[A-Z]{2}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index farms_organization_id_idx on public.farms(organization_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone text,
  preferred_language text not null default 'en',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, farm_id, user_id, role)
);
create index memberships_user_org_idx on public.memberships(user_id, organization_id) where is_active;
create index memberships_farm_id_idx on public.memberships(farm_id);

create table public.enterprises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  kind public.enterprise_kind not null,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, code)
);
create index enterprises_org_farm_idx on public.enterprises(organization_id, farm_id);

create table public.enterprise_assignments (
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_submit boolean not null default true,
  can_review boolean not null default false,
  assigned_at timestamptz not null default now(),
  primary key (enterprise_id, user_id)
);
create index enterprise_assignments_user_id_idx on public.enterprise_assignments(user_id);

create table public.work_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  enterprise_id uuid references public.enterprises(id) on delete set null,
  name text not null,
  code text not null,
  area_value numeric(14,3) check (area_value is null or area_value >= 0),
  area_unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (farm_id, code)
);
create index work_areas_org_farm_idx on public.work_areas(organization_id, farm_id);
create index work_areas_enterprise_id_idx on public.work_areas(enterprise_id);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  linked_user_id uuid references public.profiles(id) on delete set null,
  employee_number text not null,
  display_name text not null,
  pay_basis public.pay_basis not null,
  default_rate numeric(18,2) check (default_rate is null or default_rate >= 0),
  is_active boolean not null default true,
  started_on date,
  ended_on date check (ended_on is null or started_on is null or ended_on >= started_on),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_number)
);
create index workers_org_farm_active_idx on public.workers(organization_id, farm_id, is_active);
create index workers_linked_user_id_idx on public.workers(linked_user_id);

create table public.work_activities (
  id uuid primary key,
  client_record_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  enterprise_id uuid not null references public.enterprises(id) on delete restrict,
  work_area_id uuid references public.work_areas(id) on delete set null,
  record_date date not null,
  activity_type text not null,
  description text,
  status public.record_status not null default 'draft',
  started_at timestamptz,
  ended_at timestamptz,
  output_quantity numeric(18,3) check (output_quantity is null or output_quantity >= 0),
  rejected_quantity numeric(18,3) not null default 0 check (rejected_quantity >= 0),
  output_unit text,
  problems text,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz,
  server_received_at timestamptz not null default now(),
  revision_of uuid references public.work_activities(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at),
  check (output_quantity is null or rejected_quantity <= output_quantity)
);
create index work_activities_org_date_idx on public.work_activities(organization_id, record_date desc);
create index work_activities_farm_status_date_idx on public.work_activities(farm_id, status, record_date desc);
create index work_activities_enterprise_date_idx on public.work_activities(enterprise_id, record_date desc);
create index work_activities_submitted_by_idx on public.work_activities(submitted_by);
create index work_activities_revision_of_idx on public.work_activities(revision_of);

create table public.work_activity_workers (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.work_activities(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete restrict,
  attendance_status text not null default 'present' check (attendance_status in ('present','absent','leave','sick')),
  hours_worked numeric(8,2) check (hours_worked is null or hours_worked between 0 and 24),
  quantity_completed numeric(18,3) check (quantity_completed is null or quantity_completed >= 0),
  approved_earning numeric(18,2) check (approved_earning is null or approved_earning >= 0),
  notes text,
  unique (activity_id, worker_id)
);
create index work_activity_workers_worker_id_idx on public.work_activity_workers(worker_id);

create table public.input_usage (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.work_activities(id) on delete cascade,
  input_name text not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  unit_cost numeric(18,2) check (unit_cost is null or unit_cost >= 0),
  created_at timestamptz not null default now()
);
create index input_usage_activity_id_idx on public.input_usage(activity_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_events_org_time_idx on public.audit_events(organization_id, occurred_at desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger farms_set_updated_at before update on public.farms
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger enterprises_set_updated_at before update on public.enterprises
for each row execute function public.set_updated_at();
create trigger workers_set_updated_at before update on public.workers
for each row execute function public.set_updated_at();
create trigger work_activities_set_updated_at before update on public.work_activities
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.is_active
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_organization_id
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
      and m.is_active
  );
$$;

create or replace function public.can_access_enterprise(target_enterprise_id uuid, require_review boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.enterprises e
    where e.id = target_enterprise_id
      and (
        public.has_org_role(e.organization_id, array['ceo','administrator','farm_manager']::public.app_role[])
        or exists (
          select 1 from public.enterprise_assignments a
          where a.enterprise_id = e.id
            and a.user_id = (select auth.uid())
            and case when require_review then a.can_review else a.can_submit end
        )
      )
  );
$$;

alter table public.organizations enable row level security;
alter table public.farms enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.enterprises enable row level security;
alter table public.enterprise_assignments enable row level security;
alter table public.work_areas enable row level security;
alter table public.workers enable row level security;
alter table public.work_activities enable row level security;
alter table public.work_activity_workers enable row level security;
alter table public.input_usage enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select on public.organizations, public.farms, public.profiles, public.memberships,
  public.enterprises, public.enterprise_assignments, public.work_areas, public.workers to authenticated;
grant select, insert, update on public.work_activities, public.work_activity_workers, public.input_usage to authenticated;
grant select on public.audit_events to authenticated;

create policy organizations_select on public.organizations for select to authenticated
using ((select public.is_org_member(id)));
create policy farms_select on public.farms for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy profiles_self_select on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_management_select on public.profiles for select to authenticated
using (exists (
  select 1 from public.memberships target_m
  where target_m.user_id = profiles.id
    and public.has_org_role(target_m.organization_id, array['ceo','administrator','farm_manager']::public.app_role[])
));
create policy memberships_select on public.memberships for select to authenticated
using (user_id = (select auth.uid()) or public.has_org_role(organization_id, array['ceo','administrator','farm_manager']::public.app_role[]));
create policy enterprises_select on public.enterprises for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy enterprise_assignments_select on public.enterprise_assignments for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.enterprises e
  where e.id = enterprise_assignments.enterprise_id
    and public.has_org_role(e.organization_id, array['ceo','administrator','farm_manager']::public.app_role[])
));
create policy work_areas_select on public.work_areas for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy workers_select on public.workers for select to authenticated
using ((select public.is_org_member(organization_id)));

create policy work_activities_select on public.work_activities for select to authenticated
using (
  submitted_by = (select auth.uid())
  or public.can_access_enterprise(enterprise_id, true)
  or public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant','qhse_lead']::public.app_role[])
);
create policy work_activities_insert on public.work_activities for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and public.is_org_member(organization_id)
  and public.can_access_enterprise(enterprise_id, false)
);
create policy work_activities_update on public.work_activities for update to authenticated
using (
  (submitted_by = (select auth.uid()) and status in ('draft','queued','rejected'))
  or public.can_access_enterprise(enterprise_id, true)
)
with check (public.is_org_member(organization_id));

create policy work_activity_workers_select on public.work_activity_workers for select to authenticated
using (exists (select 1 from public.work_activities a where a.id = activity_id));
create policy work_activity_workers_insert on public.work_activity_workers for insert to authenticated
with check (exists (
  select 1 from public.work_activities a
  where a.id = activity_id and (a.submitted_by = (select auth.uid()) or public.can_access_enterprise(a.enterprise_id, true))
));
create policy work_activity_workers_update on public.work_activity_workers for update to authenticated
using (exists (
  select 1 from public.work_activities a
  where a.id = activity_id and (a.submitted_by = (select auth.uid()) or public.can_access_enterprise(a.enterprise_id, true))
));

create policy input_usage_select on public.input_usage for select to authenticated
using (exists (select 1 from public.work_activities a where a.id = activity_id));
create policy input_usage_insert on public.input_usage for insert to authenticated
with check (exists (
  select 1 from public.work_activities a
  where a.id = activity_id and (a.submitted_by = (select auth.uid()) or public.can_access_enterprise(a.enterprise_id, true))
));
create policy input_usage_update on public.input_usage for update to authenticated
using (exists (
  select 1 from public.work_activities a
  where a.id = activity_id and (a.submitted_by = (select auth.uid()) or public.can_access_enterprise(a.enterprise_id, true))
));

create policy audit_events_select on public.audit_events for select to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant','qhse_lead','auditor']::public.app_role[]));
