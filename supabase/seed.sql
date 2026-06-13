-- ============================================================================
-- Rota Manager — Seed data
-- ============================================================================
-- Run after migrations. Admin auth accounts must be created via the Supabase
-- dashboard or `supabase auth` (see README); the handle_new_user trigger then
-- populates public.users automatically.
-- ============================================================================

-- Single settings row with all defaults (Section 14).
insert into public.settings (id)
select gen_random_uuid()
where not exists (select 1 from public.settings);

-- Email notification stub (inactive).
insert into public.email_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.email_settings);

-- Example staff (from the Arcadia sample rota, Section 20.1).
insert into public.staff (first_name, last_initial, is_ambassador, is_coordinator, is_travel_advisor, is_volunteer)
values
  ('Damien',   'M', true,  true,  false, false),
  ('Conor',    'B', false, true,  false, false),
  ('Christine','D', false, false, true,  false),
  ('Craig',    'H', false, false, true,  false),
  ('Patricia', 'B', true,  false, false, false),
  ('Claire',   'M', true,  false, false, false),
  ('Zoe',      'K', true,  false, false, false),
  ('Rod',      'S', true,  false, false, false),
  ('Linda',    'T', true,  false, false, false),
  ('Gillian',  'R', true,  false, false, false),
  ('Stephen',  'W', true,  false, false, false),
  ('John',     'E', false, false, false, true),
  ('Kathryn',  'L', false, false, false, true),
  ('Heather',  'P', false, false, false, true)
on conflict do nothing;
