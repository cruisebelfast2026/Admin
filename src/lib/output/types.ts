import type { Ship } from "../types";

export interface RotaShiftLike {
  role_type: "coordinator" | "travel_advisor" | "ambassador" | "volunteer";
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  assigned_staff_id: string | null;
}

export interface RotaShuttleLike {
  bus_type: "double_decker" | "single";
  bus_count: number;
  first_from_dock: string | null;
  last_from_city: string | null;
  frequency_minutes: number | null;
}

export interface RotaOutputData {
  ship: Ship;
  shifts: RotaShiftLike[];
  shuttles: RotaShuttleLike[];
  vbwcHours: string;
  payment: string;
  staffName: (id: string | null) => string;
}

export function longDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function hhmm(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

export const SECTION_ORDER: RotaShiftLike["role_type"][] = [
  "coordinator",
  "travel_advisor",
  "ambassador",
  "volunteer",
];

export const SECTION_TITLES: Record<RotaShiftLike["role_type"], string> = {
  coordinator: "COORDINATOR",
  travel_advisor: "TRAVEL ADVISORS",
  ambassador: "AMBASSADORS",
  volunteer: "VOLUNTEERS",
};
