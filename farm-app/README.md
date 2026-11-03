# Ntamba Farm Operations

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

## Local application

```bash
npm install
copy .env.example .env.local
npm run dev
```

For visual-only local development, set `VITE_DEMO_MODE=true`. Records remain in the browser synchronization queue. For a connected environment, supply the project URL and publishable key and leave demo mode false.

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
