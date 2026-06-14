/**
 * Database row types mirroring the Supabase schema (Section 17 of the brief).
 * Kept hand-written so the app builds without generated types; regenerate with
 * `supabase gen types typescript` once a project is linked if preferred.
 */

import type { AvailabilityPeriod, RoleType, RotaStatus } from "./constants";

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface Ship {
  id: string;
  year: number;
  month: number;
  season_number: number;
  date: string; // ISO date
  arrival_time: string | null;
  departure_time: string | null;
  dock: string | null;
  cruise_line: string | null;
  ship_name: string;
  capacity: number | null;
  rota_status: RotaStatus;
  vbwc_opening_hours: string | null;
  payment_notes: string | null;
  info_received: boolean;
  rota_sent: boolean;
  volunteers_sent: boolean;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  first_name: string;
  last_initial: string;
  display_name: string;
  is_ambassador: boolean;
  is_coordinator: boolean;
  is_travel_advisor: boolean;
  is_volunteer: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  staff_id: string;
  ship_id: string;
  period: AvailabilityPeriod;
  uploaded_at: string;
}

export interface Shift {
  id: string;
  ship_id: string;
  role_type: RoleType;
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  assigned_staff_id: string | null;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shuttle {
  id: string;
  ship_id: string;
  bus_type: "double_decker" | "single";
  bus_count: number;
  first_from_dock: string | null;
  last_from_city: string | null;
  frequency_minutes: number | null;
  sort_order: number;
}

export interface ShipRequest {
  id: string;
  ship_id: string;
  ambassador_count: number | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  requested_locations: string | null;
  shuttle_times_requested: string | null;
  agent_name: string | null;
  company: string | null;
  notes: string | null;
  updated_at: string;
}

export interface ChangeLogEntry {
  id: string;
  user_id: string | null;
  admin_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

export interface CoordinatorSchedule {
  id: string;
  year: number;
  date: string;
  staff_id: string | null;
  coordinator_initial: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  ambassador_dock_offset_mins: number;
  ambassador_vbwc_offset_mins: number;
  ambassador_finish_dock_offset_mins: number;
  ta_start_offset_mins: number;
  ta_duration_hours: number;
  shift_split_threshold_hours: number;
  shift_3way_threshold_hours: number;
  ta_capacity_threshold: number;
  am_start: string;
  am_end: string;
  pm_start: string;
  pm_end: string;
  ev_start: string;
  ev_end: string;
  vbwc_hours_mon: string | null;
  vbwc_hours_tue: string | null;
  vbwc_hours_wed: string | null;
  vbwc_hours_thu: string | null;
  vbwc_hours_fri: string | null;
  vbwc_hours_sat: string | null;
  vbwc_hours_sun: string | null;
  updated_at: string;
}
