# Farm Operations, Finance & QHSE Management Platform

Status: Development baseline v2 - locked on 1 November 2026

This plan replaces the original compliance-led plan. The original is preserved as `DEVELOPMENT_PLAN_V1_ARCHIVE.md`. Version 2 makes measurable farm production, labour, money, and management decisions the center of the product. The supplied QHSE forms remain part of the platform, simplified and assigned by role rather than removed.

## 1. Product mission

Create a simple offline-capable farm management application that records the real daily life of the farm:

- what work was planned and completed;
- who worked, where, for how long, and what they earned;
- which inputs, equipment, land, animals, ponds, or hives were used;
- what measurable output was produced, harvested, lost, delivered, or sold;
- what money was spent, received, owed, or still outstanding;
- what risks, defects, incidents, restrictions, or corrective actions require attention.

The management result must be a traceable chain:

`Enterprise -> season or production cycle -> daily work -> labour and inputs -> output -> delivery or sale -> payment -> cost and profitability`

Photos and videos are optional supporting evidence. They are not the primary record.

## 2. Product principles

1. Daily outputs matter more than activity descriptions alone.
2. Ordinary workers must be able to submit records without accounting or compliance expertise.
3. Record only information that supports operations, payment, traceability, safety, compliance, or a management decision.
4. Capture data once and reuse it across production, labour, finance, stock, and reporting.
5. Management screens emphasize exceptions, missing reports, overdue actions, unusual changes, and profitability.
6. Every summary must drill down to its source records.
7. The system must remain dependable during weak or absent internet connectivity.
8. Submitted evidence is never silently overwritten or deleted.

## 3. Active farm enterprises

All of the following are in scope:

- banana;
- coffee;
- seasonal and garden crops;
- dairy cattle;
- other cattle;
- goats and sheep;
- pigs;
- poultry - layers and/or broilers;
- fish ponds;
- apiary and honey production.

The data model must allow an enterprise to be enabled, disabled, renamed, or expanded without rebuilding the application.

## 4. Users, hierarchy, and permissions

Individual managed accounts are required. Public self-registration is excluded.

| Role | Operational access |
|---|---|
| CEO / Farm Owner | All management dashboards, production, finance summaries, submitted records, exports, announcements, approvals |
| Administrator | Accounts, roles, assignments, reference data, configuration, audit oversight |
| Farm Manager | All enterprises, daily work, production, labour, stock, QHSE records, reviews, approvals, announcements |
| Accountant / Finance Officer | Chart of accounts, transaction review/posting, invoices, receipts, payments, reconciliation, period close and financial reports |
| QHSE Lead | Assigned QHSE forms, incidents, inspections, investigations, restrictions, corrective actions and compliance reporting |
| Enterprise Supervisor | Assigned enterprise records, team allocation, daily outputs, input use, harvest/delivery and assigned approvals |
| Storekeeper | Stock receipts/issues/adjustments, input inventory, supplier delivery records and stock counts |
| Communications Officer | Announcements and approved non-confidential activity posts |
| Worker / Specialist | Assigned simplified daily workflows and assigned QHSE forms; own drafts and submission status |
| Auditor - later | Time-limited read-only access to explicitly selected records |

Access is the combination of role, farm/site, enterprise, department, and explicit form assignment. A user sees only the workflows and forms needed for their responsibility. Managers retain broader oversight.

## 5. Core platform structure

### 5.1 Farm setup and master registers

- farms/sites, departments, work areas, fields and crop blocks;
- enterprises, seasons, planting sessions and production cycles;
- crop types, varieties, plots and expected yields;
- animals, herds/groups, pens and breeding identities;
- poultry flocks/houses, fish ponds/cohorts and apiaries/hives;
- employees, roles, pay arrangements, teams and supervisors;
- machinery, vehicles, tools and maintenance identity;
- stores, inputs, products, units of measure and approved suppliers;
- customers, suppliers, payment methods, bank/mobile-money/cash accounts;
- form catalogue, form versions, applicability, frequency and assignments.

### 5.2 Daily work and labour

The daily work record is a central operational workflow, not a paper attendance copy.

- date, shift, enterprise, block/location and supervisor;
- planned task, assigned workers and expected output;
- attendance, start/end times or approved workday;
- work completed, measurable quantity and unit;
- equipment and inputs used;
- unmet work, reason, follow-up and next action;
- safety/toolbox reference when required;
- supervisor verification.

Worker payment arrangements:

- monthly salary;
- daily wage;
- task or quantity-based payment;
- mixed arrangements.

