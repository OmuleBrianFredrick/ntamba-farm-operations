# Farm Operations & QHSE Management Application

Status: Baseline development plan - locked on 31 October 2026

This document is the working baseline for the project. We will follow the phases in order. A change to scope, architecture, roles, or data ownership must be recorded in the Decision Log before implementation.

## 1. Product goal

Replace paper-based farm activity reporting with a simple, mobile-first application that lets authorized staff capture work as it happens, even without internet access. When connectivity returns, records synchronize automatically. Farm management and the CEO receive one reliable view of operations, risks, actions, trends, and printable reports.

Success means:

- Workers can find and complete only the forms relevant to their responsibilities.
- A submission is automatically stamped with the authenticated user's identity, role, date, time, and device-generated record ID.
- Drafts and completed submissions survive weak or absent connectivity.
- Synchronization is visible and recoverable; the user always knows whether a record is saved locally, syncing, synced, or needs attention.
- Submitted records are visible only to authorized management roles, not to the general workforce.
- Managers and the CEO can filter, summarize, review, approve, and export records as PDFs.
- The system preserves an audit trail instead of silently overwriting evidence.

## 2. Locked technology stack

### Frontend

- React + TypeScript, built with Vite.
- Mobile-first Progressive Web App (PWA), installable on Android phones, tablets, and desktop browsers.
- Tailwind CSS with a small reusable component library for a consistent, uncluttered interface.
- React Hook Form + Zod for form state and validation.
- TanStack Query for server-state fetching, caching, and retry behavior.

### Offline and synchronization

- IndexedDB on the device, accessed through Dexie, for drafts, submissions awaiting sync, reference data, and a durable upload queue.
- Workbox service worker for application-shell caching and background request replay where the browser supports it.
- An explicit application sync engine as the primary guarantee: synchronize on login, app launch, connectivity restoration, manual retry, and periodic foreground checks. This avoids depending solely on browser Background Sync support.
- Client-generated UUIDs and idempotency keys so retries cannot create duplicate reports.
- Immutable submitted snapshots. Conflicts are resolved by preserving both versions for manager review; submitted evidence is never silently overwritten.
- Photos and attachments are compressed locally, queued separately, and linked only after confirmed upload.

### Backend

- Supabase managed platform:
  - PostgreSQL for structured operational records and reporting.
  - Supabase Auth for individual accounts and sessions.
  - Row Level Security (RLS) for role- and responsibility-based access.
  - Supabase Storage for evidence photos, documents, and generated report files.
  - Edge Functions for privileged workflows, notifications, PDF generation, and scheduled summaries.
- SQL migrations and seed data kept in source control; no production-only manual schema changes.

### Reporting and operations

- Database views/materialized views for dashboard indicators.
- Server-generated print layouts using HTML/CSS templates rendered to PDF, preserving the source form headings and record reference.
- Git/GitHub for source control and change history.
- Automated tests: Vitest/Testing Library for the app, Playwright for critical user journeys, and database tests for every RLS allow/deny rule.
- Initial hosting: static PWA on a managed web host and Supabase for backend services. Deployment provider can be selected at release without changing the application architecture.

## 3. Why this stack fits the farm

- A PWA avoids requiring separate Android, iOS, and desktop codebases while still being installable and usable offline.
- Local IndexedDB storage makes forms resilient to intermittent rural connectivity.
- PostgreSQL supports both detailed records and cross-module reporting without splitting data across unrelated services.
- Supabase Auth plus database RLS places access enforcement in the database, not only in the screen interface.
- The architecture is straightforward for a small team, but can grow to multiple farms or sites later.

## 4. Roles and access model

Accounts are required. Asking a user to type a name into every form is not sufficient identity control and creates avoidable errors. The signed-in user's profile supplies the submitter tag automatically.

| Role | Main permissions |
|---|---|
| CEO / Farm Owner | Full reporting center, all submitted records, dashboards, exports, announcements, management review |
| Administrator | User accounts, roles, form assignments, farm reference data, audit oversight; no automatic right to alter submitted evidence |
| Farm Manager | All operational forms, all submitted records, reviews/approvals, corrective actions, dashboards, announcements |
| QHSE Lead | QHSE forms and records, incidents, investigations, actions, inspections, training, relevant dashboards |
| Communications Officer | Create and manage announcements and approved activity updates; no access to confidential submissions unless separately assigned |
| Supervisor / Team Lead | Assigned modules, own/team drafts and submissions, follow-up actions assigned to the team |
| Worker / Specialist | Assigned forms only; create drafts and submissions; view own submission receipt/status, not other confidential reports |
| Read-only Auditor (later) | Time-limited, explicitly scoped access to selected records and exports |

Access is controlled through role plus explicit module assignments. The manager's all-form access is a permission, not duplicated assignments. Sensitive health, incident, HR, chemical, and product-hold data receive narrower policies where required.

## 5. Form inventory and module map

The source pack contains an issue/register guide plus 38 operational forms. The digital application will preserve the business meaning while replacing paper-only elements such as handwritten names and duplicated headers with authenticated metadata.

### A. QHSE, safety, environment, and compliance

