-- Double-entry finance, parties, invoices, payments and outstanding wages.

create type public.account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');
create type public.journal_status as enum ('draft', 'posted', 'reversed');
create type public.party_type as enum ('customer', 'supplier', 'both');
create type public.invoice_type as enum ('sale', 'purchase');
create type public.invoice_status as enum ('draft', 'issued', 'part_paid', 'paid', 'voided');
create type public.payment_direction as enum ('received', 'paid');
create type public.payment_method as enum ('cash', 'mobile_money', 'bank', 'other');

create table public.chart_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  account_type public.account_type not null,
  parent_id uuid references public.chart_accounts(id) on delete restrict,
  is_control_account boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index chart_accounts_org_type_idx on public.chart_accounts(organization_id, account_type);
create index chart_accounts_parent_id_idx on public.chart_accounts(parent_id);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  party_type public.party_type not null,
  name text not null,
  phone text,
  email text,
  address text,
  tax_identifier text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parties_org_type_name_idx on public.parties(organization_id, party_type, name);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid references public.farms(id) on delete restrict,
  entry_number bigint generated always as identity,
  entry_date date not null,
  description text not null,
  status public.journal_status not null default 'draft',
  source_type text not null,
  source_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  posted_by uuid references public.profiles(id) on delete restrict,
  posted_at timestamptz,
  reversal_of uuid references public.journal_entries(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entry_number),
  check ((status = 'posted' and posted_by is not null and posted_at is not null) or status <> 'posted')
);
create index journal_entries_org_date_idx on public.journal_entries(organization_id, entry_date desc);
create index journal_entries_source_idx on public.journal_entries(source_type, source_id);
create index journal_entries_reversal_of_idx on public.journal_entries(reversal_of);

create table public.journal_lines (
  id bigint generated always as identity primary key,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_accounts(id) on delete restrict,
  enterprise_id uuid references public.enterprises(id) on delete restrict,
  work_area_id uuid references public.work_areas(id) on delete restrict,
  party_id uuid references public.parties(id) on delete restrict,
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index journal_lines_entry_id_idx on public.journal_lines(journal_entry_id);
create index journal_lines_account_entry_idx on public.journal_lines(account_id, journal_entry_id);
create index journal_lines_enterprise_id_idx on public.journal_lines(enterprise_id);
create index journal_lines_party_id_idx on public.journal_lines(party_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete restrict,
  enterprise_id uuid references public.enterprises(id) on delete restrict,
  invoice_type public.invoice_type not null,
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  status public.invoice_status not null default 'draft',
  currency_code text not null default 'UGX',
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0),
  delivery_cost numeric(18,2) not null default 0 check (delivery_cost >= 0),
  total_amount numeric(18,2) generated always as (subtotal + tax_amount + delivery_cost) stored,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_type, invoice_number),
  check (due_date is null or due_date >= invoice_date)
);
create index invoices_org_type_status_date_idx on public.invoices(organization_id, invoice_type, status, invoice_date desc);
create index invoices_party_id_idx on public.invoices(party_id);
create index invoices_enterprise_id_idx on public.invoices(enterprise_id);