The payroll register records earnings, approved overtime where used, advances, deductions where authorized, payments, outstanding wages, and settlement history. Bonuses, if used, are recorded as an earning component under wages or salary rather than as a separate financial system.

### 5.3 Crop production

Crop production is organized by enterprise, block, season and planting session.

Daily events include:

- land preparation;
- planting and gap filling;
- weeding, mulching, pruning, desuckering and sanitation;
- irrigation and water use;
- fertilizer/manure/soil amendment application;
- pest/disease scouting and treatment;
- flowering, crop stage and yield forecast;
- harvest quantity, grade, rejects and loss;
- storage, delivery, buyer and sale linkage.

Outputs include area worked, plants established, survival/gaps, quantity harvested, accepted/rejected quantity, destination, selling quantity and value.

### 5.4 Livestock and dairy

- animal/group identity and count;
- daily feed and water use;
- welfare and health observations;
- births, breeding, weight or body condition;
- treatment, withdrawal, quarantine and preventive health;
- movement, sale, death and disposal;
- milk by animal/group and session;
- held/rejected milk, calf use, delivery and sale.

### 5.5 Poultry

- flock/house and opening/closing count;
- feed and water;
- eggs collected, cracked/dirty/rejected and sold;
- mortality, culls, treatments and vaccination;
- weight/production measurement;
- bird purchases, transfers and sales.

### 5.6 Fish and apiary

- pond/cohort counts, stocking, feed, water readings, mortality, sampling and harvest;
- hive inspections, colony condition, feeding/treatment, honey/wax harvest and destination;
- enterprise costs, outputs, deliveries and sales.

### 5.7 Inventory, purchases, and farm inputs

- purchase request/order where used;
- goods receipt, supplier and invoice/receipt;
- stock quantity, unit cost, batch, expiry and store location;
- issue to enterprise/block/task/animal group;
- return, wastage, damage, adjustment and stock count;
- reorder and expiry warnings;
- direct link from input consumption to production cost.

## 6. Accounting and financial management

The platform will use a proper double-entry accounting foundation with a simplified daily interface.

Workers and department leads record ordinary operational events. The system proposes the accounting effect. The accountant controls review, posting, account mapping, reconciliation, corrections, and closing periods.

### 6.1 Accounting foundation

- configurable chart of accounts;
- general journal and immutable posted journal entries;
- general ledger;
- trial balance;
- accounting periods and controlled close/reopen authority;
- cash, mobile-money and bank accounts;
- cost centers by enterprise, block, season, project or department;
- source-document and audit references;
- reversal/correction entries instead of editing posted transactions.

### 6.2 Daily finance workflows

- expenses and cash payments;
- purchases and supplier invoices;
- sales and customer invoices;
- receipts and customer payments;
- supplier payments;
- cash transfers and deposits;
- worker wage/salary accrual and payment;
- advances and approved deductions;
- delivery and transport costs;
- opening balances and controlled historical entry for past months.

Sales and purchases may be cash, mobile money, bank, credit, or mixed. The platform supports partial payments and multiple payment methods against one invoice.

### 6.3 Receivables and payables

- customer and supplier accounts;
- invoices, receipts, payment vouchers and supporting documents;
- amounts invoiced, paid, outstanding and overdue;
- partial allocations, credit notes and authorized write-offs;
- customer/supplier statements and ageing;
- delivery cost and sale/delivery traceability.

### 6.4 Financial reports

- profit and loss;
- balance sheet;
- cash-flow statement;
- trial balance and general ledger;
- cash/mobile-money/bank movement;
- customer and supplier balances/ageing;
- wage liability and outstanding wages;
- expenses and income by enterprise, season, block and cost category;
- gross margin and profitability by enterprise/season when sufficient data exists;
- budget versus actual in a later controlled increment.

## 7. QHSE and the original forms

The supplied issue guide and 38 operational forms remain available in the application. They are supporting controlled workflows beside the farm operations platform, not discarded and not treated as the only product structure.

Rules:

- simplify wording and screen sequence for ordinary workers while preserving the purpose, required evidence, decisions, restrictions, and approvals;
- assign forms by role, enterprise, department, location, competency and responsibility;
- the farm manager and authorized oversight roles can access the complete catalogue;
- display routine forms when due and event forms when triggered;
- reuse data already captured by operations, labour, assets, stock, animals and finance;
- automatically create linked corrective actions from failed checks where appropriate;
- preserve the exact form version used for each submission;
- generate a controlled PDF matching the source form's business meaning;
- retain confidential incident, health, HR and financial records under narrower policies.

Forms are grouped for navigation:

