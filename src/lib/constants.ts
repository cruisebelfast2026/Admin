/**
 * Shared domain constants for Rota Manager.
 * The cruise season runs June–October.
 */

export const SEASON_MONTHS = [
  { value: 6, name: "June", short: "Jun" },
  { value: 7, name: "July", short: "Jul" },
  { value: 8, name: "August", short: "Aug" },
  { value: 9, name: "September", short: "Sep" },
  { value: 10, name: "October", short: "Oct" },
] as const;

/** Cookie that stores the selected season year (read by server pages). */
export const SEASON_YEAR_COOKIE = "rota_year";

export const DOCKS = ["D1", "Gotto", "Bangor", "Albert"] as const;
export const LOCATIONS = ["D1", "Gotto", "Bangor", "Albert", "VBWC"] as const;

export type RotaStatus =
  | "draft_no_info"
  | "draft_requirements"
  | "complete_not_sent"
  | "complete_sent"
  | "complete_confirmed";

export const ROTA_STATUSES: Record<
  RotaStatus,
  { label: string; colorVar: string; setBy: "system" | "admin"; emoji: string }
> = {
  draft_no_info: {
    label: "Draft / No Information",
    colorVar: "var(--status-red)",
    setBy: "system",
    emoji: "🔴",
  },
  draft_requirements: {
    label: "Draft / Requirements Inputted",
    colorVar: "var(--status-yellow)",
    setBy: "system",
    emoji: "🟡",
  },
  complete_not_sent: {
    label: "Complete / Not Sent",
    colorVar: "var(--status-orange)",
    setBy: "admin",
    emoji: "🟠",
  },
  complete_sent: {
    label: "Complete / Sent",
    colorVar: "var(--status-blue)",
    setBy: "admin",
    emoji: "🔵",
  },
  complete_confirmed: {
    label: "Complete / Confirmed",
    colorVar: "var(--status-green)",
    setBy: "admin",
    emoji: "🟢",
  },
};

export type AvailabilityPeriod =
  | "AM"
  | "PM"
  | "EV"
  | "AM+PM"
  | "AM+EV"
  | "PM+EV"
  | "AM+PM+EV";

export const ROLE_TYPES = [
  "coordinator",
  "travel_advisor",
  "ambassador",
  "volunteer",
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const TABS = [
  { slug: "rosters", label: "Rosters" },
  { slug: "assigned", label: "Assigned" },
  { slug: "availability", label: "Staff Availability Upload" },
  { slug: "ship-requests", label: "Ship Requests" },
  { slug: "schedule", label: "Schedule Upload" },
  { slug: "volunteers", label: "Volunteer Shifts" },
] as const;

/** Default settings, mirrored in the Supabase `settings` table seed. */
export const DEFAULT_SETTINGS = {
  ambassador_dock_offset_mins: -15,
  ambassador_vbwc_offset_mins: 15,
  ambassador_finish_dock_offset_mins: 15,
  ta_start_offset_mins: 30,
  ta_duration_hours: 4,
  shift_split_threshold_hours: 4,
  shift_3way_threshold_hours: 10,
  ta_capacity_threshold: 1200,
  am_start: "07:00",
  am_end: "13:00",
  pm_start: "12:00",
  pm_end: "17:30",
  ev_start: "16:00",
  ev_end: "21:00",
} as const;
