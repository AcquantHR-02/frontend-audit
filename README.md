# Audit Management System — Frontend

Web app for the **Acquant HR Audit System**. Acquant HR (the auditor) uses it to run labour-law
compliance audits of:

- **Vendors**: contractors working at a Principal Employer's units ("Vendor audit").
- **Principal Employers (PEs)**: the client company itself ("PE audit": onboarding health-check or ad hoc).

The audited party uploads evidence for each compliance requirement. The auditor stamps every item
**Complied / Not complied / Not applicable**, then publishes the result. Every _Not complied_ item
becomes a **finding** that the party must fix. Scores, dashboards and Excel reports roll it all up.

> Business rules come from `Audit_System_Documentation_V6.docx` (section numbers like §4 below refer
> to it). The build history, decisions and backend API contract notes are in **[PROGRESS.md](./PROGRESS.md)**.

---

## Contents

1. [Quick start](#1-quick-start)
2. [Key concepts (glossary)](#2-key-concepts-glossary)
3. [Roles and what each can do](#3-roles-and-what-each-can-do)
4. [The audit lifecycle, end to end](#4-the-audit-lifecycle-end-to-end)
5. [Screen-by-screen guide](#5-screen-by-screen-guide)
6. [Business rules reference](#6-business-rules-reference)
7. [Common UI behaviour](#7-common-ui-behaviour)
8. [Mock backend and demo data](#8-mock-backend-and-demo-data)
9. [Connecting the real backend](#9-connecting-the-real-backend)
10. [Tech stack](#10-tech-stack)
11. [Project structure and conventions](#11-project-structure-and-conventions)
12. [Development workflow](#12-development-workflow)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Quick start

**Requirements:** Node.js 24+ and npm.

```bash
npm install
cp .env.example .env.local   # first time only
npm run dev                  # open http://localhost:3000 → redirects to /login
```

The app runs against a **mock backend inside the browser (MSW)** by default, so no server is needed.
Sign in with any demo account (password for all: **`Password@123`**). On the login page you can also
click a role chip under "Demo accounts" to fill the form.

| Role               | Email                    | Use it to try…                                |
| ------------------ | ------------------------ | --------------------------------------------- |
| Auditor Admin      | `admin@acquanthr.test`   | Everything, incl. masters, users, audit trail |
| Auditor            | `auditor@acquanthr.test` | Creating runs, reviewing, publishing          |
| Vendor             | `vendor@rathna.test`     | Uploading evidence, remediating findings      |
| Principal Employer | `pe@veerometals.test`    | Reading vendor results at your units          |
| Auditor (new)      | `newuser@acquanthr.test` | The forced "set a new password" flow          |

---

## 2. Key concepts (glossary)

| Term                        | Meaning                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Principal Employer (PE)** | The client company (demo: _Veero Metals_). Has many **units** (sites/factories).                                                                                |
| **Unit**                    | One PE site, in a State. Can be **closed** (ends vendor assignments there) and reopened.                                                                        |
| **Vendor**                  | A contractor working at one or more PE units (demo: Rathna, Manpro, Uniq…).                                                                                     |
| **Act**                     | A labour law (CLRA, ESIC, EPF, Gratuity, Bonus…). Requirements are grouped by Act.                                                                              |
| **Checklist item**          | One compliance requirement, e.g. _"Register of wages (Form XVII)"_. Lives in a **master** (vendor or PE), is National or State-specific, and has a **cadence**. |
| **Cadence**                 | `LIFETIME` (once ever, e.g. a licence), `ONE_TIME` (once, with a valid-to date), `PERIODIC` (repeats per month/quarter/half-year).                              |
| **Assignment**              | Which vendor works at which unit (with dates), and which checklist items apply to a vendor at a unit, or to a PE. Assignments are **versioned**.                |
| **Audit run**               | One audit of one party at one unit for one **activity period** (e.g. July 2026). Code: `AR-YYYY-NNNN`.                                                          |
| **AIR (Audit Item Result)** | One checklist item inside a run (periodic items get one AIR per period). Holds evidence, the stamp and remarks.                                                 |
| **Evidence**                | Files + remarks for an AIR. Three ways to provide it (Paths 1–3, see §4).                                                                                       |
| **Stamp**                   | The auditor's verdict on an AIR: **C** Complied, **NC** Not complied, **NA** Not applicable.                                                                    |
| **Windows**                 | Date ranges when the party may upload: **Window 1** (always) and an optional **Window 2** (only to fix NC/pending items).                                       |
| **Phase**                   | Where a run is: Scheduled → Window 1 → Auditor review → Window 2 → Final review → Published. Derived from dates, never stored.                                  |
| **Finding**                 | Created automatically for every NC item when a run is published. The party uploads **remediation**; the auditor marks it **resolved**.                          |
| **Score**                   | `(Complied + Not applicable) ÷ total assigned items`, shown with one decimal (e.g. 97.9%).                                                                      |

---

## 3. Roles and what each can do

The UI checks **permissions**, never role names. The single map of role → permissions is
`src/lib/auth/permissions.ts`. Hidden menu items are not the only protection: typing a URL you have
no permission for shows a **403** page.

| Capability                                     | Auditor Admin | Auditor |    Vendor     |                      PE                      |
| ---------------------------------------------- | :-----------: | :-----: | :-----------: | :------------------------------------------: |
| Dashboard (Overview)                           |      ✅       |   ✅    |    ✅ own     |                 ✅ own units                 |
| View audit runs                                |    ✅ all     | ✅ all  |    ✅ own     |        ✅ own + vendors at own units         |
| Create audit runs                              |      ✅       |   ✅    |       —       |                      —                       |
| Review (stamp C/NC/NA), open Window 2, publish |      ✅       |   ✅    |       —       |                      —                       |
| Upload evidence as the party (Path 1)          |       —       |    —    |      ✅       |               ✅ own PE audits               |
| Upload evidence for the party (Path 2)         |      ✅       |   ✅    |       —       |                      —                       |
| View findings                                  |      ✅       |   ✅    |    ✅ own     | ✅ (vendor findings at own units: read-only) |
| Resolve / reopen findings, private notes       |      ✅       |   ✅    |       —       |                      —                       |
| Upload remediation                             |      ✅       |   ✅    | ✅ while open |           ✅ own PE audit findings           |
| Reports + Excel export                         |      ✅       |   ✅    |    ✅ own     |                    ✅ own                    |
| Assignments (vendor units, checklists)         |      ✅       |   ✅    |       —       |                      —                       |
| Masters: view                                  |      ✅       |   ✅    |       —       |                      —                       |
| Masters: add / edit / deactivate               |      ✅       |    —    |       —       |                      —                       |
| Close / reopen units                           |      ✅       |   ✅    |       —       |                      —                       |
| Users & access                                 |      ✅       |    —    |       —       |                      —                       |
| Audit trail                                    |      ✅       |    —    |       —       |                      —                       |
| Retention notices                              |      ✅       |   ✅    |       —       |                      —                       |

Data **scoping** (a vendor sees only its own runs, etc.) is enforced by the backend (the mock does it too).

---

## 4. The audit lifecycle, end to end

### 4.1 One-time setup (Auditor Admin)

1. **Masters** → add **States**, **Acts**, the **Principal Employer** and its **units**, **Vendors**, and
   the **Vendor / PE checklist masters** (the full list of possible requirements).
2. **Users & access** → create logins. Vendor users are tied to one vendor and PE users to one PE.
   The system shows a one-time temporary password, and the user must change it on first sign-in.

### 4.2 Assignments (Auditors)

3. **Vendor units** → assign a vendor to a unit from a start date. Overlapping assignments and closed
   units are rejected. End an assignment when the contract ends.
4. **Vendor checklists** → for each vendor at a unit, tick which master items apply. **Apply master**
   copies the master once. Saving creates a new **dated version** and the history is kept.
5. **PE checklists** → the same for a PE, one checklist across all its units.

### 4.3 Create an audit run (Auditors: _Audit runs → New audit run_)

A 4-step wizard:

| Step                  | What you do                                                                                                                                                                                  | Checks                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **1 Scope**           | Vendor audit (vendor → one of its current units) or PE audit (unit + Onboarding/Ad hoc)                                                                                                      | Vendor must be assigned to the unit; unit must be open             |
| **2 Dates & windows** | Activity period, execution window, Window 1 (quick-fill buttons and suggested windows)                                                                                                       | See [§6.2](#62-run-dates)                                          |
| **3 Items**           | Lifetime/one-time items are added automatically (with _carried forward_ counts). Periodic items get **periods** via bulk add (monthly, FY quarterly, FY half-yearly, whole period) or custom | Warning if a periodic item has no periods                          |
| **4 Review**          | Summary, then **Create**                                                                                                                                                                     | Checklist must cover the whole activity period; no overlapping run |

Creating the run **materialises** one AIR per item/period with a snapshot of the requirement, so later
master edits don't change existing runs.

### 4.4 Collect evidence (Window 1)

During Window 1 the audited party opens the run, clicks an item and uploads evidence:

- **Path 1, party upload:** 1–3 files and mandatory remarks. Or **propose NA** with 0–3 files and a reason.
- **Path 2, auditor upload:** the auditor uploads on the party's behalf (0–3 files), any time before publish.
- **Path 3, no evidence:** the auditor stamps directly, and the remarks carry the audit trail.

Uploaded items show as **Submitted**.

### 4.5 Auditor review

The auditor stamps each item **C / NA / NC** with **mandatory audit remarks**. One-time items with
evidence also need a **valid-to** date. Re-stamping is allowed until the run is published.
Phase buttons (top right of the run):

- **Start review**: close Window 1 early and move to review.
- **End review**: if anything is still pending or NC, the app **requires a Window 2** (pick its dates).
  Only one Window 2 per run.
- **Close Window 2**: end Window 2 early and move to final review.

### 4.6 Window 2 (only if needed)

The party may upload again, but **only for NC or never-stamped items**. Then the auditor re-reviews.

### 4.7 Publish

**Publish** runs a check first:

- **Blocks** publishing: unstamped items, or stamped items without audit remarks.
- **Warns only**: assigned periodic items with no periods in this run.
- Shows how many findings will open.

After publishing, the party can no longer edit, the score is final, and **one finding opens per NC item**.

### 4.8 Findings and remediation

The party opens **Findings**, uploads **remediation** (1–3 files + remarks) while the finding is
**Open**, and it shows as _Remediation submitted_. The auditor reviews it and **marks it resolved**
(or reopens it). Auditors can also keep private notes on a finding.

### 4.9 Reporting

Dashboards, the **Reports** score roll-up, Excel exports and the **Audit trail** all update automatically.
Old data is purged on a rolling 2-financial-year schedule (see **Retention**).

---

## 5. Screen-by-screen guide

### Login (`/login`) and change password (`/change-password`)

- Work email + password, show/hide password, clear error messages. The account **locks after 5 failed
  attempts**.
- After login you are sent back to the page you originally wanted (`?next=`).
- The page never scrolls. On short screens the brand panel and spacing shrink.
- **Change password** shows a live checklist of the password rules. It is forced on first login and
  always available from the profile menu.

### Overview / Dashboard (`/overview`)

Content changes by role.

- **Welcome banner**: greeting, date, role, and shortcuts to _Reports_ and _New audit run_.
- **Needs your attention**: clickable to-dos, e.g. "43 submitted items awaiting review → Review",
  "2 runs ready to publish", "5 items waiting for your evidence", "36 open findings → Remediate".
  It shows "You're all caught up" when there is nothing to do.
- **KPI cards** (each one is a link): Audit runs (with a published progress bar), Awaiting review or
  Items to upload, Published this FY, Open findings.
- **Compliance score**: ring gauge plus the Complied / Not complied / NA breakdown and the formula.
- **Audit runs by phase**: six clickable tiles in workflow order; each opens the filtered run list.
- **Upcoming deadlines**: windows opening or closing in the next 30 days, with an urgency pill
  (`in 5 days`: red ≤ 2 days, amber ≤ 7). Click to open the run.
- **Not complied by Act**: where non-compliance concentrates; each bar opens the matching findings.
- **Open findings by age**: oldest open finding (days) and a breakdown into under 30 / 30–60 / 60–90 / 90+ days.
- **Score trend by activity month**: area chart, latest value and change from the previous month.
  Hover for details.
- **Score by audited party**: lowest first, so the weakest parties are on top.
- **Recent audit runs**: click a row or the run code to open the run.

### Audit runs (`/audit-runs`)

- Table: run code, audited party (+ type), unit · PE, activity period, phase, review progress, score, created.
- Search, filters (**Type**, **Phase**), sortable columns, pagination.
- **New audit run** (auditors) opens the wizard (see [§4.3](#43-create-an-audit-run-auditors-audit-runs--new-audit-run)).

### Run workspace (`/audit-runs/[runId]`)

- **Header**: run code, party, phase badge, scope line; **Export Excel** (detailed audit report) and
  the phase action button (Start review / End review / Close Window 2 / Publish).
- **Phase timeline**: connected stepper. Done phases show a green tick, the current phase is
  highlighted, and the dates are shown under each phase.
- **KPIs**: items, submitted, complied, NA, not complied, score.
- **Items table** with tabs _All / Needs attention (or To upload) / Submitted / Stamped_ and search.
- **Item drawer** (click a row): requirement snapshot, full evidence history (who uploaded what and
  when, remarks, NA proposals, carried-forward evidence, valid-to), the upload form (drag & drop)
  and, for auditors, the review form (C / NA / NC + remarks + valid-to).

### Findings (`/findings`) and finding detail (`/findings/[id]`)

- List: KPIs (Open, Remediation submitted, Resolved), search, filters (**Status**, **Type**).
- Detail: remediation history with files, details card (run link, Act, period, opened, audit remarks),
  the remediation upload form, **Mark resolved / Reopen** (auditors), and private auditor notes.

### Reports (`/reports`)

- Filters: **Principal Employer** (auditors), **Type**, activity period **from / to**.
- KPIs: published runs, complied, not complied, overall score.
- Score roll-up table: one row per party, **expandable to units**, with a sticky grand-total row.
  Totals sum raw counts and round once.
- **Export Excel**: workbook with "Score report" and "By unit" sheets.

### Assignments (auditors)

- **Vendor units** (`/assignments/vendor-units`): status _Current / Starts later / Ended_, filters,
  **Assign** (vendor → PE → open unit + start date), **End assignment**.
- **Vendor checklists** (`/assignments/vendor-checklists`): pick a vendor, then one of its current units.
- **PE checklists** (`/assignments/pe-checklists`): pick a PE.
- The **checklist editor** used by both groups items by Act with group checkboxes and search, and has
  **Apply master**, a _New_ badge for master items not in the current version, version history, and
  save as a new dated version.

### Masters (view: auditors · edit: admin)

| Screen                                            | Operations                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Principal employers**                           | List with unit counts; **detail page** with units: add, edit, **close** (ends active vendor assignments, one-way), **reopen** (doesn't restore them) |
| **Vendors**                                       | List with active-unit counts; add, edit, deactivate                                                                                                  |
| **Acts**                                          | List with linked item counts; add, edit, deactivate                                                                                                  |
| **Vendor checklist master / PE checklist master** | Filters (Act, scope incl. National, cadence, status); add, edit (a notice reminds that existing runs keep their snapshot), deactivate                |
| **States**                                        | List, add, edit                                                                                                                                      |

Deleting is always a **soft delete** (deactivate / reactivate).

### Administration (admin)

- **Users & access**: role/status filters; add (vendor/PE users pick their scope), edit, **reset
  password** (one-time temporary password with a copy button), **unlock**, deactivate (not yourself).
- **Audit trail**: every sign-in, run creation, upload, NA proposal, stamp, phase change, publish,
  remediation, finding status change, unit closure, assignment, user and master-data change.
  Filter by action and search.
- **Retention**: next purge date, which financial year it removes, runs scheduled for purge, and
  30-day / 7-day notice banners.

### Notifications (bell in the header, `/notifications`)

In-app notifications for the signed-in user. The bell shows a red **unread count** and gives one
wiggle when there's something new. It checks for new notifications every 60 seconds; when a new one
arrives, a **toast** pops up with a _View_ button.

| Who gets it | Notification                                               | When                                          | Opens                 |
| ----------- | ---------------------------------------------------------- | --------------------------------------------- | --------------------- |
| Vendor / PE | **Window 1 is open** / **Window 2 is open**                | On the window's start date                    | The run               |
| Vendor / PE | **Window … closes soon**                                   | 2 days before an open window closes           | The run               |
| Vendor / PE | **Results published · 97.1%** (+ how many findings opened) | When the run is published                     | Findings (or the run) |
| Vendor / PE | **Finding resolved** / **Finding reopened**                | When an auditor changes the status            | The finding           |
| Auditors    | **Evidence submitted** / **NA proposed** on AR-…           | When the party uploads                        | The run               |
| Auditors    | **Remediation submitted**                                  | When the party uploads remediation            | The finding           |
| Auditors    | **AR-… is ready for review**                               | When Window 1 closes (or review starts early) | The run               |
| Auditors    | **AR-… is ready to publish**                               | When the run reaches Final review             | The run               |
| Auditors    | **Data purge in N days**                                   | 30 and 7 days before a retention purge        | Retention             |

- **Dropdown**: newest first, grouped _Today / Yesterday / Earlier_, with an _All / Unread_ switch.
  Unread items are highlighted with a dot. Clicking one marks it read and opens its page. There is
  also **Mark all read** and **View all notifications**.
- **Notifications page**: full history with All / Unread (kept in the URL), paging and Mark all as read.
- You never get a notification about your own action, and older scheduled notifications (over 10 days)
  arrive already read.

### App shell (every page)

- **Sidebar**: menu filtered by your permissions; collapses to icons (button or `Ctrl/⌘ + B`);
  becomes a drawer on phones.
- **Header**: breadcrumbs, the **notification bell**, and the **profile menu** (identity card, Light / Dark /
  System theme switch, Change password, Sign out).

---

## 6. Business rules reference

All rules live as **pure, unit-tested functions** in `src/lib/domain/`. Change them there, not in components.

### 6.1 Score (§10, `score.ts`)

- `Score = (Complied + Not applicable) ÷ Assigned total`.
- Stored as raw counts. Rounded **only for display**, to **one decimal, half-up**, always showing the
  decimal (`100.0%`). Uses integer arithmetic, so `.x5` boundaries are exact.
- Totals across runs/parties **sum the raw counts first, then round once**. Rounded scores are never averaged.
- No items assigned → shown as `—`.

### 6.2 Run dates (§4, `audit-runs.ts`)

- Activity end ≥ activity start.
- Execution window starts **after** the activity period ends, and its end ≥ its start.
- Window 1 lies **inside** the execution window.
- Suggested defaults: execution window = the 30 days after the activity period; Window 1 = its first 10 days.
- Periodic bulk-add follows the **Indian financial year** (quarters Apr–Jun…, halves Apr–Sep / Oct–Mar),
  clipped to the activity period.

### 6.3 Phase (§4, `deriveRunPhase`)

Computed from today's date and the run's dates, never stored:
`Published` if published → `Final review` (after Window 2 ends, or closed early) → `Window 2` (inside
its dates) → `Auditor review` (after Window 1 ends, or started early) → `Window 1` (inside its dates)
→ `Scheduled` (before Window 1).

### 6.4 Evidence and review (§4, §9, §12.7, `review.ts`)

- Party upload: Window 1 any item; **Window 2 only NC or never-stamped items**.
- Party: **1–3 files** (0–3 when proposing NA), remarks **mandatory**. Auditor upload: 0–3 files.
- **Valid-to** is mandatory for `ONE_TIME` items that have evidence.
- End of review: **Window 2 is required** when any item is pending or NC.
- Publish **blocked** by unstamped items or missing audit remarks; **warning** for periodic items
  without periods; one finding per NC item.

### 6.5 Assignments and closures (§13, §15.9, `assignments.ts`)

- Assignment status from dates: Starts later / Current / Ended. No overlapping assignments.
- A checklist assignment must cover the **whole activity period** of a run.
- Closing a unit ends its active vendor assignments; reopening does not restore them.

### 6.6 Retention (§12.14, `retention.ts`)

- 2 financial years rolling. Data of FY N becomes purge-eligible on **1 April two years after FY N
  ends** (e.g. FY 2024-25 → 1 Apr 2027). Notices go out 30 and 7 days before.

---

## 7. Common UI behaviour

- **Tables** scroll **inside their own box** with a sticky header. The page itself doesn't grow.
  Sorting and paging happen on the server.
- **Filters and search are kept in the URL** (`?phase=REVIEW&search=ja`). A filtered view can be
  bookmarked or shared, and survives refresh and back/forward.
- **Breadcrumbs and browser-tab titles name the record** on detail pages (e.g. `AR-2026-0067 · ASA`).
- **Empty results** offer a **Clear filters** button (keeps page size and sort).
- **Active filters show as chips** under the filter row, e.g. `Phase: Published ×`, with an
  "N active" count and **Clear all**. Click × to remove one filter.
- **Select boxes open on hover** (mouse); click, keyboard and touch work as usual.
- **Light / dark theme** from the profile menu, or follow the system setting.
- **Responsive**: phone, tablet and desktop. Secondary table columns hide on small screens.
- **Status is never colour-only**: badges have a dot + text, and charts have labels.
- Toast messages confirm saves. Forms show field errors inline, including errors from the server.

---

## 8. Mock backend and demo data

- `src/mocks/` holds an **MSW** mock that intercepts real HTTP calls in the browser. The app code is
  identical with or without it.
- Data is seeded (`src/mocks/db/seed.ts`, `demo-runs.ts`) and **saved in the browser's localStorage**,
  so your changes persist across reloads.
- **Reset demo data:** clear site data for `localhost` (DevTools → Application → Clear storage), then reload.
- The demo includes Veero Metals with 10 units, 19 vendors, 14 Acts, vendor and PE checklists,
  published July 2026 runs for every vendor–unit pair, May/June history for trends, runs in progress,
  and findings.
- Uploaded files are kept only for the current browser session.
- `src/mocks/handlers/*.ts` is an **executable specification** of the API the backend must provide.

---

## 9. Connecting the real backend

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_API_MOCKING=disabled
```

| Variable                   | Values                                          | Default                      |
| -------------------------- | ----------------------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the REST API, no trailing slash     | `/api` (works with the mock) |
| `NEXT_PUBLIC_API_MOCKING`  | `enabled` = mock backend, `disabled` = real API | `enabled`                    |

- Every endpoint the UI calls, with its error codes, is listed in **PROGRESS.md › Open Questions**.
- Request/response types: `src/types/`.
- Auth assumption: JWT access token in memory and a refresh token in an httpOnly cookie
  (`/auth/refresh`). If the backend differs, only `src/store/base-query.ts` needs changing.
- When the backend publishes Swagger/OpenAPI, endpoints can be generated with `@rtk-query/codegen-openapi`.

---

## 10. Tech stack

| Concern             | Choice                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Framework           | Next.js 16 (App Router) · React 19 (+ React Compiler) · TypeScript (strict)                |
| Server state / HTTP | Redux Toolkit + **RTK Query** (one `baseApi`, features inject endpoints, tag invalidation) |
| UI                  | shadcn/ui (Radix) · Tailwind CSS v4 · lucide-react icons · sonner toasts · next-themes     |
| Tables / forms      | TanStack Table · react-hook-form + zod                                                     |
| URL state           | nuqs                                                                                       |
| Charts / files      | Recharts · react-dropzone · ExcelJS                                                        |
| Mock API            | MSW                                                                                        |
| Quality             | ESLint (incl. import-boundary rules) · Prettier · Husky + lint-staged                      |
| Tests               | Vitest + Testing Library (Playwright planned for e2e)                                      |

---

## 11. Project structure and conventions

```
src/
├── app/                      # ROUTES ONLY: thin pages that compose features
│   ├── (auth)/               #   public: login, change-password (split-screen layout)
│   └── (dashboard)/          #   protected: sidebar + header shell, permission check per route
│       ├── overview/  audit-runs/[runId]  audit-runs/new  findings/[findingId]  reports/
│       ├── assignments/{vendor-units,vendor-checklists,pe-checklists}/
│       ├── masters/{states,acts,vendors,principal-employers/[peId],checklists/{vendor,pe}}/
│       └── admin/{users,audit-trail,retention}/
├── features/                 # BUSINESS MODULES, each: api/ components/ schemas/ hooks/ utils/ index.ts
│   ├── auth  dashboard  audit-runs  findings  reports  audit-trail
│   └── assignments  masters  users  notifications
├── components/
│   ├── ui/                   # shadcn primitives (generated; Select has hover-to-open)
│   ├── layout/               # sidebar, header, breadcrumbs, profile menu, brand
│   └── shared/               # DataTable kit, FilterBar/FilterSelect, PageHeader, KpiCard,
│                             # StatusBadge, dialogs, FileDropzone, EmptyState…
├── config/                   # env (zod-validated), navigation (single source for menu,
│                             # breadcrumbs, page icons and route guarding), site
├── lib/
│   ├── auth/                 # role → permission map, can(), useCan()
│   ├── domain/               # pure business rules + tests (score, dates, phases, review, retention)
│   ├── export/               # Excel builders
│   └── utils/                # cn(), formatters
├── store/                    # Redux store, baseApi, baseQuery (JWT + refresh), session slice
├── mocks/                    # MSW handlers + seeded DB (delete when the backend is live)
├── hooks/                    # generic hooks (URL table state, URL filters, current user…)
├── providers/                # Theme → MSW → Store → Tooltip + Toaster
└── types/                    # domain entities + API types
```

**Conventions**

1. Imports flow one way: `app → features → components / lib / types / store`. Features import each
   other **only through `index.ts`**, and shared layers never import features. ESLint enforces this.
2. Pages are thin; business rules live in `lib/domain` as tested pure functions.
3. Check permissions with `can()` / `useCan()`, never role names.
4. Files are kebab-case; components PascalCase; hooks `use-*`; suffixes `.api.ts`, `.schema.ts`, `.test.ts`.
5. Tests sit next to the code. Absolute imports use `@/`.
6. Colours are design tokens in `src/app/globals.css` (light + dark). Don't hard-code colours.

**Adding a new list page (typical recipe)**

1. Add the endpoint to a feature's `api/*.api.ts` (inject into `baseApi`) and a mock handler in `src/mocks/handlers/`.
2. Build the page with `useTableUrlState()` + `useUrlFilter()`, `<DataTableToolbar>` with `<FilterSelect>`s
   (filter chips appear automatically), `<DataTable>` and `<DataTablePagination>`.
3. Add a route in `src/app/(dashboard)/…/page.tsx` and a nav item in `src/config/navigation.ts`
   with its permission. The sidebar, breadcrumbs, page icon and route guard follow automatically.

---

## 12. Development workflow

| Command                                   | What it does                                                        |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                             | Dev server on http://localhost:3000                                 |
| `npm run build` / `npm start`             | Production build / serve it                                         |
| `npm test`                                | Unit + integration tests (Vitest), incl. a full audit workflow test |
| `npm run test:watch`                      | Tests in watch mode                                                 |
| `npm run lint` / `npm run lint:fix`       | ESLint                                                              |
| `npm run typecheck`                       | TypeScript check                                                    |
| `npm run format` / `npm run format:check` | Prettier                                                            |

- A **pre-commit hook** (Husky + lint-staged) runs ESLint and Prettier on staged files.
- Work on feature branches. `main` is the default branch.
- Record notable changes in **PROGRESS.md** (changelog and decisions).

---

## 13. Troubleshooting

| Problem                                          | Fix                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Data looks wrong or stale in the demo            | Clear site data for localhost and reload (resets the mock DB)                           |
| "Account locked" at login                        | 5 failed attempts. An admin can **Unlock** in Users & access, or reset the demo data    |
| Blank page / API errors after switching backends | Check `.env.local` and restart `npm run dev` (env changes need a restart)               |
| Next.js dev badge shows "1 Issue"                | Dev-only instant-navigation validation notice from Next 16, not an app error            |
| A page says "You don't have access to this page" | Your role lacks the permission for that route (see [§3](#3-roles-and-what-each-can-do)) |