01 Daily farm QHSE inspection; 02 Task risk assessment; 03 Toolbox talk and attendance; 04 Hazard and incident report; 05 Corrective action; 06 Emergency equipment inspection; 07 Emergency drill evaluation; 08 PPE issue and fit verification; 09 Machinery and vehicle pre-use; 10 Chemical inventory/store inspection; 11 Pesticide application/release; 12 Fertilizer application; 13 Water and irrigation monitoring; 14 Waste disposal; 15 Environmental inspection; 17 Cleaning and hygiene; 18 Product hold/release; 19 Visitor/contractor induction; 20 Training and competence; 22 Maintenance and return to service.

### B. Crop production and traceability

16 Harvest quality and traceability; 23 Crop block register; 24 Banana husbandry; 25 Coffee husbandry; 26 Seasonal crop diary.

### C. Livestock and dairy

21 Livestock biosecurity/treatment; 27 Dairy milk and hygiene; 28 Animal identity/breeding; 29 Livestock feed/welfare; 34 Animal movement/quarantine; 35 Mortality/disposal; 36 Preventive animal health.

### D. Poultry, aquaculture, and apiary

30 Poultry daily record; 31 Fish pond daily log; 32 Fish stocking/harvest; 33 Apiary hive record.

### E. Workforce and management

37 Employee attendance/work allocation; 38 Farm manager weekly plan/review.

### Shared digital building blocks

- Record header: farm/site, block/work area, date/time, record reference, status, submitter.
- Y / N / N/A checklist with mandatory explanation for N and N/A where applicable.
- Repeatable table rows for stock, attendance, measurements, treatments, participants, and actions.
- Corrective action with owner, priority, due date, evidence, verification, and closure status.
- Approval/release decision with role-based electronic sign-off and timestamp.
- Photo/file evidence, comments, linked records, and audit history.
- Units, assets, blocks, crops, animals/groups, staff, suppliers, and products selected from controlled reference lists where possible.

## 6. Core information architecture

Primary data areas:

- organizations, farms/sites, blocks/areas, enterprises
- user profiles, roles, permissions, module assignments
- form definitions, form versions, field definitions, validation rules
- drafts, submissions, submission answers, repeatable rows
- attachments and upload queue metadata
- approvals, reviews, corrective actions, comments, audit events
- announcements and activity-feed posts
- assets/machinery, chemical products, crop lots, animals/groups, ponds, hives
- dashboard indicators and scheduled report definitions

Forms are versioned. A completed submission always remains tied to the exact form version used at submission time.

## 7. User experience baseline

### Worker home

- Welcome, today's date, offline/online and sync status.
- Large "New report" action and assigned form shortcuts.
- Drafts and unsynced items surfaced first.
- Recent own activity and announcements.

### Form experience

- Short sections with progress indication, autosave, clear required fields, large touch targets, and minimal typing.
- Reuse known values (user, farm, team, usual location) without hiding them.
- Camera capture for evidence.
- Review screen before submission.
- Clear receipt with record reference and sync state.

### Management center

- Operational overview, urgent hazards, overdue actions, pending approvals, submission completeness, and enterprise production indicators.
- Filters by date, form, enterprise, location, submitter, status, and severity.
- Drill-down from summary to source record.
- PDF export and print from each record and selected report collections.

### Landing page and communication

- Premium but restrained authenticated landing page.
- Activity feed uses approved, non-confidential posts derived from selected records; submissions never become public posts automatically.
- Announcements can be published by CEO, manager, and communications officer, with audience and expiry controls.

## 8. Phased delivery plan

### Phase 0 - Discovery and controlled-form mapping

Deliverables:

- Confirm farm/site name, operational enterprises, user list, job responsibilities, devices, languages, and approval chain.
- Assign official document codes, owners, frequencies, retention, confidentiality, and applicability from the source issue register.
- Produce a field-by-field digital specification for all 38 forms.
- Define dashboard indicators and sample CEO reports before database design is finalized.
- Approve the role/permission matrix and data retention policy.

Exit gate: signed-off product requirements, form catalogue, roles, and reporting KPI list.

### Phase 1 - Foundation and working vertical slice

Deliverables:

- Repository, environments, CI checks, PWA shell, design tokens, navigation, and installability.
- Authentication, user profiles, roles, module assignments, and RLS tests.
- Core database, audit trail, reference data, form renderer, local drafts, sync queue, and visible sync states.
- Worker home and management shell.
- First end-to-end forms: 01 Daily Inspection, 04 Hazard/Incident, 05 Corrective Action.
- Record detail, manager review, attachment upload, and single-record PDF export.

Exit gate: a worker can complete the three forms offline, reconnect, sync exactly once, and the manager can review/export them without unauthorized access.

### Phase 2 - QHSE and compliance modules

Deliverables:

- Forms 02-15 and 17-22.
- Linked corrective actions, incident investigation, approvals/releases, restrictions, reminders, and overdue escalation.
- QHSE dashboard: inspections, hazards/incidents, severity, open/overdue actions, training/competence, equipment/chemical findings.
- Controlled PDF layouts and batch export.

