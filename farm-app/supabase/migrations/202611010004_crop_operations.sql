-- Crop master data, farm seasons, planting sessions, observations and traceable harvests.

create type public.crop_category as enum ('perennial', 'seasonal', 'garden');
create type public.season_status as enum ('planning', 'active', 'closed', 'cancelled');
create type public.planting_status as enum ('planned', 'planted', 'growing', 'harvesting', 'closed', 'failed');
create type public.crop_observation_kind as enum ('routine', 'growth', 'pest', 'disease', 'weather', 'irrigation', 'damage');

create table public.crop_varieties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crop_name text not null,
  variety_name text not null,
  category public.crop_category not null,
  default_output_unit text not null default 'kg',
  typical_maturity_days integer check (typical_maturity_days is null or typical_maturity_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, crop_name, variety_name)
);
create index crop_varieties_org_category_idx on public.crop_varieties(organization_id, category, is_active);

create table public.farm_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  code text not null,
  starts_on date not null,
  ends_on date not null,
  status public.season_status not null default 'planning',
  rainfall_target_mm numeric(10,2) check (rainfall_target_mm is null or rainfall_target_mm >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (farm_id, code)
);
create index farm_seasons_org_farm_dates_idx on public.farm_seasons(organization_id, farm_id, starts_on desc);
create index farm_seasons_farm_status_idx on public.farm_seasons(farm_id, status);

create table public.planting_sessions (
  id uuid primary key,
  client_record_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  enterprise_id uuid not null references public.enterprises(id) on delete restrict,
  work_area_id uuid not null references public.work_areas(id) on delete restrict,
  crop_variety_id uuid not null references public.crop_varieties(id) on delete restrict,
  season_id uuid references public.farm_seasons(id) on delete restrict,
  planted_on date not null,
  area_value numeric(14,3) not null check (area_value > 0),
  area_unit text not null,
  planting_method text not null,
  seed_quantity numeric(18,3) check (seed_quantity is null or seed_quantity > 0),
  seed_unit text,
  plant_count integer check (plant_count is null or plant_count > 0),
  expected_harvest_start date,
  expected_harvest_end date,
  status public.planting_status not null default 'planned',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_harvest_start is null or expected_harvest_start >= planted_on),
  check (expected_harvest_end is null or expected_harvest_start is null or expected_harvest_end >= expected_harvest_start),
  check ((seed_quantity is null and seed_unit is null) or (seed_quantity is not null and seed_unit is not null))
);
create index planting_sessions_org_date_idx on public.planting_sessions(organization_id, planted_on desc);
create index planting_sessions_farm_status_idx on public.planting_sessions(farm_id, status, planted_on desc);
create index planting_sessions_enterprise_status_idx on public.planting_sessions(enterprise_id, status);
create index planting_sessions_work_area_id_idx on public.planting_sessions(work_area_id);
create index planting_sessions_crop_variety_id_idx on public.planting_sessions(crop_variety_id);
create index planting_sessions_season_id_idx on public.planting_sessions(season_id);
create index planting_sessions_created_by_idx on public.planting_sessions(created_by);

create table public.planting_session_inputs (
  id uuid primary key,
  planting_session_id uuid not null references public.planting_sessions(id) on delete cascade,
  input_name text not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  unit_cost numeric(18,2) check (unit_cost is null or unit_cost >= 0),
  created_at timestamptz not null default now()
);
create index planting_session_inputs_session_id_idx on public.planting_session_inputs(planting_session_id);

create table public.crop_observations (
  id uuid primary key,
  client_record_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  planting_session_id uuid not null references public.planting_sessions(id) on delete cascade,
  observed_on date not null,
  kind public.crop_observation_kind not null,
  growth_stage text,
  summary text not null,
  affected_area numeric(14,3) check (affected_area is null or affected_area >= 0),
  affected_area_unit text,
  action_required boolean not null default false,
  action_notes text,
  observed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((affected_area is null and affected_area_unit is null) or (affected_area is not null and affected_area_unit is not null))
);
create index crop_observations_org_date_idx on public.crop_observations(organization_id, observed_on desc);
create index crop_observations_session_date_idx on public.crop_observations(planting_session_id, observed_on desc);
create index crop_observations_observed_by_idx on public.crop_observations(observed_by);
create index crop_observations_action_required_idx on public.crop_observations(organization_id, action_required) where action_required;

