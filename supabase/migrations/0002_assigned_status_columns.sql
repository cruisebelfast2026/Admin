-- ============================================================================
-- Assigned-tab per-ship status toggles (Build Brief Section 10.2)
-- ============================================================================
alter table public.ships
  add column if not exists info_received boolean not null default false,
  add column if not exists rota_sent boolean not null default false,
  add column if not exists volunteers_sent boolean not null default false,
  add column if not exists confirmed boolean not null default false;
