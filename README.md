# Audit Management System — Frontend

Frontend for the **Acquant HR Audit System**: vendor and Principal Employer compliance audits with
windowed evidence collection, auditor review, findings and score reporting.

Business rules follow `Audit_System_Documentation_V6.docx`. The full build log, decisions and the
API contract notes for the backend are in **[PROGRESS.md](./PROGRESS.md)**.

## Quick start

```bash
npm install
cp .env.example .env.local   # first time only
npm run dev                  # http://localhost:3000
```

The app runs against an in-browser **mock backend (MSW)** by default. Demo accounts (password `Password@123`):

| Role          | Email                    |
| ------------- | ------------------------ |
| AUDITOR_ADMIN | `admin@acquanthr.test`   |
| AUDITOR_USER  | `auditor@acquanthr.test` |
| VENDOR_USER   | `vendor@rathna.test`     |
| PE_USER       | `pe@veerometals.test`    |

Mock data lives in the browser's localStorage; clear site data to reset it.

## Connecting the real backend

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_API_MOCKING=disabled
```

Every endpoint the UI calls is listed in PROGRESS.md › _Open Questions_; the request/response types are in
`src/types/`. The mock handlers in `src/mocks/handlers/` are an executable reference of the expected behaviour.

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run build`     | Production build                     |
| `npm test`          | Unit + integration tests (Vitest)    |
| `npm run lint`      | ESLint (incl. import-boundary rules) |
| `npm run typecheck` | TypeScript                           |
| `npm run format`    | Prettier                             |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Redux Toolkit + RTK Query · shadcn/ui (Radix) ·
Tailwind CSS v4 · TanStack Table · react-hook-form + zod · nuqs · Recharts · ExcelJS · MSW · Vitest.

## Structure

```
src/
  app/          routes only (thin pages)
  features/     business modules: auth, dashboard, audit-runs, findings, assignments, masters, users, reports, audit-trail
  components/   ui (shadcn) · layout (shell) · shared (DataTable, dialogs, badges…)
  lib/          auth (permissions) · domain (pure business rules, tested) · export (Excel) · utils
  store/        Redux store, RTK Query base API
  mocks/        MSW mock backend + seed data
  types/        domain + API types
```

Features import each other only through their `index.ts`; shared layers never import features (enforced by ESLint).
