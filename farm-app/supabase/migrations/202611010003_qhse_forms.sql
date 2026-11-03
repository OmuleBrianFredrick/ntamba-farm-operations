-- Controlled QHSE form catalogue and hierarchical assignments.

create type public.form_frequency as enum ('daily', 'weekly', 'scheduled', 'per_event', 'before_task', 'per_cycle');

create table public.form_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  title text not null,
  category text not null,
  version integer not null default 1 check (version > 0),
  frequency public.form_frequency not null,
  is_event_triggered boolean not null default false,
  is_active boolean not null default true,
  schema_definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, code, version)
);
create index form_catalog_org_active_idx on public.form_catalog(organization_id, is_active);

create table public.form_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid not null references public.form_catalog(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  enterprise_id uuid references public.enterprises(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role public.app_role,
  can_submit boolean not null default true,
  can_review boolean not null default false,
  is_required boolean not null default false,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  check (user_id is not null or role is not null),
  check (effective_to is null or effective_to >= effective_from)
);
create index form_assignments_org_user_idx on public.form_assignments(organization_id, user_id);
create index form_assignments_form_id_idx on public.form_assignments(form_id);
create index form_assignments_enterprise_id_idx on public.form_assignments(enterprise_id);

create table public.form_submissions (
  id uuid primary key,
  client_record_id uuid not null unique,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  enterprise_id uuid references public.enterprises(id) on delete restrict,
  form_id uuid not null references public.form_catalog(id) on delete restrict,
  form_version integer not null,
  record_reference text not null,
  status public.record_status not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz,
  server_received_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  revision_of uuid references public.form_submissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, record_reference)
);
create index form_submissions_org_form_date_idx on public.form_submissions(organization_id, form_id, created_at desc);
create index form_submissions_farm_status_idx on public.form_submissions(farm_id, status, created_at desc);
create index form_submissions_submitter_idx on public.form_submissions(submitted_by, created_at desc);
create index form_submissions_enterprise_id_idx on public.form_submissions(enterprise_id);
create index form_submissions_revision_of_idx on public.form_submissions(revision_of);

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  source_submission_id uuid references public.form_submissions(id) on delete restrict,
  source_activity_id uuid references public.work_activities(id) on delete restrict,
  title text not null,
  description text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  due_date date not null,
  status text not null default 'open' check (status in ('open','overdue','complete_awaiting_verification','closed','reopened')),
  completion_evidence text,
  completed_at timestamptz,
  verified_by uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_submission_id is not null or source_activity_id is not null)
);
create index corrective_actions_org_status_due_idx on public.corrective_actions(organization_id, status, due_date);
create index corrective_actions_owner_idx on public.corrective_actions(owner_user_id, status, due_date);
create index corrective_actions_submission_id_idx on public.corrective_actions(source_submission_id);
create index corrective_actions_activity_id_idx on public.corrective_actions(source_activity_id);

create trigger form_catalog_set_updated_at before update on public.form_catalog
for each row execute function public.set_updated_at();
create trigger form_submissions_set_updated_at before update on public.form_submissions
for each row execute function public.set_updated_at();
create trigger corrective_actions_set_updated_at before update on public.corrective_actions
for each row execute function public.set_updated_at();

alter table public.form_catalog enable row level security;
alter table public.form_assignments enable row level security;
alter table public.form_submissions enable row level security;
alter table public.corrective_actions enable row level security;

grant select on public.form_catalog, public.form_assignments to authenticated;
grant select, insert, update on public.form_submissions, public.corrective_actions to authenticated;

create policy form_catalog_select on public.form_catalog for select to authenticated
using (organization_id is null or public.is_org_member(organization_id));
create policy form_assignments_select on public.form_assignments for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_org_role(organization_id, array['ceo','administrator','farm_manager','qhse_lead']::public.app_role[])
);
create policy form_submissions_select on public.form_submissions for select to authenticated
using (
  submitted_by = (select auth.uid())
  or public.has_org_role(organization_id, array['ceo','administrator','farm_manager','qhse_lead']::public.app_role[])
);
create policy form_submissions_insert on public.form_submissions for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and public.is_org_member(organization_id)
  and exists (
    select 1 from public.form_assignments fa
    join public.memberships m on m.organization_id = fa.organization_id and m.user_id = (select auth.uid()) and m.is_active
    where fa.form_id = form_submissions.form_id
      and fa.organization_id = form_submissions.organization_id
      and fa.can_submit
      and current_date between fa.effective_from and coalesce(fa.effective_to, 'infinity'::date)
      and (fa.user_id = (select auth.uid()) or fa.role = m.role)
      and (fa.farm_id is null or fa.farm_id = form_submissions.farm_id)
      and (fa.enterprise_id is null or fa.enterprise_id = form_submissions.enterprise_id)
  )
);
create policy form_submissions_update on public.form_submissions for update to authenticated
using (
  (submitted_by = (select auth.uid()) and status in ('draft','queued','rejected'))
  or public.has_org_role(organization_id, array['ceo','administrator','farm_manager','qhse_lead']::public.app_role[])
)
with check (public.is_org_member(organization_id));