- safety, inspections, risk, incidents and corrective actions;
- emergency readiness, PPE, machinery and maintenance;
- chemicals, pesticide, fertilizer, water, waste and environment;
- hygiene, quality, product hold and traceability;
- visitors, training and competence;
- crop operations;
- livestock, dairy, poultry, fish and apiary;
- attendance, work allocation and manager review.

## 8. Management and CEO center

The management center is exception-driven. It must answer:

- What work and outputs were completed today?
- Which planned activities were missed, and why?
- Which expected daily/weekly submissions are missing?
- What was harvested, produced, rejected, lost, delivered and sold?
- What inputs and labour were consumed, and at what cost?
- What cash was received or paid today?
- Which customer, supplier or worker balances remain outstanding?
- Which incidents, restrictions, holds or overdue actions require attention?
- How is each enterprise performing against its previous period, target and cost?

Each summary supports filters and drill-down to its source work, production, stock, finance or QHSE record.

## 9. Offline and synchronization contract

The visible lifecycle is:

`Draft -> ready to submit -> waiting for connection -> syncing -> synced -> needs attention`

Requirements:

- IndexedDB stores drafts, reference data and the durable sync queue;
- client-generated UUID and idempotency key prevent duplicate records;
- autosave survives app closure and device restart;
- synchronize on sign-in, app start, connectivity restoration, manual retry and foreground checks;
- service-worker Background Sync is an enhancement, not the only guarantee;
- attachments are compressed, queued separately and linked after confirmed upload;
- warn before sign-out if unsynced records remain;
- show last successful sync, pending count and failure reason;
- preserve both versions of a true conflict for authorized review;
- restrict confidential device caching and support remote session revocation.

## 10. Locked technology stack

### Client

- React, TypeScript and Vite;
- mobile-first installable PWA;
- Tailwind CSS and accessible reusable components;
- React Hook Form and Zod;
- TanStack Query;
- Dexie/IndexedDB;
- Workbox service worker.

### Backend

- Supabase Auth;
- PostgreSQL;
- Row Level Security on every exposed table;
- Supabase Storage;
- Edge Functions for privileged workflows, notifications, scheduled summaries and PDF generation;
- version-controlled SQL migrations, seed data and RLS allow/deny tests.

### Quality and delivery

- Vitest and Testing Library;
- Playwright for critical user journeys;
- database tests for permissions and accounting invariants;
- Git source control and automated checks;
- server-rendered HTML/CSS report templates exported to PDF.

## 11. Delivery phases

### Phase 0 - Operational blueprint and design specification

Deliverables:

- farm hierarchy, enterprise and master-register specification;
- role, hierarchy and form-assignment matrix;
- daily output/KPI catalogue for every enterprise;
- worker pay, sales, purchases and accounting workflow definitions;
- chart-of-accounts starter and posting-rule catalogue;
- consolidated workflow map showing operational modules and all 38 supporting forms;
- clickable/interactive design concept for worker home, daily work/output entry, manager dashboard and finance center;
- offline state and conflict rules.

Exit gate: management can recognize the real farm day in the proposed workflows, and accounting agrees with transaction/posting rules.

### Phase 1 - Foundation and daily farm vertical slice

Deliverables:

- application shell, authentication, roles, assignments and RLS;
- master data for farm, enterprises, blocks, people, products and accounts;
- offline drafts, sync queue, visible sync states and audit events;
- daily workforce allocation and output record;
- one crop production workflow and one livestock/poultry production workflow;
- simple expense, sale/receipt and wage/outstanding-wage workflow;
- manager daily overview;
- supporting forms 01 Daily Inspection, 04 Incident Report and 05 Corrective Action;
- PDF/print for selected records.

Exit gate: a team completes a realistic day offline and management sees labour, output, money and exceptions after one safe synchronization.

### Phase 2 - Crop production, stores, purchasing and sales

- crop blocks, seasons, planting sessions and daily operations;
- banana, coffee, seasonal/garden crop workflows;
- input inventory, purchases, receipts, issues and adjustments;
- harvest, quality, delivery, customer invoice and payment allocation;
- crop/input QHSE forms and crop performance dashboards.

Exit gate: a harvested lot traces back through work, labour, inputs, restrictions, costs, delivery, invoice and payment.

### Phase 3 - Livestock, dairy, poultry, fish and apiary

- animal/group, health, feeding, movement, breeding and mortality;
- milk, eggs, flock, fish and hive production;
- feed/input consumption, treatments, restrictions, harvest and sales;
- related supporting QHSE forms;
- production, mortality, restriction and profitability indicators.

