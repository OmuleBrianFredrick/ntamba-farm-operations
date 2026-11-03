# Development status — 3 November 2026

Production integration has started. The public GitHub repository and live Supabase database foundation are complete; authentication users, storage, hosting, domain activation and the remaining launch work are tracked in PENDING_REAL_INTEGRATIONS.md.

## Integration foundation — 3 November 2026

- Public GitHub repository: `https://github.com/OmuleBrianFredrick/ntamba-farm-operations`.
- Supabase project `ntamba-farm-operations` created under the `Ntamba Farm` organization on the free plan.
- Four versioned migrations and the approved reference seed executed successfully.
- Live verification returned 32 public tables, row-level security enabled on all 32, one organization, one farm, three workers, four crop varieties and all 38 QHSE form definitions.
- Local authentication URLs were allow-listed, unrestricted public sign-up was disabled, and the application was connected using a Git-ignored local environment file.
- Post-connection verification passed: lint clean, 47 tests across seven files passed, and the production/PWA build succeeded.

## Current increment

**Phase 6: cross-enterprise reporting, administration, audit hardening and local whole-system acceptance is complete for the agreed local-development scope.**

The Reports workspace now consolidates crop, animal, lifecycle, stock, finance and QHSE records into one date- and enterprise-filtered management view. It includes production, finance, stock and compliance drill-downs, CSV export, printable views and immutable saved report snapshots.

The Administration workspace now includes a local user/responsibility register, seven-role least-privilege permission policy, append-only audit evidence, farm operating settings and repeatable whole-system acceptance runs. Acceptance checks cover module readability, double-entry balance, non-negative stock, the 38-form catalogue, critical actions, unique user assignments, permission boundaries, controlled evidence and deferred integration readiness.

This completes the locally functional application plan. Real authentication enforcement, server-side authorization, centralized audit retention, database synchronization, scheduled reporting, backups, hosting and domain activation remain intentionally deferred in PENDING_REAL_INTEGRATIONS.md.

**Phase 5: QHSE, controlled forms and management oversight is complete for the agreed local-development scope.**

All 38 original controlled forms now remain available as source PDFs alongside simplified worker-facing workflows. Role previews cover workers/specialists, enterprise supervisors, the QHSE lead, farm managers and the owner/CEO; form availability follows that hierarchy while management retains full oversight. Daily, weekly and monthly omissions appear automatically as due work.

Submitted records receive controlled references, form versions and revision history. Failed, action-required or restricted checks automatically create corrective actions. Managers can approve, return or restrict submissions; actions retain owner, due date, status and completion evidence. Management can review cross-enterprise exceptions, publish farm announcements and generate dated report-pack snapshots. These records persist in the local IndexedDB store.

Production identity enforcement, server-side permissions, evidence-file storage, notification schedules, signatures, retention controls and hosted report generation remain intentionally deferred in PENDING_REAL_INTEGRATIONS.md.

**Phase 4: Finance, sales, wages and double-entry accounting is complete for the agreed local-development scope.**

The finance workspace now includes customer and supplier registers, sales invoices, full and partial receipts, paid expenses and supplier-credit bills, partial supplier payments, monthly/daily/task worker registers, wage accruals, outstanding wages and partial wage payments. Cash, mobile-money and bank movements feed the daily cash-flow view.

Every operational transaction automatically creates a balanced double-entry journal. The accountant workspace includes the chart of accounts, trial balance, journal register, controlled manual journals, money-account reconciliation and closed accounting periods. Closed dates reject sales, expenses, receipts, supplier payments, wage activity and manual journals until the period is reopened.

These workflows persist in the local IndexedDB store. Production authorization roles, server-enforced locks, opening-balance migration, bank/mobile-money feeds and automated stock-to-ledger posting remain intentionally deferred in PENDING_REAL_INTEGRATIONS.md.

**Phase 3: Stock and Inputs management is complete for the agreed local-development scope.**

The stock workspace now includes item and supplier registers, purchase/delivery receipts, issues to farm activities, returns, location transfers, positive and negative adjustments, spoilage/expiry losses, batch and expiry traceability, weighted average cost, stock valuation, reorder alerts and approaching-expiry alerts. Stock movements form an append-only operational ledger; corrections are recorded as explicit adjustments rather than rewriting history. Negative stock is rejected, and partial batch transfers preserve both source and destination lot balances.

