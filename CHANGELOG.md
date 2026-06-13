# Changelog

All notable code and deployment changes to Rota Manager are recorded here.
This file is displayed read-only in the **Change Log → Code / Deployment Log**
tab of the application.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] — 2026-06-13 — Phase 1: Foundation

### Added
- Next.js (App Router) + TypeScript + Tailwind CSS v4 project scaffold.
- Visit Belfast brand theme (navy `#003865`, teal `#00A499`, Montserrat headings).
- Supabase schema migration covering all tables from the build brief Section 17
  (`users`, `ships`, `staff`, `availability`, `shifts`, `shuttles`,
  `ship_requests`, `change_log`, `settings`, `shuttle_signage`, `email_settings`)
  with Row Level Security restricting access to authenticated users.
- Supabase Auth (email + password) with SSR session handling and route guard
  middleware. Branded login screen.
- App shell: fixed left sidebar, season year selector, June–October month
  navigation, and monthly roster sub-tabs.
- **Staff Setup**: add / edit / deactivate staff, multi-role checkboxes,
  auto-generated display name, and a separate name-only volunteer list.
- **Settings**: all configurable defaults (time offsets, availability period
  definitions, capacity threshold, VBWC opening hours, locations) plus the
  shuttle-signage and inactive email-notification stubs.
- **Dashboard**: today's ships, upcoming ships, staffing gaps, season overview,
  and quick links.
- **Change Log**: admin activity log (Supabase-backed) and this code/deployment
  log tab.
- Navigable scaffolding for the monthly roster tabs delivered in later phases.

### Notes
- Phases 2–6 (schedule upload, individual rota generation, availability &
  assignment grid, volunteer/ship-request tabs, PDF/Excel output, full change
  log polish) are scaffolded and tracked against the build brief.