Exit gate: counts and products reconcile, and restricted products cannot be released without authorization.

### Phase 4 - Full finance and payroll control

- complete chart of accounts and posting rules;
- receivables, payables, cash/mobile-money/bank accounts;
- mixed payment methods, partial payments, statements and ageing;
- salary, daily-rate and task-rate earnings, advances/deductions, payments and outstanding wages;
- reconciliation, controlled periods, ledger, trial balance and formal financial statements;
- historical opening balances and past-month controlled migration.

Exit gate: accountant verifies double-entry integrity and reconciles operational source records to the ledger and financial reports.

### Phase 5 - Complete QHSE catalogue and management intelligence

- all remaining forms simplified and assigned hierarchically;
- due/event triggers, approvals, restrictions and action escalation;
- CEO cross-enterprise dashboard;
- missing-report detection, exception alerts and scheduled weekly/monthly report packs;
- announcements and curated non-confidential activity feed.

Exit gate: management receives a concise operational and financial picture with drill-down evidence.

### Phase 6 - Hardening, pilot and production rollout

- permission, accounting, backup/restore and audit tests;
- offline stress testing and interrupted-sync recovery;
- performance, accessibility and shared-device security review;
- pilot with real users, devices, weak connectivity and live transactions;
- training, administrator/accountant guides, support runbook and controlled go-live.

Exit gate: acceptance passed, financial opening verified, recovery tested and production approved.

## 12. Initial vertical-slice acceptance criteria

- A worker can reopen the installed app offline and complete an assigned daily work/output record.
- The record contains measurable output, labour and input use rather than narrative alone.
- Salary, daily-rate and task-rate workers can appear on the same work allocation.
- Outstanding wages are calculated from approved earnings minus allocated payments/advances/deductions.
- An authorized user can record a cash or credit sale and allocate a partial cash/mobile-money/bank payment.
- A source transaction produces a balanced proposed or posted journal entry.
- Retried synchronization creates no duplicates.
- Unauthorized users cannot access another enterprise, finance records or unassigned QHSE forms through the UI or API.
- The manager can move from a summary to the source operational and financial records.
- A failed check can create a linked corrective action.
- A submitted record can be corrected only through a traceable revision, void or reversal workflow.

## 13. Explicit first-release boundaries

Excluded until the core platform is stable:

- statutory payroll filing and tax submission;
- complex depreciation/fixed-asset accounting beyond a basic asset register;
- automated bank/mobile-money provider integrations;
- public customer/supplier portals;
- native Android and iOS applications;
- IoT sensors, satellite imagery and automated agronomic advice;
- AI-generated compliance or accounting decisions.

These boundaries do not prevent manual entry of tax, depreciation, bank, or mobile-money transactions into the ledger when required.

## 14. Locked decisions

1. The center of the product is measurable daily farm operations and outputs.
2. All identified farm enterprises are in scope.
3. Labour supports salary, daily wage, task/quantity rate and mixed arrangements.
4. Outstanding wages are explicitly tracked; bonuses are an earning component within wages/salary.
5. Finance uses double-entry accounting with a simple non-accountant interface and accountant-controlled posting/reconciliation/close.
6. Sales and purchases support cash, credit, mixed methods, partial payments, delivery costs, customers and suppliers.
7. The 38 QHSE forms remain in the application, simplified and assigned through the role hierarchy.
8. The application is an offline-first PWA using React/TypeScript/Vite and Supabase/PostgreSQL.
9. Dashboards are exception-driven and every figure drills down to source evidence.
10. Submitted and posted evidence is corrected through auditable revision/reversal, never silent editing or deletion.

## 15. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-31 | Version 1 baseline | Initial QHSE-led interpretation |
| 2026-11-01 | Replace version 1 with operations-and-finance-led baseline | Daily outputs, labour, sales, expenses, accounting and profitability are the primary management need |
| 2026-11-01 | Retain all 38 forms beside operational modules | Compliance workflows remain necessary but should be simplified and assigned hierarchically |
| 2026-11-01 | Adopt double-entry foundation with simple daily entry | Preserve proper accounting control without forcing ordinary users to understand debits and credits |

## 16. Immediate build sequence

1. Produce the primary visual concept and design tokens.
2. Scaffold the React/TypeScript/Vite PWA and test harness.
3. Define the database migration for organizations, farms, profiles, roles, enterprises and assignments.
4. Implement the authenticated app shell and offline sync-state model.
5. Build the daily work/output vertical slice.
6. Add expense, sale/receipt and outstanding-wage slices.
7. Add the first three simplified QHSE forms and manager overview.