These workflows persist in the local IndexedDB store. Live purchasing approvals, finance journal posting, database synchronization and production supplier integrations remain intentionally deferred in PENDING_REAL_INTEGRATIONS.md.

**Phase 2: Animal, poultry, fish and apiary lifecycle operations is complete for the agreed local-development scope.**

Livestock now supports individual-animal and herd registers plus movement, breeding, pregnancy, birth, vaccination, treatment, weight, sale and death histories. Poultry supports flock registers, placements, stock reconciliation, health events, transfers, sales and cycle closure. Fish and apiary operations support pond and hive registers, stocking, water observations, fish-cycle events, hive inspections, colony events and harvest history.

All enterprise pages include overview summaries, daily production, managed registers and lifecycle histories. Production records can be reviewed, flagged for correction and corrected with recalculated accepted output. Asset counts can be reconciled through lifecycle events. These workflows persist locally and were verified with a simulated offline write.

**Phase 1: Crop operations remains complete for the agreed local-development scope.**

The crop workspace now includes editable seasons, varieties, fields/blocks, planting sessions, lifecycle/status changes, field observations, harvest batches and searchable crop/harvest registers. Season date order and duplicate master records are validated; master data feeds the planting workflow; summaries use stored records and live Kampala dates; harvest reports show gross, rejected and accepted quantities.

Live master-data synchronization, Supabase validation, hosting and domain setup remain intentionally deferred with the other production integrations in PENDING_REAL_INTEGRATIONS.md. They are not part of the completed local Phase 1 scope.

Animal and crop records currently use versioned local IndexedDB stores and do not claim to have synchronized. Production integration adapters and server migrations remain pending by agreement.

## Remaining development

- Production integration, user acceptance, training and launch preparation listed in PENDING_REAL_INTEGRATIONS.md.

## Verification — 3 November 2026

- Final Phase 6 automated verification: lint and TypeScript checks completed cleanly, forty-seven tests across seven test files passed, and the production/PWA build completed successfully.
- Reporting verification passed for cross-enterprise aggregation, inclusive date filters, enterprise filters, revenue, stock valuation, reorder exceptions, balanced-journal detection and CSV generation.
- Browser coverage passed for the Reports route, management summaries, saved report snapshots and reload persistence.
- Administration browser coverage passed after correcting an unindexed user-sort defect: the default four responsibility assignments loaded, the least-privilege matrix rendered, and a clearly labelled QA supervisor assignment was created with an audit event.
- Farm settings, permission policy, audit records and acceptance-run data use the versioned local administration store; destructive audit deletion is intentionally unavailable.
- Phase 6 QA records exist only in the local browser profile and are not real farm users, reports or production authorization records.

- Final Phase 5 automated verification: lint and TypeScript checks completed cleanly, thirty-seven tests across six test files passed, all 38 source-form mappings resolved, and the production build completed successfully.
- Browser coverage passed for hierarchical role visibility, routine-form due counts, a simplified worker submission, automatic restriction and high-risk corrective-action creation, manager approval, action reassignment, evidence-backed closure and reload persistence.
- The controlled catalogue rendered all 38 forms and retained direct access to each original PDF. The issue/print guide is also available from the QHSE heading.
- Management coverage passed for cross-enterprise production, finance and stock indicators, a worker safety announcement, exception counts and a dated management report-pack snapshot; announcement and report-pack records survived reload.
- Mobile 390×844 QHSE layout passed after correcting an implicit grid-column overflow: the document stays within the viewport and the wide controlled-record table scrolls only inside its panel.
- Phase 5 browser data is clearly QA-labelled and exists only in the local in-app browser profile; it is not real farm production data.

