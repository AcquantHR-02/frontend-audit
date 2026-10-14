# Audit System — Frontend Progress Log

> Living document. Updated at the end of every step with what was done, decisions made, and what's next.
> Source of truth for business rules: `Audit_System_Documentation_V6.docx` (spec V6, last updated 2026-10-08).

---

## 1. Project Overview

Frontend for the **Acquant HR Audit System**: a tool the auditor (Acquant HR) uses to run compliance audits of:

- **Vendor Audits**: auditing contractors/vendors working at a Principal Employer's (PE) units.
- **PE Audits**: auditing the PE itself (onboarding health-check or ad-hoc).

Core concepts: Audit Runs → Audit Item Results (AIRs) → Evidence (3 paths) → auditor stamps C / NC / NA → Publish → Findings for every NC.
Four roles: `AUDITOR_ADMIN`, `AUDITOR_USER`, `VENDOR_USER`, `PE_USER`.

**Team split:** frontend (this repo) and backend (built separately by a teammate). The backend has no endpoints yet, so the frontend runs against **MSW mocks** and will switch to the real API with an env variable.

---

## 2. Tech Stack (agreed)

| Concern                        | Choice                                                                                 | Notes                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Framework                      | Next.js 16 (App Router) + React 19 + React Compiler                                    | `proxy.ts` replaces `middleware.ts` in v16                                                                |
| Language                       | TypeScript (strict)                                                                    |                                                                                                           |
| HTTP + server state            | **RTK Query** (Redux Toolkit)                                                          | One `baseApi`, features inject endpoints; tag-based invalidation; JWT + refresh via `baseQueryWithReauth` |
| Client state                   | Redux Toolkit slices                                                                   | No Zustand / Context sprawl                                                                               |
| UI components                  | shadcn/ui (Radix primitives) + Tailwind CSS v4                                         |                                                                                                           |
| Tables                         | TanStack Table                                                                         |                                                                                                           |
| Forms + validation             | react-hook-form + zod                                                                  | Spec rules (file counts, mandatory remarks) as zod schemas                                                |
| API mocking                    | MSW (Mock Service Worker)                                                              | Real HTTP calls intercepted at the network level; delete `src/mocks` when backend is live                 |
| Icons / toasts / dates / theme | lucide-react / sonner / date-fns / next-themes                                         |                                                                                                           |
| Added when needed              | nuqs (URL state), cmdk (Ctrl+K), Recharts, react-dropzone, Motion, ExcelJS, Playwright |                                                                                                           |
| Code quality                   | ESLint (+ import boundaries), Prettier (+ tailwind plugin), Husky + lint-staged        |                                                                                                           |
| Testing                        | Vitest + Testing Library (unit), Playwright (e2e)                                      |                                                                                                           |
| Future                         | `@rtk-query/codegen-openapi`                                                           | Generate typed endpoints from backend Swagger once available                                              |

---

## 3. Folder Structure

```
audit-frontend/
├── e2e/                         # Playwright end-to-end tests
├── public/                      # static assets (+ mockServiceWorker.js from MSW)
├── src/
│   ├── app/                     # ROUTING ONLY: thin pages composing features
│   │   ├── (auth)/              # public: login, change-password
│   │   └── (dashboard)/         # protected: sidebar + topbar layout
│   │       ├── overview/
│   │       ├── audit-runs/      # list, new (wizard), [runId] (workspace)
│   │       ├── findings/        # list, [findingId]
│   │       ├── reports/
│   │       ├── assignments/     # vendor-units, vendor-checklists, pe-checklists
│   │       ├── masters/         # states, acts, principal-employers/[peId], vendors, checklists/{vendor,pe}
│   │       └── admin/           # users, audit-trail, retention
│   ├── features/                # BUSINESS MODULES
│   │   ├── auth/  dashboard/  audit-runs/  audit-items/  evidence/  findings/
│   │   └── assignments/  masters/  users/  reports/  audit-trail/
│   │       └── <feature>/{api, components, schemas, hooks, utils, index.ts}
│   ├── components/
│   │   ├── ui/                  # shadcn primitives (generated)
│   │   ├── layout/              # sidebar, topbar, breadcrumbs, command menu
│   │   └── shared/              # DataTable, PageHeader, StatusBadge, EmptyState...
│   ├── config/                  # env (zod-validated), navigation, site
│   ├── lib/
│   │   ├── auth/                # role → permission map, can()
│   │   ├── domain/              # pure business rules (score, window phases) + tests
│   │   └── utils/               # cn(), formatters
│   ├── types/domain/            # entity types from the spec
│   ├── store/                   # makeStore, typed hooks, baseApi, baseQuery
│   ├── mocks/                   # MSW handlers + seeded mock DB
│   ├── hooks/                   # generic hooks only
│   └── providers/               # StoreProvider, ThemeProvider, AppProviders
└── PROGRESS.md                  # this file
```

