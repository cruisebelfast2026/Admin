-- ============================================================================
-- Rota Manager — Initial schema (Build Brief Section 17)
-- Visit Belfast Cruise Welcome Ambassador rostering system
-- ============================================================================
-- All tables use UUID primary keys and created_at / updated_at timestamps.
-- RLS is enabled on every table: only authenticated users may read/write.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users (extends auth.users) — 3 named admin accounts
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Auto-create a public.users row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- ships
-- ---------------------------------------------------------------------------
create table if not exists public.ships (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null check (month between 1 and 12),
  season_number integer,
  date date not null,
  arrival_time time,
  departure_time time,
  dock text,
  cruise_line text,
  ship_name text not null,
  capacity integer,
  rota_status text not null default 'draft_no_info'
    check (rota_status in (
      'draft_no_info', 'draft_requirements',
      'complete_not_sent', 'complete_sent', 'complete_confirmed'
    )),
  vbwc_opening_hours text,
  payment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ships_year_month_idx on public.ships (year, month);
create trigger ships_updated_at before update on public.ships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- staff
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_initial char(1) not null,
  display_name text generated always as (first_name || ' ' || last_initial) stored,
  is_ambassador boolean not null default false,
  is_coordinator boolean not null default false,
  is_travel_advisor boolean not null default false,
  is_volunteer boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- availability (per staff, per ship, per period — replaced on re-upload)
-- ---------------------------------------------------------------------------
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  ship_id uuid not null references public.ships (id) on delete cascade,
  period text not null check (period in ('AM', 'PM', 'EV', 'AM+PM', 'PM+EV')),
  uploaded_at timestamptz not null default now(),
  unique (staff_id, ship_id)
);
create index if not exists availability_ship_idx on public.availability (ship_id);

-- ---------------------------------------------------------------------------
-- shifts
-- ---------------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  ship_id uuid not null references public.ships (id) on delete cascade,
  role_type text not null
    check (role_type in ('coordinator', 'travel_advisor', 'ambassador', 'volunteer')),
  shift_number integer not null default 1,
  start_time time,
  end_time time,
  location text,
  assigned_staff_id uuid references public.staff (id) on delete set null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shifts_ship_idx on public.shifts (ship_id);
create trigger shifts_updated_at before update on public.shifts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shuttles
-- ---------------------------------------------------------------------------
create table if not exists public.shuttles (
  id uuid primary key default gen_random_uuid(),
  ship_id uuid not null references public.ships (id) on delete cascade,
  bus_type text check (bus_type in ('double_decker', 'single')),
  bus_count integer,
  first_from_dock time,
  last_from_city time,
  frequency_minutes integer,
  sort_order integer not null default 0
);
create index if not exists shuttles_ship_idx on public.shuttles (ship_id);

-- ---------------------------------------------------------------------------
-- ship_requests (standalone record — independent of the operational rota)
-- ---------------------------------------------------------------------------
create table if not exists public.ship_requests (
  id uuid primary key default gen_random_uuid(),
  ship_id uuid not null references public.ships (id) on delete cascade,
  ambassador_count integer,
  requested_start_time time,
  requested_end_time time,
  requested_locations text,
  shuttle_times_requested text,
  agent_name text,
  company text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (ship_id)
);
create trigger ship_requests_updated_at before update on public.ship_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- change_log (admin activity)
-- ---------------------------------------------------------------------------
create table if not exists public.change_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  admin_name text not null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists change_log_created_idx on public.change_log (created_at desc);
create index if not exists change_log_action_idx on public.change_log (action_type);

-- ---------------------------------------------------------------------------
-- settings (single row — use upsert)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  ambassador_dock_offset_mins integer not null default -15,
  ambassador_vbwc_offset_mins integer not null default 15,
  ambassador_finish_dock_offset_mins integer not null default 15,
  ta_start_offset_mins integer not null default 30,
  ta_duration_hours integer not null default 4,
  shift_split_threshold_hours integer not null default 4,
  shift_3way_threshold_hours integer not null default 10,
  ta_capacity_threshold integer not null default 1200,
  am_start time not null default '07:00',
  am_end time not null default '13:00',
  pm_start time not null default '12:00',
  pm_end time not null default '17:30',
  ev_start time not null default '16:00',
  ev_end time not null default '21:00',
  vbwc_hours_mon text,
  vbwc_hours_tue text,
  vbwc_hours_wed text,
  vbwc_hours_thu text,
  vbwc_hours_fri text,
  vbwc_hours_sat text,
  vbwc_hours_sun text,
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shuttle_signage (one PDF per cruise line — Settings 14.6)
-- Files live in Supabase Storage; this table records the mapping.
-- ---------------------------------------------------------------------------
create table if not exists public.shuttle_signage (
  id uuid primary key default gen_random_uuid(),
  cruise_line text not null unique,
  storage_path text not null,
  file_name text,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- email_settings (stub — Section 14.7, inactive)
-- ---------------------------------------------------------------------------
create table if not exists public.email_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  provider text default 'resend',
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  api_key text,
  from_address text,
  notify_on_rota_sent boolean not null default true,
  notify_on_shift_confirmed boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger email_settings_updated_at before update on public.email_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security — authenticated users have full access (3 trusted admins)
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'users','ships','staff','availability','shifts','shuttles',
    'ship_requests','change_log','settings','shuttle_signage','email_settings'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end$$;
