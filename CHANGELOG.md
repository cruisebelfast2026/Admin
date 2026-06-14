# Changelog

All notable code and deployment changes to Rota Manager are recorded here.
This file is displayed read-only in the **Change Log → Code / Deployment Log**
tab of the application.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.12.0] — 2026-06-14 — Full-audit fixes & deployment

### Added
- **GitHub Actions deploy workflow** (`.github/workflows/deploy.yml`) — builds
  with OpenNext and deploys to Cloudflare on push to `main` (fixes the "hello
  world" placeholder: the real app now deploys to the `rota-manager` Worker).
- **Role override** in rota assignment dropdowns (§6.2/§16.2) — assign a TA to
  an Ambassador slot via a per-row "override" toggle.
- **VBWC opening hours default** from Settings per weekday on new rotas (§9.1).
- **Assigned-tab row expansion** to per-shift assignment dropdowns (§10.4).
- **Rosters-row Download PDF / XLS** buttons (§8.1).
- **Season year selector now works** — the choice is stored in a cookie and
  scopes Dashboard/roster queries by year (previously inert).

### Fixed
- `updateShip` and Ship Requests sanitise empty time strings / `NaN` integers
  before writing (ship edits and `ambassador_count` could fail the update).
- Corrected the misleading `NEXT_PUBLIC_*` note in `wrangler.jsonc` (build-time,
  not runtime secrets).

## [0.11.0] — 2026-06-14 — Remaining brief rules

### Added
- **Coordinator Schedule Upload** (§6.3): upload date → coordinator-initial
  sheet in Staff Setup (migration `0007` adds `coordinator_schedule`); each
  rota's Coordinator row auto-populates from it and stays overridable.
- **Same-rota overlap hard block** (§16.2): a person can't be assigned to two
  overlapping shifts on the same rota.
- **"Assigned elsewhere" warning flags** (§9.4.5): rota assignment dropdowns
  mark staff already assigned on another ship the same day/period (amber).
- **Low Staffing Estimate** (§10.6): the Assigned grid flags ships whose
  available staff may be insufficient to cover required ambassador/TA shifts.
- **Expand rota to full screen** (§8.3): the rota side panel has an
  Expand/Collapse toggle.
- Tests for time-overlap and coordinator-initial resolution (42 total).

## [0.10.0] — 2026-06-13 — PDF upload parsing

### Added
- **PDF schedule & availability upload now auto-parses.** Uses PDF.js to read
  positioned text and reconstructs table rows (grouped by y) and columns (split
  by x gaps), then feeds the existing schedule/availability parsers. Scanned /
  image-only PDFs (no extractable text) are still flagged for manual entry, and
  extracted schedule rows show the usual ⚠ review flags before import.
- Unit tests for the row/column reconstruction and header mapping.

## [0.9.0] — 2026-06-13 — Integration audit fixes & live sync

### Fixed
- **Availability import no longer fails on AM+EV / AM+PM+EV cells**: the
  `availability.period` CHECK constraint now accepts every valid combination
  (migration `0005`), and the type/tests cover it.
- **Empty time/date strings are coerced to null before writing** to Postgres
  `time`/`date` columns across Ship Requests, the Rota panel (shifts &
  shuttles) and Settings — previously a cleared field aborted the save.
- **`NaN` no longer written to integer columns** (bus count / frequency).
- **Assigned, Volunteer and Rota tabs now re-sync** after a save via a shared
  sync signal, so assignments/confirmations no longer go stale between tabs.
- Settings page uses `maybeSingle()` so a fresh DB (no settings row) doesn't
  throw; Ship Requests upsert strips server-managed columns.

### Added
- **Supabase Realtime** subscription per month (migration `0006` adds `shifts`,
  `availability`, `ships` to the `supabase_realtime` publication) — live
  two-way sync of shifts/availability/ship changes across open clients.

## [0.8.0] — 2026-06-13 — Cloudflare deployment

### Added
- Cloudflare Workers deployment via the OpenNext adapter: `wrangler.jsonc`,
  `open-next.config.ts`, the dev hook in `next.config.ts`, and `deploy` /
  `preview` / `cf-typegen` npm scripts. The OpenNext build is verified against
  Next.js 16.
- README deployment guide (local + GitHub-connected) and custom-domain steps.

### Changed
- ESLint and git ignore the generated `.open-next/` and `.wrangler/` output.

## [0.7.0] — 2026-06-13 — Follow-ups

### Added
- **Season-wide ship numbering**: `resequence_season_numbers(year)` SQL function
  (migration `0003`) numbers ships sequentially across the whole season by date;
  called after import/add/delete/date-change with a month refetch.
- **Shuttle signage PDFs**: Supabase Storage bucket + policy (migration `0004`),
  per-cruise-line upload in Settings, and a Signage download button on the rota
  that matches the ship's cruise line.
- **Email settings** persistence: the notification stub now loads/saves provider,
  from address, API key and triggers to `email_settings` (still inactive).
- SessionStart hook (`.claude/hooks/session-start.sh`) to install dependencies
  in Claude Code on the web sessions.

### Changed
- **Rota output (PDF & Excel) reworked to match the supplied CWA sample sheet**:
  DATE / SHIP / DOCK / TIME IN PORT block, NAME / TIME / POSITION columns,
  dot-format times (`07.30-12.30`), time-in-port as `0800 - 1730`, volunteers
  showing start time only, the BUSES / TIMES / FREQUENCY shuttle block
  (`x3 DD Buses`, `1st Bus …` / `Last Bus …`, `Every 20minutes`), and the
  PAYMENT / CAPACITY / VBWC footer. The Excel worksheet tab is now named after
  the file (e.g. `16_CWA_Rota_AMBITION_14th_June_2026`).

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
