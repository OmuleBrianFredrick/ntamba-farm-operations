-- Stable development references used by the offline-first UI.
-- Authentication users and memberships are intentionally not seeded here.

insert into public.organizations (id, name, legal_name)
values ('10000000-0000-4000-8000-000000000001', 'Ntamba Farm', 'Ntamba Farm Enterprises')
on conflict (id) do nothing;

insert into public.farms (id, organization_id, name, code)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Ntamba Main Farm', 'NTB-MAIN')
on conflict (id) do nothing;

insert into public.enterprises (id, organization_id, farm_id, kind, name, code)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'banana', 'Banana Enterprise', 'BANANA'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'coffee', 'Coffee Enterprise', 'COFFEE'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'seasonal_crops', 'Seasonal Crops', 'SEASONAL'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'garden_crops', 'Garden Crops', 'GARDEN')
on conflict (id) do nothing;

insert into public.work_areas (id, organization_id, farm_id, enterprise_id, name, code, area_value, area_unit)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Block B4', 'B4', 2.5, 'acres'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'North Field', 'NORTH', 4, 'acres'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'Garden G2', 'G2', 0.75, 'acres'),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Coffee C1', 'C1', 6, 'acres')
on conflict (id) do nothing;

insert into public.workers (id, organization_id, farm_id, employee_number, display_name, pay_basis, default_rate)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'NTB-001', 'Amina K.', 'daily_wage', 15000),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'NTB-002', 'Peter M.', 'task_rate', 18000),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'NTB-003', 'John O.', 'monthly_salary', 450000)
on conflict (id) do nothing;

insert into public.chart_accounts (organization_id, code, name, account_type)
values
  ('10000000-0000-4000-8000-000000000001', '1000', 'Cash on Hand', 'asset'),
  ('10000000-0000-4000-8000-000000000001', '1100', 'Mobile Money', 'asset'),
  ('10000000-0000-4000-8000-000000000001', '1200', 'Accounts Receivable', 'asset'),
  ('10000000-0000-4000-8000-000000000001', '2000', 'Accounts Payable', 'liability'),
  ('10000000-0000-4000-8000-000000000001', '2100', 'Outstanding Wages', 'liability'),
  ('10000000-0000-4000-8000-000000000001', '4000', 'Farm Sales', 'income'),
  ('10000000-0000-4000-8000-000000000001', '5000', 'Farm Inputs', 'expense'),
  ('10000000-0000-4000-8000-000000000001', '5100', 'Wages and Salaries', 'expense')
on conflict (organization_id, code) do nothing;

insert into public.crop_varieties (id, organization_id, crop_name, variety_name, category, default_output_unit, typical_maturity_days)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Banana', 'East African Highland', 'perennial', 'kg', 365),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Maize', 'Longe 10H', 'seasonal', 'kg', 120),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Tomato', 'Assila F1', 'garden', 'kg', 85),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Coffee', 'Robusta Elite', 'perennial', 'kg', 900)
on conflict (id) do nothing;

insert into public.farm_seasons (id, organization_id, farm_id, name, code, starts_on, ends_on, status, rainfall_target_mm)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Second rains 2026', '2026-B', '2026-08-15', '2027-01-31', 'active', 520),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'First rains 2027', '2027-A', '2027-02-15', '2027-07-31', 'planning', 480)
on conflict (id) do nothing;
