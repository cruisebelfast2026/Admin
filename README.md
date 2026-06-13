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

**Phase 1 — Foundation: implemented.**

- Auth (Supabase email + password), SSR session handling, route guard.
- App shell: sidebar, season year selector, June–October navigation, month tabs.
- Staff Setup (full CRUD, roles, display-name auto-gen, volunteer list).
- Settings (all Section 14 defaults) + email/signage stubs.
- Dashboard panels and Change Log (admin activity + code/deployment tabs).
- Full database schema + RLS (Section 17).

Phases 2–6 (schedule upload, individual rota generation & auto-calculation,
availability/assignment grid, volunteer & ship-request tabs, PDF/Excel output,
change-log polish) are scaffolded with navigable placeholders describing the
work, and tracked in `CHANGELOG.md`.

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
4. Create the 3 named admin accounts under **Authentication → Users**
   (set a `full_name` in user metadata for the change-log display name).
5. Copy the project URL and anon key into `.env.local`.

## Deployment (Cloudflare)

Deploy with [OpenNext for Cloudflare](https://opennext.js.org/cloudflare):

```bash
npm run deploy   # builds with @opennextjs/cloudflare and deploys via Wrangler
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
environment variables / secrets in the Cloudflare dashboard or `wrangler.toml`.

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
