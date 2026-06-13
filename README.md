# Rota Manager — Visit Belfast CWA

Private, password-protected web app for Visit Belfast's **Cruise Welcome
Ambassador (CWA)** team. It replaces spreadsheet-based rostering with a
structured system for cruise ship schedules, staff availability, shift
assignment and rota generation across the June–October cruise season.

> Internal standalone tool — not on the visitbelfast.com domain. Uses the
> Visit Belfast brand palette (navy `#003865`, teal `#00A499`) as inspiration.

## Stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Frontend | Next.js (App Router) · React 19 · TypeScript      |
| Styling  | Tailwind CSS v4 · Montserrat (headings) / Arial   |
| Backend  | Supabase (PostgreSQL + Auth + Storage)            |
| Hosting  | Cloudflare (Pages/Workers via OpenNext)           |

## Build status (against the build brief)

**All six phases implemented.** See `CHANGELOG.md` for the per-phase log.

- **Phase 1 — Foundation:** auth, app shell, Staff Setup, Settings, schema + RLS.
- **Phase 2 — Schedule upload & rosters:** Excel/CSV auto-parse (tolerant column
  matching), editable ship rows, season numbering, status badges.
- **Phase 3 — Individual rota:** shuttle section, ambassador auto-calculation,
  shift splitting, TA auto-generation, coordinator/volunteer rows, 15-min selects.
- **Phase 4 — Availability & assignment:** availability upload, Assigned master
  grid (yellow/green cells, conflict flags, per-column stats), filtered dropdowns.
- **Phase 5 — Volunteers, ship requests & output:** volunteer grid, ship-request
  records, PDF (`@react-pdf/renderer`) and Excel (SheetJS) downloads with the CWA
  filename convention.
- **Phase 6 — Polish:** Assigned status columns, email stub, responsive passes,
  Vitest suite (calc engine + parsers).

### Verified

```bash
npm run lint    # clean
npm run build   # passes
npm run test    # 21 passing (rota-calc, parse-schedule, parse-availability)
```

> The pure calculation/parsing logic is unit-tested. End-to-end persistence
> needs a live Supabase project (the app runs in demo mode without one).

### Known follow-ups

- PDF table extraction on upload is flagged for manual entry (use Excel/CSV).

Resolved in 0.7.0: season-wide ship numbering (server-side), Storage-backed
shuttle-signage upload/download, persisted email settings, and PDF/Excel output
matching the supplied CWA sample sheet. Resolved in 0.9.0: integration-audit
write-path fixes and Supabase Realtime live two-way sync.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Without Supabase env vars the app runs in **demo mode**: pages render and Staff
Setup works against local state, but nothing is persisted.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema:
   ```bash
   # via the Supabase CLI
   supabase db push
   # or paste supabase/migrations/0001_initial_schema.sql into the SQL editor
   ```
3. Seed defaults and example staff: run `supabase/seed.sql`.
4. Migration `0004` creates a private Storage bucket named `signage` for the
   shuttle-signage PDFs (also creatable via **Storage** in the dashboard).
5. Create the 3 named admin accounts under **Authentication → Users**
   (set a `full_name` in user metadata for the change-log display name).
6. Copy the project URL and anon key into `.env.local`.

## Deployment (Cloudflare)

The app deploys to **Cloudflare Workers** via the
[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare). Config lives
in `wrangler.jsonc` and `open-next.config.ts`.

> `NEXT_PUBLIC_*` vars are inlined into the bundle **at build time**, so they
> must be present when the build runs (not as runtime-only secrets).

### Option A — deploy from your machine

```bash
# 1. Put the two Supabase vars in .env.local (read at build time)
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=...

npx wrangler login   # once
npm run deploy       # builds with OpenNext and deploys the Worker
npm run preview      # optional: build + run the Worker locally first
```

### Option B — deploy from GitHub (recommended)

1. Cloudflare dashboard → **Workers & Pages → Create → Workers → Import a
   repository** → pick `cruisebelfast2026/admin`.
2. Build command `npm run deploy`, or let Workers Builds use the repo config.
3. Under the Worker's **Settings → Variables and Secrets**, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and add them
   as **build** variables too, since they're inlined at build time).
4. Every push to `main` then builds and deploys automatically.

### Connect your custom domain

Since the domain is already in this Cloudflare account:

1. Open the deployed Worker → **Settings → Domains & Routes → Add → Custom
   domain**.
2. Enter the hostname (e.g. `rota.yourdomain.com`) and save — Cloudflare creates
   the DNS record and provisions TLS automatically (usually a minute or two).
3. Add that final URL to Supabase **Authentication → URL Configuration → Site
   URL / Redirect URLs** so logins resolve correctly.

## Project structure

```
src/
  app/
    login/                 Login screen (unauthenticated)
    (app)/                 Authenticated app (sidebar shell)
      dashboard/           Summary & planning overview
      staff/               Staff Setup (CRUD)
      settings/            All configurable defaults
      change-log/          Admin activity + code/deployment log
      ship-requests/       Season-wide ship requests entry point
      rosters/[month]/     Monthly roster with 6 sub-tabs
  components/              Sidebar, year selector, badges, headers
  lib/                     Supabase clients, constants, types, change log
supabase/
  migrations/              Schema (Section 17) + RLS
  seed.sql                 Defaults + example staff
```
