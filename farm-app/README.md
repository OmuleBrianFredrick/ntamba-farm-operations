# Ntamba Farm Operations

## Public demonstration workspace

The authenticated farm workspace remains available at the normal routes. A separate public demonstration workspace is available at `/demo` after the demo-only Supabase migration has been applied. It uses a dedicated `public_demo_records` table and separate IndexedDB databases, so visitors can collaborate on demonstration data without reading or changing production farm records.

Apply `supabase/migrations/202611200001_public_demo_collaboration.sql` in the Supabase SQL Editor before publishing `/demo`. This migration grants the anonymous role access only to the demo table and enables Realtime for that table. Never enter real farm, customer, worker, financial, or personal data in the public workspace.

Offline-first farm operations application covering daily outputs, workers and wages, finance, and the existing 38 QHSE forms.

## What is implemented

- Responsive manager overview and worker daily-output workflow
- IndexedDB drafts and durable synchronization queue
- Supabase email/password authentication with local demo fallback
- Multi-organization roles and row-level security
- Daily work, workers, inputs, finance, double-entry journals, invoices, payments and outstanding wages schema
- Hierarchical assignment and submission schema for all 38 QHSE forms
- Crop and variety register, seasons, planting sessions, planting inputs, field observations and traceable harvest batches
- Searchable crop workspace with offline-first planting and crop-update workflows
- Authenticated module synchronization for animal, crop master, inventory, finance, QHSE and administration stores. Mutations use a scoped, idempotent envelope with durable retry and stale-write conflict reporting; the authenticated membership supplies the organization/farm scope and QHSE role.

## Local application

```bash
npm install
copy .env.example .env.local
npm run dev
```

For visual-only local development, set `VITE_DEMO_MODE=true`. Records remain in the browser synchronization queue. For a connected environment, supply the project URL and publishable key and leave demo mode false. Apply `supabase/migrations/202611220003_authenticated_module_sync.sql` after the Stage 2 code is deployed. It creates the RLS-protected `farm_sync_records` envelope and enables Realtime for server-to-browser updates. Keep failed envelopes in the local queue until the reported connection or conflict is resolved.

## Database

The versioned database is in `supabase/migrations`; stable development reference data is in `supabase/seed.sql`.

```bash
npx supabase start
npx supabase db reset
```

After creating the first authentication user, add that user to `public.memberships` with an administrator or manager role. Public sign-up is disabled in `supabase/config.toml`; production accounts must be invited or created by an administrator.

## Verification

```bash
npm run lint
npm test
npm run build
```
