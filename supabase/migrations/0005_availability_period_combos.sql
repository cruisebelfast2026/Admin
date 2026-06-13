-- ============================================================================
-- Broaden availability.period to accept every valid AM/PM/EV combination.
-- The availability sheet can legitimately mark e.g. AM+EV (skip midday) or all
-- three; the original constraint only allowed AM/PM/EV/AM+PM/PM+EV which caused
-- a whole-month import to fail on an odd cell.
-- ============================================================================
alter table public.availability drop constraint if exists availability_period_check;
alter table public.availability
  add constraint availability_period_check
  check (period in ('AM', 'PM', 'EV', 'AM+PM', 'AM+EV', 'PM+EV', 'AM+PM+EV'));
