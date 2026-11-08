# Pending Real Integrations

Status: **Production integration is now in progress. GitHub, the Supabase database foundation and platform authentication are complete; the unchecked items below remain pending.**

This document is the permanent handover checklist. Development must keep integration boundaries ready, but must not block completion of the application modules on live-service setup.

## Production infrastructure

- [x] Publish the source repository at `https://github.com/OmuleBrianFredrick/ntamba-farm-operations` and make it public as requested.
- [x] Create the `ntamba-farm-operations` Supabase project under the `Ntamba Farm` organization.
- [x] Apply all four versioned database migrations and the approved Ntamba Farm reference seed.
- [x] Verify 32 public tables, row-level security on all 32 tables, 38 controlled QHSE form definitions and the seeded farm master records.
- [x] Connect the local application through a Git-ignored `.env.local` file using only the client-safe project URL and publishable key.
- [x] Configure local authentication URLs and disable unrestricted public sign-up.
- [x] Configure Supabase authentication, protected frontend routes, administrator/CEO memberships, secure administrator invitations, password setup, password recovery and role-aware Administration access.
- Configure production file storage for QHSE evidence, receipts, farm photographs and supporting documents.
- Select a hosting provider and deploy production, staging and preview environments.
- Register or connect a suitable domain name.
- Configure DNS, HTTPS certificates, redirects and the preferred canonical domain.
- Configure production environment variables and secrets; never commit credentials to the repository.

## Communications and external services

- Select email delivery provider and verify the sending domain.
- Decide whether SMS and/or WhatsApp notifications are required, then integrate the selected provider.
- Configure mobile-money and bank-payment integrations only after the accounting workflows are approved.
- Configure automated backups, restore testing and off-site retention.
- Configure error tracking, uptime monitoring, audit alerts and operational logs.
- Configure analytics only with an approved privacy policy and minimum necessary data collection.

## Finance production integration

- Import accountant-approved opening balances and historical outstanding customer, supplier and wage balances.
- Enforce posting permissions, approvals, period locks and reopening authority on the production server.
- Connect approved mobile-money and bank feeds, then add statement import and transaction matching.
- Connect stock receipts, issues, losses and sales-cost calculations to the general ledger after the inventory accounting policy is approved.
- Add production invoice/receipt numbering, printable tax documents and any statutory tax configuration confirmed by the accountant.
- Validate backups, audit logs, reconciliation sign-off and period-close reports with the accountant before production use.

## QHSE production integration

- Replace the local role preview with authenticated user roles, server-enforced row-level permissions and approved form assignments.
- Store QHSE attachments, photographs, signatures and supporting evidence in protected production storage with controlled download access.
- Generate server-controlled printable records and report packs with approved numbering, signatures, version history and tamper-evident audit metadata.
- Configure daily, weekly and monthly reminders, escalation rules and overdue corrective-action notifications through approved email, SMS or WhatsApp providers.
- Confirm legal and operational retention periods, confidential-record access, device-cache policy and deletion/archival authority before production use.
- Validate the QHSE issue register, approval routing, action closure and management reporting with the responsible farm officers before launch.

## Reporting and administration production integration

- [x] Replace the Administration user register with authenticated Supabase users, invitation delivery, account recovery and server-enforced farm-role management.
- Extend server-enforced enterprise assignments and module permissions as each operational IndexedDB store is synchronized to Supabase.
- Persist audit events on the server with tamper-evident retention, authorized export, monitoring alerts and an approved archival policy.
- Run cross-enterprise reports against synchronized server records and add approved scheduled delivery, background generation and protected file storage.
- Confirm reporting calendars, cutoff rules, enterprise ownership and management sign-off responsibilities with the farm leadership team.
- Add administrator-only backup/restore operations, production health status and safe data-import tooling after infrastructure is available.
- Repeat the whole-system acceptance suite against staging with every production role before approving live cutover.

## Launch readiness

- Replace all demonstration master data with verified farm data.
- Import existing worker, customer, supplier, enterprise, stock and opening-balance records.
- Complete security, permission, offline-sync, performance and recovery testing.
- Conduct user acceptance testing with managers, accountants, supervisors and ordinary workers.
- Train users and issue role-specific operating guides.
- Approve the production cutover, rollback and post-launch support plans.

## Domain decision

A domain will be required for the live system. The final name should be short, easy to pronounce and type, controlled by the farm, and capable of supporting addresses such as `app.example.com`, `admin.example.com` and `support@example.com`. Domain availability and purchase will be handled during the integration/deployment phase.

## Current development rule

Continue integration in controlled stages. Never commit credentials; verify each provider connection locally before hosting, domain activation and production cutover.