### Conventions

1. **One-way imports:** `app → features → components / lib / types / store`. Features import each other only through `index.ts`.
2. **Thin pages:** `page.tsx` composes feature components; no business logic.
3. **Business rules in `lib/domain`** as pure, unit-tested functions.
4. **Naming:** kebab-case files; PascalCase components; `use-*` hooks; suffixes `.api.ts`, `.slice.ts`, `.schema.ts`, `.test.ts`.
5. **Tests next to code**; e2e in `/e2e`.
6. **Absolute imports** via `@/`.

---

## 4. Roadmap

| #   | Step                                                                                                              | Status     |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Foundation: deps, folders, shadcn, domain types, RTK store + baseApi, MSW seed, providers, tooling, showcase page | ✅ Done    |
| 2   | Auth (login, JWT, change-password) + RBAC + app shell (sidebar, topbar, role-filtered nav)                        | ✅ Done    |
| 3   | Master data: States, Acts, PEs + Units (close/reopen), Vendors, Checklist masters, Users                          | ✅ Done    |
| 4   | Assignments: vendor↔unit, vendor checklists, PE checklists (versioned, Apply Master)                              | ⏳ Pending |
| 5   | Audit run creation wizard (validations, auto-materialise, PERIODIC bulk-add)                                      | ⏳ Pending |
| 6   | Run workspace: party upload + NA proposal, auditor review (3 paths), windows, Window 2, Publish                   | ⏳ Pending |
| 7   | Findings: list, detail, remediation uploads, resolve                                                              | ⏳ Pending |
| 8   | Dashboards, score reports, Excel exports, audit trail, retention notices                                          | ⏳ Pending |

---

## 5. Decisions Log

| Date       | Decision                                               | Reason                                                             |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| 2026-10-14 | Start frontend before backend; use MSW mocks           | Backend endpoints not ready                                        |
| 2026-10-14 | RTK Query for HTTP (instead of TanStack Query + axios) | Team decision                                                      |
| 2026-10-14 | Redux slices for client state (no Zustand)             | One state library, consistent                                      |
| 2026-10-14 | MSW instead of an in-app mock adapter                  | Real HTTP code from day one; zero changes when backend goes live   |
| 2026-10-14 | Feature-based folder structure                         | Scalable, professional, easy to navigate                           |
| 2026-10-14 | `@types/node` bumped 20 → 24                           | Matches Node 24 runtime; required by Vitest 5                      |
| 2026-10-14 | Assume JWT auth until backend confirms                 | Can be adjusted in `store/base-query.ts` only                      |
| 2026-10-14 | Design: reference canvas patterns, deep-blue palette   | User request: follow reference layout, change colours to dark blue |
| 2026-10-14 | Fonts: Inter (UI) + JetBrains Mono (IDs, codes)        | Dense, legible tables; mono for AR-/AIR codes                      |
| 2026-10-14 | Session slice in `store/`, not `features/auth`         | Base query reads the token; infra must not depend on a feature     |
| 2026-10-14 | Access token in memory, refresh via httpOnly cookie    | XSS-safe; reload restores session via `/auth/refresh`              |
| 2026-10-14 | `as const` objects instead of TS `enum`                | JSON-compatible, tree-shakeable                                    |
| 2026-10-14 | Score rounding with integer arithmetic                 | Exact half-up at .x5 boundaries (no float error)                   |
| 2026-10-14 | Kept shadcn's new `cn` package (dropped clsx/twMerge)  | Official shadcn default; verified publisher; avoid duplicates      |

## 6. Open Questions (for backend teammate)