create table public.invoice_lines (
  id bigint generated always as identity primary key,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  unit_price numeric(18,2) not null check (unit_price >= 0),
  line_amount numeric(18,2) generated always as (round(quantity * unit_price, 2)) stored,
  account_id uuid not null references public.chart_accounts(id) on delete restrict,
  work_activity_id uuid references public.work_activities(id) on delete restrict
);
create index invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);
create index invoice_lines_account_id_idx on public.invoice_lines(account_id);
create index invoice_lines_work_activity_id_idx on public.invoice_lines(work_activity_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  party_id uuid references public.parties(id) on delete restrict,
  direction public.payment_direction not null,
  payment_date date not null,
  method public.payment_method not null,
  account_id uuid not null references public.chart_accounts(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  reference text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index payments_org_date_idx on public.payments(organization_id, payment_date desc);
create index payments_party_id_idx on public.payments(party_id);
create index payments_account_id_idx on public.payments(account_id);

create table public.payment_allocations (
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  allocated_amount numeric(18,2) not null check (allocated_amount > 0),
  allocated_at timestamptz not null default now(),
  primary key (payment_id, invoice_id)
);
create index payment_allocations_invoice_id_idx on public.payment_allocations(invoice_id);

create table public.wage_accruals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  worker_id uuid not null references public.workers(id) on delete restrict,
  activity_worker_id uuid references public.work_activity_workers(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  gross_earning numeric(18,2) not null check (gross_earning >= 0),
  authorized_deduction numeric(18,2) not null default 0 check (authorized_deduction >= 0),
  advance_applied numeric(18,2) not null default 0 check (advance_applied >= 0),
  net_payable numeric(18,2) generated always as (gross_earning - authorized_deduction - advance_applied) stored,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (gross_earning >= authorized_deduction + advance_applied)
);
create index wage_accruals_worker_period_idx on public.wage_accruals(worker_id, period_end desc);
create index wage_accruals_org_period_idx on public.wage_accruals(organization_id, period_end desc);
create index wage_accruals_activity_worker_id_idx on public.wage_accruals(activity_worker_id);

create table public.wage_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  worker_id uuid not null references public.workers(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  unique (worker_id, payment_id)
);
create index wage_payments_org_worker_idx on public.wage_payments(organization_id, worker_id);
create index wage_payments_payment_id_idx on public.wage_payments(payment_id);

create or replace view public.invoice_balances
with (security_invoker = true) as
select
  i.id,
  i.organization_id,
  i.party_id,
  i.invoice_type,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total_amount,
  coalesce(sum(pa.allocated_amount), 0)::numeric(18,2) as paid_amount,
  (i.total_amount - coalesce(sum(pa.allocated_amount), 0))::numeric(18,2) as outstanding_amount
from public.invoices i
left join public.payment_allocations pa on pa.invoice_id = i.id
group by i.id;

create or replace view public.worker_wage_balances
with (security_invoker = true) as
select
  w.id as worker_id,
  w.organization_id,
  w.display_name,
  coalesce(a.total_accrued, 0)::numeric(18,2) as total_accrued,
  coalesce(p.total_paid, 0)::numeric(18,2) as total_paid,
  (coalesce(a.total_accrued, 0) - coalesce(p.total_paid, 0))::numeric(18,2) as outstanding_wages
from public.workers w
left join (
  select worker_id, sum(net_payable) as total_accrued from public.wage_accruals group by worker_id
) a on a.worker_id = w.id
left join (
  select worker_id, sum(amount) as total_paid from public.wage_payments group by worker_id
) p on p.worker_id = w.id;

create or replace function public.assert_journal_balanced()
returns trigger language plpgsql set search_path = '' as $$
declare
  total_debit numeric(18,2);
  total_credit numeric(18,2);
begin
  if new.status = 'posted' and (tg_op = 'INSERT' or old.status is distinct from 'posted') then
    select coalesce(sum(debit),0), coalesce(sum(credit),0)
      into total_debit, total_credit
    from public.journal_lines where journal_entry_id = new.id;
    if total_debit = 0 or total_debit <> total_credit then
      raise exception 'Journal entry % is not balanced: debit %, credit %', new.id, total_debit, total_credit;
    end if;
  end if;
  return new;
end;
$$;

create trigger journal_entries_assert_balanced_on_insert
before insert on public.journal_entries
for each row execute function public.assert_journal_balanced();

create trigger journal_entries_assert_balanced_on_update
before update of status on public.journal_entries
for each row execute function public.assert_journal_balanced();

create or replace function public.protect_posted_journal_lines()
returns trigger language plpgsql set search_path = '' as $$
declare target_entry uuid;
begin
  target_entry := coalesce(new.journal_entry_id, old.journal_entry_id);
  if exists (select 1 from public.journal_entries where id = target_entry and status = 'posted') then
    raise exception 'Posted journal lines are immutable; create a reversal instead';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger journal_lines_protect_posted
before update or delete on public.journal_lines
for each row execute function public.protect_posted_journal_lines();

create trigger parties_set_updated_at before update on public.parties
for each row execute function public.set_updated_at();
create trigger journal_entries_set_updated_at before update on public.journal_entries
for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

alter table public.chart_accounts enable row level security;
alter table public.parties enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.wage_accruals enable row level security;
alter table public.wage_payments enable row level security;

grant select on public.chart_accounts, public.parties, public.invoice_balances, public.worker_wage_balances to authenticated;
grant select, insert, update on public.journal_entries, public.journal_lines, public.invoices,
  public.invoice_lines, public.payments, public.payment_allocations, public.wage_accruals, public.wage_payments to authenticated;

create policy chart_accounts_select on public.chart_accounts for select to authenticated
using (public.is_org_member(organization_id));
create policy parties_select on public.parties for select to authenticated
using (public.is_org_member(organization_id));

create policy journal_entries_finance_all on public.journal_entries for all to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]))
with check (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]));
create policy journal_lines_finance_all on public.journal_lines for all to authenticated
using (exists (
  select 1 from public.journal_entries e where e.id = journal_entry_id
    and public.has_org_role(e.organization_id, array['ceo','administrator','accountant']::public.app_role[])
))
with check (exists (
  select 1 from public.journal_entries e where e.id = journal_entry_id
    and public.has_org_role(e.organization_id, array['ceo','administrator','accountant']::public.app_role[])
));

create policy invoices_select on public.invoices for select to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant']::public.app_role[]));
create policy invoices_finance_write on public.invoices for all to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]))
with check (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]));
create policy invoice_lines_select on public.invoice_lines for select to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy invoice_lines_finance_write on public.invoice_lines for all to authenticated
using (exists (
  select 1 from public.invoices i where i.id = invoice_id
    and public.has_org_role(i.organization_id, array['ceo','administrator','accountant']::public.app_role[])
))
with check (exists (
  select 1 from public.invoices i where i.id = invoice_id
    and public.has_org_role(i.organization_id, array['ceo','administrator','accountant']::public.app_role[])
));

create policy payments_select on public.payments for select to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant']::public.app_role[]));
create policy payments_finance_write on public.payments for all to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]))
with check (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]));
create policy payment_allocations_select on public.payment_allocations for select to authenticated
using (exists (select 1 from public.payments p where p.id = payment_id));
create policy payment_allocations_finance_write on public.payment_allocations for all to authenticated
using (exists (
  select 1 from public.payments p where p.id = payment_id
    and public.has_org_role(p.organization_id, array['ceo','administrator','accountant']::public.app_role[])
))
with check (exists (
  select 1 from public.payments p where p.id = payment_id
    and public.has_org_role(p.organization_id, array['ceo','administrator','accountant']::public.app_role[])
));

create policy wage_accruals_select on public.wage_accruals for select to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant']::public.app_role[]));
create policy wage_accruals_write on public.wage_accruals for all to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant']::public.app_role[]))
with check (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant']::public.app_role[]));
create policy wage_payments_select on public.wage_payments for select to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','farm_manager','accountant']::public.app_role[]));
create policy wage_payments_finance_write on public.wage_payments for all to authenticated
using (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]))
with check (public.has_org_role(organization_id, array['ceo','administrator','accountant']::public.app_role[]));