Exit gate: complete QHSE workflow and management reporting validated against source forms.

### Phase 3 - Crops, traceability, and farm inputs

Deliverables:

- Forms 16 and 23-26, integrated with pesticide, fertilizer, water, and harvest restrictions.
- Crop blocks, seasons, varieties, lots, harvest quantities, rejects, and destination tracking.
- Crop dashboard for activities, planned vs completed work, inputs, harvest, quality, and traceability.

Exit gate: trace a harvest lot back to block activities and applicable treatment/release records.

### Phase 4 - Livestock, dairy, poultry, fish, and apiary

Deliverables:

- Forms 21 and 27-36, using shared animal/group, treatment, withdrawal, movement, mortality, pond, flock, and hive records.
- Production indicators: milk, eggs, mortality, feed, births, treatments, fish/honey outputs, and restrictions.
- Alerts for withdrawal periods, quarantine review, abnormal mortality, preventive health, and water readings outside approved limits.

Exit gate: enterprise records reconcile and restricted animal products cannot be released without an authorized verification.

### Phase 5 - Workforce, weekly management, and communication

Deliverables:

- Forms 37-38.
- Daily attendance/allocation and weekly plan vs actual review.
- Announcements and curated activity feed.
- CEO dashboard combining workforce, QHSE, crops, livestock, production, quality, and outstanding actions.
- Scheduled weekly/monthly summaries and report packs.

Exit gate: the weekly management review can be generated from source records with drill-down evidence.

### Phase 6 - Hardening, pilot, and production rollout

Deliverables:

- Security review, RLS allow/deny suite, backup/restore test, audit-log verification, performance and accessibility checks.
- Offline stress tests covering interrupted uploads, duplicate retries, expired sessions, conflicting edits, low storage, and device restart.
- Pilot with a small group on real devices and weak connectivity; fix findings.
- User training, administrator guide, support runbook, data retention/export process, and production deployment.
- Controlled migration/archiving plan for paper records.

Exit gate: acceptance testing passed, recovery tested, users trained, and production go-live approved.

## 9. Initial release acceptance criteria

- An authorized user can install and open the app, sign in while connected, and later reopen the cached app offline on the same trusted device.
- Every draft autosaves locally and survives app closure/device restart.
- Every submission has a UUID, human-readable reference, submitter ID/name/role, device time, server receipt time, form version, and audit events.
- Retried synchronization is idempotent and does not duplicate a record.
- Users cannot access unassigned forms or read submissions outside their permission scope, including by direct API request.
- CEO and manager can filter records, see summary indicators, open source evidence, and export a legible PDF.
- A failed sync or attachment upload is visible and can be retried without re-entering the form.
- No confidential submission appears in the activity feed unless an authorized publisher creates an approved summary post.

## 10. Explicit non-goals for the first release

- Native Android/iOS applications.
- Payroll, accounting, procurement, sales, or full inventory/ERP functionality beyond fields required by the supplied QHSE forms.
- IoT sensor integrations, satellite imagery, or automated agronomic recommendations.
- Public self-registration. Accounts are created/invited by an administrator.
- AI-generated compliance decisions. The system may summarize later, but accountable people approve decisions and releases.

## 11. Risks and controls

| Risk | Control |
|---|---|
| Shared phones expose confidential data | Named accounts, short inactivity lock, device sign-out, encrypted transport, restricted local cache, remote session revocation |
| Offline submissions duplicate or conflict | UUID/idempotency key, immutable snapshots, sync ledger, conflict review |
| Photos consume storage/data | Compression, limits, upload queue, Wi-Fi preference option |
| Generic digital forms lose paper-form controls | Form versioning, required-field rules, explicit N/A reasons, approval gates, PDF parity review |
| Incorrect role exposes reports | Database RLS, least privilege, allow/deny automated tests, access audit |
| Dashboard totals cannot be trusted | Defined indicator formulas, source-record drill-down, reconciliation tests |
| Too many forms overwhelm users | Responsibility-based assignments, favorites, recent forms, phased rollout |

## 12. Decisions locked for implementation

1. Build an installable offline-first PWA, not separate native applications.
2. Require individual managed accounts; never rely on a typed submitter name as identity.
3. Use React/TypeScript/Vite on the client and Supabase/PostgreSQL on the backend.
4. Enforce access through database RLS plus module assignments.
5. Keep submitted records immutable; changes create a revision/correction with an audit trail.
6. Treat IndexedDB plus the application sync queue as the offline source of truth until server acknowledgement.
7. Roll out by domain after an end-to-end three-form vertical slice.
8. Generate dashboards from structured form data and preserve drill-down to the exact source submission.
9. Keep activity-feed content separate from confidential submissions and require authorized publication.
10. Defer unrelated ERP features until the reporting system is accepted and stable.

## 13. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-31 | Baseline plan locked | Establish a stable sequence and prevent premature expansion before the core reporting workflow is proven |

## 14. Next action

Begin Phase 0 by producing the detailed requirements pack: applicability/ownership register, role-permission matrix, form data dictionary, dashboard KPI catalogue, and clickable low-fidelity screen flow. Phase 1 implementation starts only after that pack is approved.