create policy corrective_actions_select on public.corrective_actions for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or public.has_org_role(organization_id, array['ceo','administrator','farm_manager','qhse_lead']::public.app_role[])
);
create policy corrective_actions_insert on public.corrective_actions for insert to authenticated
with check (public.is_org_member(organization_id));
create policy corrective_actions_update on public.corrective_actions for update to authenticated
using (
  owner_user_id = (select auth.uid())
  or public.has_org_role(organization_id, array['ceo','administrator','farm_manager','qhse_lead']::public.app_role[])
)
with check (public.is_org_member(organization_id));

insert into public.form_catalog (organization_id, code, title, category, frequency, is_event_triggered)
values
  (null,'QHSE-01','Daily farm QHSE inspection','Safety and inspection','daily',false),
  (null,'QHSE-02','Task risk assessment','Safety and inspection','before_task',true),
  (null,'QHSE-03','Toolbox talk and attendance','Safety and inspection','before_task',true),
  (null,'QHSE-04','Hazard and incident report','Incident and action','per_event',true),
  (null,'QHSE-05','Corrective action and effectiveness','Incident and action','per_event',true),
  (null,'QHSE-06','Emergency equipment inspection','Emergency readiness','scheduled',false),
  (null,'QHSE-07','Emergency drill evaluation','Emergency readiness','scheduled',true),
  (null,'QHSE-08','PPE issue and fit verification','People and competence','per_event',true),
  (null,'QHSE-09','Machinery and vehicle pre-use check','Assets and maintenance','before_task',false),
  (null,'QHSE-10','Chemical inventory and store inspection','Inputs and environment','scheduled',false),
  (null,'QHSE-11','Pesticide application and release','Inputs and environment','per_event',true),
  (null,'QHSE-12','Fertilizer and soil amendment application','Inputs and environment','per_event',true),
  (null,'QHSE-13','Water and irrigation monitoring','Inputs and environment','per_event',false),
  (null,'QHSE-14','Waste segregation and disposal','Inputs and environment','per_event',true),
  (null,'QHSE-15','Environmental site inspection','Inputs and environment','scheduled',false),
  (null,'QHSE-16','Harvest quality and traceability','Quality and traceability','per_event',true),
  (null,'QHSE-17','Cleaning and hygiene verification','Quality and traceability','per_event',false),
  (null,'QHSE-18','Nonconforming product and hold release','Quality and traceability','per_event',true),
  (null,'QHSE-19','Visitor and contractor induction','People and competence','per_event',true),
  (null,'QHSE-20','Farm training and competence assessment','People and competence','per_event',true),
  (null,'QHSE-21','Livestock biosecurity and treatment','Livestock','per_event',true),
  (null,'QHSE-22','Maintenance and return to service','Assets and maintenance','per_event',true),
  (null,'QHSE-23','Crop block and planting register','Crop production','per_cycle',true),
  (null,'QHSE-24','Banana plantation husbandry log','Crop production','per_event',false),
  (null,'QHSE-25','Coffee plantation husbandry log','Crop production','per_event',false),
  (null,'QHSE-26','Seasonal crop activity and scouting','Crop production','per_event',false),
  (null,'QHSE-27','Daily dairy milk and hygiene record','Livestock','daily',false),
  (null,'QHSE-28','Animal identity and breeding record','Livestock','per_event',true),
  (null,'QHSE-29','Daily livestock feed and welfare','Livestock','daily',false),
  (null,'QHSE-30','Daily poultry flock record','Poultry','daily',false),
  (null,'QHSE-31','Fish pond daily water and feeding','Aquaculture','daily',false),
  (null,'QHSE-32','Fish stocking sampling and harvest','Aquaculture','per_event',true),
  (null,'QHSE-33','Apiary hive inspection and harvest','Apiary','per_event',true),
  (null,'QHSE-34','Animal movement and quarantine','Livestock','per_event',true),
  (null,'QHSE-35','Animal mortality and carcass disposal','Livestock','per_event',true),
  (null,'QHSE-36','Animal preventive health schedule','Livestock','scheduled',false),
  (null,'QHSE-37','Employee attendance and work allocation','Workforce','daily',false),
  (null,'QHSE-38','Farm manager weekly plan and review','Management','weekly',false);
