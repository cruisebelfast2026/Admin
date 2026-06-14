-- ============================================================================
-- Coordinator on-duty schedule (Build Brief Section 6.3)
-- Maps a date to the coordinator on duty; each rota's coordinator row is
-- auto-populated from this and remains manually overridable.
-- ============================================================================
create table if not exists public.coordinator_schedule (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  date date not null unique,
  staff_id uuid references public.staff (id) on delete set null,
  coordinator_initial text,
  created_at timestamptz not null default now()
);
create index if not exists coordinator_schedule_year_idx
  on public.coordinator_schedule (year);

alter table public.coordinator_schedule enable row level security;
drop policy if exists "authenticated_all" on public.coordinator_schedule;
create policy "authenticated_all" on public.coordinator_schedule
  for all to authenticated using (true) with check (true);
