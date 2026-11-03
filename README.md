# Ntamba Farm Operations

Ntamba Farm Operations is an offline-first farm management system for recording daily production, crops, livestock, labour and wages, stock and inputs, finance, QHSE, and farm reports.

## Repository structure

- `farm-app/` - React and TypeScript application
- `farm-app/supabase/` - versioned Supabase migrations, configuration, and development seed data
- `Farm QHSE Forms/` - original QHSE reference forms
- `design/` - design reference material
- `DEVELOPMENT_PLAN.md` - locked implementation plan
- `DEVELOPMENT_STATUS.md` - current delivery status
- `PENDING_REAL_INTEGRATIONS.md` - integrations deferred until local development is complete

## Run locally

```bash
cd farm-app
npm install
copy .env.example .env.local
npm run dev
```

Use `VITE_DEMO_MODE=true` for local demonstration without Supabase. Do not commit `.env.local` or any production credentials.

## Verification

```bash
cd farm-app
npm run lint
npm test
npm run build
```

See [`farm-app/README.md`](farm-app/README.md) for application and database details.
