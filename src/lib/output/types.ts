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

/** Body time format used on the CWA rota, e.g. "08.30". */
export function dot(t: string | null): string {
  return t ? t.slice(0, 5).replace(":", ".") : "";
}

/** Time range in dot format with a hyphen, e.g. "07.30-12.30". */
export function dotRange(start: string | null, end: string | null): string {
  if (!start) return "";
  return end ? `${dot(start)}-${dot(end)}` : dot(start);
}

/** "Time in port" format, e.g. "0800 - 1730". */
export function portRange(arrival: string | null, departure: string | null): string {
  const f = (t: string | null) => (t ? t.slice(0, 5).replace(":", "") : "");
  return `${f(arrival)} - ${f(departure)}`;
}

/** Date line without year, e.g. "Sunday 14th June". */
export function dateLine(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  const ord = day + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${ord} ${d.toLocaleDateString("en-GB", { month: "long" })}`;
}

/** Bus description, e.g. "x3 DD Buses". */
export function busLabel(b: RotaShuttleLike): string {
  const kind = b.bus_type === "double_decker" ? "DD" : "Single";
  return `x${b.bus_count} ${kind} Buses`;
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