- Auth: JWT (access + refresh) or session cookie? Endpoint shapes?
- Will the backend expose Swagger/OpenAPI (springdoc)? Enables generating RTK Query endpoints.
- Pagination / error response envelope format.
- File upload: multipart to API, or pre-signed URLs?
- Assumption to confirm: a `VendorChecklistAssignment` version holds the full ticked item set (`checklistItemIds[]`).
- Auth endpoints the frontend expects: `POST /auth/login`, `/auth/refresh` (httpOnly cookie), `/auth/logout`, `/auth/change-password`, `GET /auth/me`. Error `code`s used: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED` (423), `ACCOUNT_INACTIVE`, `INVALID_CURRENT_PASSWORD`.
- Password policy and lockout threshold (frontend assumes 8+ chars with upper/lower/digit/special, lock after 5 failures).
- Master-data endpoints the frontend expects (all paginated `?page&size&sort&search` + filters): `/states`, `/acts`, `/principal-employers`, `/pe-units?peId&status`, `/vendors`, `/checklist-items`, `/pe-checklist-items` (`?actId&stateId=<id|NATIONAL>&cadence&active`), `/users?role&active`. Soft delete via `PATCH /{resource}/{id}/status {isActive}`. Units: `POST /pe-units/{id}/close {closedOn}` → `{unit, endedAssignments}`, `POST /pe-units/{id}/reopen`. Users: `POST /users/{id}/reset-password`, `POST /users/{id}/unlock`.
- List rows include derived counts (see `*Summary` / `*View` types in `src/types/domain/master.ts`).
- Temporary passwords: mock returns them to the admin; production should email them instead.
- Assumption to confirm: JSON is camelCase (Spring/Jackson default) and IDs are serialised as strings.

## 6a. Spec Questions (for the spec owner)

- §10 worked example lists **Rathna total = 99.4%**, but (247 + 121) / 370 = 99.459…% → one-decimal half-up gives **99.5%**.
  The spec's figure looks truncated. Frontend follows the written rule (half-up) → 99.5%. Please confirm.

---

## 7. Changelog

### 2026-10-14 — Step 1 ✅ Foundation complete

- Read and analysed spec V6 (all 20 sections).
- Created branch `feature/foundation`.
- Installed: `@reduxjs/toolkit`, `react-redux`, `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`, `sonner`, `lucide-react`, `radix-ui`, `next-themes`, `clsx`, `tailwind-merge`, `class-variance-authority`.
- Installed dev: `msw`, `prettier`, `prettier-plugin-tailwindcss`, `husky`, `lint-staged`, `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, Testing Library.
- Removed: `@tanstack/react-query` (replaced by RTK Query).
- Created the full folder skeleton (`.gitkeep` in empty folders; `index.ts` public entry per feature).
- Created this `PROGRESS.md`.

- **shadcn/ui** initialised (Radix base, Nova style) + 32 components in `src/components/ui/`.
- **Design tokens** (`globals.css`): deep-blue primary, navy sidebar gradient (`bg-sidebar-gradient`), semantic status colours (success / warning / danger / info / neutral / violet, each with `-subtle` and `-border`), full dark mode.
- **Domain types** (`src/types/domain/`): every entity from the spec; `AuditRun` is a discriminated union (VENDOR vs PE) so TypeScript enforces the §15.5 CHECK constraint.
- **RTK Query** (`src/store/`): `makeStore`, typed hooks, `baseApi` with all tag types, `baseQuery` with JWT header, single-flight refresh on 401, and error normalisation to `ApiError`.
- **MSW mock backend** (`src/mocks/`): seed (Veero Metals, 10 units, 19 vendors, 14 Acts, 35 KA checklist items, 4 demo users), localStorage persistence, auth handlers (login / refresh / logout / me), read handlers (states, acts, vendors).
- **Providers**: Theme → MSW → Store → Tooltip + Toaster.
- **Domain logic**: `lib/domain/score.ts` (§10 formula, tested) and `status-meta.ts` (labels and tones for every status enum).
- **Shared components**: `StatusBadge`, `PageHeader`, `KpiCard`.
- **Tooling**: Prettier (+ tailwind plugin), ESLint import-boundary rules, Husky + lint-staged pre-commit, Vitest, env validation with zod, `.env.example`.
- **Showcase page** at `/showcase` (temporary): tokens, status language, components, and live data (sign in → vendors via RTK Query → MSW).
- **Tests**: 11 passing (score rules incl. spec examples; auth pipeline: login, bad credentials, token refresh + retry).
- Fixes along the way: MSW v3 API changes (`onUnhandledFrame`, `msw/browser` is browser-only → Turbopack `resolveAlias` stub), double worker start under React Strict Mode, `use-mobile` hook rewritten with `useSyncExternalStore`.
- Removed: `clsx`, `tailwind-merge`, `vite-tsconfig-paths` (redundant), default Next.js SVGs.

### Demo accounts (mock backend)

