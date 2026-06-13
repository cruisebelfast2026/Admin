# Changelog

All notable code and deployment changes to Rota Manager are recorded here.
This file is displayed read-only in the **Change Log → Code / Deployment Log**
tab of the application.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.6.0] — 2026-06-13 — Phase 6: Change Log, polish & email stub

### Added
- Per-ship Assigned-tab status columns (`info_received`, `rota_sent`,
  `volunteers_sent`, `confirmed`) via migration `0002`.
- Email-notification stub surfaced in Settings (inactive, wired for future use).
- Responsive passes: collapsing sidebar, horizontally scrollable grids, frozen
  Date/Ship columns, 15-minute increment time selects throughout.
- Vitest suite covering the calculation engine and the schedule/availability
  parsers (21 tests).

## [0.5.0] — 2026-06-13 — Phase 5: Volunteer tab, Ship Requests & rota output

### Added
- **Volunteer Shifts** tab: monthly grid with up to 3 volunteer dropdowns per
  ship, start time sourced from the first ambassador shift, synced to shifts.
- **Ship Requests** tab: per-ship standalone record, independently editable.
- **PDF output** (`@react-pdf/renderer`) matching the Arcadia sample layout, and
  **Excel output** (SheetJS) mirroring the same sections.
- CWA filename convention, e.g. `08_CWA_Rota_ARCADIA_7th_June_2026`.

## [0.4.0] — 2026-06-13 — Phase 4: Availability, Assigned grid & assignment

### Added
- **Staff Availability Upload**: Excel/CSV parsing of the AM/PM/EV grid,
  matched to staff by display name and to ships by date; full-month replace.
- **Assigned** master grid: ships × staff, frozen Date/Ship columns, yellow
  (assigned) / green (confirmed, click to toggle) cells, amber cross-ship
  same-day conflict flags, and per-column assigned/available stats.
- Assignment dropdowns filtered by availability period and role.

## [0.3.0] — 2026-06-13 — Phase 3: Individual rota & shift generation

### Added
- Individual rota side panel: header fields, coordinator row, multi-row
  shuttle/bus section, volunteers, and editable 15-minute time selects.
- Ambassador auto-calculation from shuttle times, shift-splitting (1/2/3 shifts
  by duration), TA auto-generation (arrival + 30 min, 4h, capacity threshold).
- VBWC opening hours from Settings (per-rota override), and a warning when
  shuttle times change after shifts are generated (no auto-recalculation).

## [0.2.0] — 2026-06-13 — Phase 2: Schedule upload & monthly roster

### Added
- **Schedule Upload**: Excel/CSV auto-parse with tolerant column matching,
  preview with per-row warning flags, and full-month replace on import.
- Editable **Rosters** table: inline edit/save, manual add, delete with
  confirmation, season-wide ship numbering, and rota status badges.
- Dashboard wired to live ship data.

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
