-- ============================================================================
-- Enable Supabase Realtime for the tables that drive live two-way sync
-- (Rota ↔ Assigned ↔ Volunteer Shifts). Idempotent.
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array['shifts', 'availability', 'ships'];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end$$;