| Role          | Email                    | Password                                |
| ------------- | ------------------------ | --------------------------------------- |
| AUDITOR_ADMIN | `admin@acquanthr.test`   | `Password@123`                          |
| AUDITOR_USER  | `auditor@acquanthr.test` | `Password@123`                          |
| VENDOR_USER   | `vendor@rathna.test`     | `Password@123`                          |
| PE_USER       | `pe@veerometals.test`    | `Password@123`                          |
| AUDITOR_USER  | `newuser@acquanthr.test` | `Password@123` (forced password change) |

> Mock data lives in your browser's localStorage. To reset it, clear site data for localhost (a "Reset demo data" button comes later).

### How to run

```bash
npm install
cp .env.example .env.local   # first time only
npm run dev                  # http://localhost:3000 → /login
npm test                     # unit + integration tests
npm run lint && npm run typecheck
```

### 2026-10-14 — Step 2 ✅ Auth, RBAC & app shell

- **Login** (`/login`): split-screen layout (navy gradient brand panel + form), zod validation, inline errors, server error banner with distinct _locked_ state, show/hide password, safe `?next=` redirect, demo-accounts helper (only when mocking is enabled).
- **Session**: restored on page load via `/auth/refresh`; `AuthGuard` (protected pages) and `GuestGuard` (login page); sign-out clears the whole RTK Query cache.
- **Forced password change** (`/change-password`, §18): live password-policy checklist; also reachable from the user menu.
- **RBAC** (`lib/auth/permissions.ts`): 20 permissions mapped to the 4 roles per §18; `can()`, `canAny()`, `useCan()` hook.
- **App shell**: collapsible navy-gradient sidebar (icon mode, mobile drawer, active indicator), sticky header with breadcrumbs, Ctrl/⌘+K command menu, notifications popover, user menu (role badge, theme, change password, sign out).
- **Navigation config** (`config/navigation.ts`): single source for sidebar, breadcrumbs, command menu and route guarding.
- **Route protection**: typed URLs outside the role's permissions show a 403 page.
- **Overview** page with role-specific framing; placeholder pages for all 15 other modules (no dead links); styled 404.
- **Mock backend**: per-user passwords, lock after 5 failed logins (423), change-password endpoint, 5th demo user `newuser@acquanthr.test` (must change password).
- Removed the temporary `/showcase` page.
- **Tests: 30 passing** (+ permissions, navigation, auth schemas, lockout, password change).

### 2026-10-14 — Step 3 ✅ Master data, users & branding

- **Branding**: Acquant HR wordmark on the login form, glowing "A" as login hero, "A" mark in the sidebar, favicon + Apple icon (A on a navy tile); colour tokens aligned to the logo. Assets optimised with sharp (`public/brand/`, 1 MB → 31 KB for the hero).
- **Reusable table kit** (`components/shared/data-table/`): `DataTable` (TanStack Table v9, server-side sort, skeletons, empty states, clickable rows), `DataTableToolbar` (debounced search + filters), `DataTablePagination`, `SortableHeader`; URL state via nuqs (`useTableUrlState`, `useUrlFilter`).
- **Shared dialogs**: `FormDialog`, `ConfirmDialog`, `StatusChangeDialog` (soft delete); `RowActions`, `FilterSelect`, `ActiveBadge`; `applyApiError` maps server field errors into forms.
- **Modules** (Admin edits, Auditor read-only — §18):
  - **States**: list, add, edit.
  - **Acts**: list with linked item counts, add, edit, deactivate.
  - **Principal Employers**: list with unit counts; **detail page** with Units (add, edit, **close/reopen** per §13: closing ends active vendor assignments one-way; reopening doesn't restore them; either auditor role can close).
  - **Vendors**: list with active-unit counts, add, edit, deactivate.
  - **Vendor & PE checklist masters**: filters (Act, scope incl. National, cadence, status), cadence explanations, snapshot notice on edit (§7A Lock 4), deactivate.
  - **Users & access**: role/status filters, add (role-dependent vendor/PE scope), edit, reset password (one-time temporary password with copy), unlock, deactivate (not yourself).
- **Mock backend**: generic CRUD factory, uniqueness/validation with field errors (400/409), permission checks (403), PE checklist seed (14 items), DB v3.
- **Tests: 41 passing** (+ masters API rules incl. §13 closure, users API, Vendors page UI by role).
- Fixes: RTK `overrideExisting` in dev (Fast Refresh console errors), Testing Library cleanup.

**Next: Step 4**: Assignments: vendor ↔ unit (versioned), vendor checklists per (vendor, unit) and PE checklists per PE (versioned, onboarding pre-tick, "Apply master").