create table public.harvest_batches (
  id uuid primary key,
  client_record_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  planting_session_id uuid not null references public.planting_sessions(id) on delete restrict,
  work_activity_id uuid references public.work_activities(id) on delete set null,
  harvested_on date not null,
  grade text,
  gross_quantity numeric(18,3) not null check (gross_quantity > 0),
  rejected_quantity numeric(18,3) not null default 0 check (rejected_quantity >= 0),
  net_quantity numeric(18,3) generated always as (gross_quantity - rejected_quantity) stored,
  unit text not null,
  destination text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (rejected_quantity <= gross_quantity)
);
create index harvest_batches_org_date_idx on public.harvest_batches(organization_id, harvested_on desc);
create index harvest_batches_session_date_idx on public.harvest_batches(planting_session_id, harvested_on desc);
create index harvest_batches_work_activity_id_idx on public.harvest_batches(work_activity_id);
create index harvest_batches_recorded_by_idx on public.harvest_batches(recorded_by);

create trigger crop_varieties_set_updated_at before update on public.crop_varieties
for each row execute function public.set_updated_at();
create trigger farm_seasons_set_updated_at before update on public.farm_seasons
for each row execute function public.set_updated_at();
create trigger planting_sessions_set_updated_at before update on public.planting_sessions
for each row execute function public.set_updated_at();

alter table public.crop_varieties enable row level security;
alter table public.farm_seasons enable row level security;
alter table public.planting_sessions enable row level security;
alter table public.planting_session_inputs enable row level security;
alter table public.crop_observations enable row level security;
alter table public.harvest_batches enable row level security;

grant select, insert, update on public.crop_varieties, public.farm_seasons,
  public.planting_sessions, public.planting_session_inputs,
  public.crop_observations, public.harvest_batches to authenticated;

create policy crop_varieties_select on public.crop_varieties for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy crop_varieties_manage on public.crop_varieties for all to authenticated
using ((select public.has_org_role(organization_id, array['ceo','administrator','farm_manager']::public.app_role[])))
with check ((select public.has_org_role(organization_id, array['ceo','administrator','farm_manager']::public.app_role[])));

create policy farm_seasons_select on public.farm_seasons for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy farm_seasons_manage on public.farm_seasons for all to authenticated
using ((select public.has_org_role(organization_id, array['ceo','administrator','farm_manager']::public.app_role[])))
with check ((select public.has_org_role(organization_id, array['ceo','administrator','farm_manager']::public.app_role[])));

create policy planting_sessions_select on public.planting_sessions for select to authenticated
using ((select public.is_org_member(organization_id)) and (created_by = (select auth.uid()) or (select public.can_access_enterprise(enterprise_id, true))));
create policy planting_sessions_insert on public.planting_sessions for insert to authenticated
with check (created_by = (select auth.uid()) and (select public.is_org_member(organization_id)) and (select public.can_access_enterprise(enterprise_id, false)));
create policy planting_sessions_update on public.planting_sessions for update to authenticated
using ((created_by = (select auth.uid()) and status in ('planned','planted','growing')) or (select public.can_access_enterprise(enterprise_id, true)))
with check ((select public.is_org_member(organization_id)));

create policy planting_session_inputs_select on public.planting_session_inputs for select to authenticated
using (exists (select 1 from public.planting_sessions p where p.id = planting_session_id));
create policy planting_session_inputs_insert on public.planting_session_inputs for insert to authenticated
with check (exists (select 1 from public.planting_sessions p where p.id = planting_session_id and (p.created_by = (select auth.uid()) or (select public.can_access_enterprise(p.enterprise_id, true)))));
create policy planting_session_inputs_update on public.planting_session_inputs for update to authenticated
using (exists (select 1 from public.planting_sessions p where p.id = planting_session_id and (p.created_by = (select auth.uid()) or (select public.can_access_enterprise(p.enterprise_id, true)))));

create policy crop_observations_select on public.crop_observations for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy crop_observations_insert on public.crop_observations for insert to authenticated
with check (observed_by = (select auth.uid()) and (select public.is_org_member(organization_id)) and exists (
  select 1 from public.planting_sessions p where p.id = planting_session_id and (select public.can_access_enterprise(p.enterprise_id, false))
));
create policy crop_observations_update on public.crop_observations for update to authenticated
using (observed_by = (select auth.uid()) or exists (
  select 1 from public.planting_sessions p where p.id = planting_session_id and (select public.can_access_enterprise(p.enterprise_id, true))
));

create policy harvest_batches_select on public.harvest_batches for select to authenticated
using ((select public.is_org_member(organization_id)));
create policy harvest_batches_insert on public.harvest_batches for insert to authenticated
with check (recorded_by = (select auth.uid()) and (select public.is_org_member(organization_id)) and exists (
  select 1 from public.planting_sessions p where p.id = planting_session_id and (select public.can_access_enterprise(p.enterprise_id, false))
));
create policy harvest_batches_update on public.harvest_batches for update to authenticated
using (recorded_by = (select auth.uid()) or exists (
  select 1 from public.planting_sessions p where p.id = planting_session_id and (select public.can_access_enterprise(p.enterprise_id, true))
));