- Final Phase 4 verification: lint and TypeScript checks completed cleanly, thirty-one tests across five test files passed, and the production build completed successfully.
- Browser coverage passed for customers, suppliers, a USh 320,000 sale with partial mobile-money and bank receipts, a USh 90,000 supplier bill with a partial cash payment, and a USh 95,000 net wage with partial mobile-money and bank payments.
- The full browser ledger remained balanced at USh 960,000 debits and USh 960,000 credits; customer balance was USh 150,000, supplier balance USh 60,000, outstanding wages USh 40,000 and cash position USh 285,000.
- Accountant controls passed: a USh 200,000 cash balance reconciled with zero difference, October 2026 closed successfully, and a journal dated inside the closed period was visibly rejected. Period, reconciliation and journal records survived reload.
- Mobile 390×844 accounting layout passed after correcting document-level overflow; the final document width stayed within the viewport and wide ledgers scroll inside their table containers. Browser console contained no errors or warnings.
- Phase 4 browser data is clearly QA-labelled and exists only in local browser profiles; it is not real farm production data.
- Final Phase 3 verification: lint and TypeScript checks completed cleanly, twenty-one tests across four test files passed, and the production build completed successfully.
- Automated in-app browser coverage passed for supplier and item setup, a 100 kg batch-controlled receipt, a 55 kg poultry issue, a 5 kg partial location transfer and a 10 kg negative adjustment, leaving the correct 35 kg balance and USh 87,500 valuation.
- Reorder control reported a 5 kg shortfall against the 40 kg threshold. Expiry control reported the two remaining location lots for batch QA-BATCH-001 with the correct shared expiry date.
- Excess issue from a 30 kg lot was visibly rejected and did not add a ledger entry. All successful records, lot splits, alerts and balances survived navigation and reload.
- Mobile 390×844 layout passed without document-level horizontal overflow; the browser console contained no errors or warnings.
- Phase 3 browser data is clearly QA-labelled and exists only in the local in-app browser profile; it is not real farm production.
- Final Phase 2 verification: lint completed with no warnings, fourteen tests across three test files passed, and the production build completed successfully.
- Automated Edge browser coverage: livestock register plus vaccination/follow-up history; poultry flock reconciliation from 500 to 498 birds; pond stocking; hive inspection; reload persistence and search all passed.
- Poultry production review passed: 100 eggs less 3 lost initially produced 97 accepted; the record was flagged, corrected to 2 lost, recalculated to 98 accepted and persisted as reviewed.
- Offline simulation passed: a flock record was saved while the browser context was offline and remained available after reconnect and reload.
- Desktop 1440×900 and mobile 390×844 enterprise layouts passed with no document-level horizontal overflow, framework overlay, console errors or warnings.
- Phase 2 browser data is clearly QA-labelled and exists only in the automated local browser profile; it is not real farm production.
- Final crop verification: lint completed with no warnings, nine tests across three test files passed, and the production build completed successfully.
- Automated Microsoft Edge browser run at `http://127.0.0.1:5173/crops`: correct page identity, meaningful render, no framework overlay, and no console errors or warnings.
- Created a QA field/block, variety and season; each survived reload and appeared in the new-planting selectors.
- Created a QA Beans planting dated 2 November 2026, changed its lifecycle stage to Harvesting and confirmed the stage survived reload.
- Recorded 50 kg gross harvest less 5 kg rejected; the crop register displayed 45 kg accepted with grade and destination, and all values survived reload and search filtering.
- Desktop 1440×900 and mobile 390×844 browser views passed; the mobile page had no document-level horizontal overflow and exposed the navigation control.
- The Phase 1 browser records are clearly QA-labelled and live only in the automated local browser profile; they are not real farm records.
- Live in-app browser: milk save (20 L gross, 2 L rejected, 18 L accepted), reload persistence, matching search and no-match search passed.
- Losses exceeding gross output and fractional egg counts were rejected visibly.
- Poultry save: 100 eggs less 3 rejected produced 97 accepted.
- Fish save: 320 kg less 12 kg rejected produced 308 kg accepted.
- Honey save: 12.5 kg less 0.5 kg rejected produced 12 kg accepted.
- Inspected narrow browser layout and horizontally scrollable production register.
- Four clearly labelled QA records remain in local device storage; they are not real farm production.
- Screenshot: design/animal-browser-qa.png. Production integrations remain deferred.
- All six local-development phases are complete; production integration and formal farm-user acceptance remain.

## Qualification of earlier completion claims

The earlier Phase 1 statement was corrected while the missing local workflows were implemented and verified. The local crop scope listed above is now supported by passing build, tests and browser evidence. Database RLS declarations still have not been validated against a running production database, and live deployment remains intentionally deferred.
