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

/** "Time in port" format, e.g. "0730-1830". */
export function portRange(arrival: string | null, departure: string | null): string {
  const f = (t: string | null) => (t ? t.slice(0, 5).replace(":", "") : "");
  return `${f(arrival)}-${f(departure)}`;
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

/** Bus description, e.g. "X2 DD Buses". */
export function busLabel(b: RotaShuttleLike): string {
  const kind = b.bus_type === "double_decker" ? "DD" : "Single";
  return `X${b.bus_count} ${kind} Buses`;
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

/** One grid line of the rota: 4 columns (label, name, time, position). */
export interface RotaLine {
  label: string;
  name: string;
  time: string;
  pos: string;
}

const BLANK: RotaLine = { label: "", name: "", time: "", pos: "" };

/**
 * Build the shared line model used by BOTH the PDF and Excel outputs so they
 * are identical and match the established CWA rota sheet layout.
 */
export function buildRotaLines(data: RotaOutputData): RotaLine[] {
  const { ship, shifts, shuttles } = data;
  const lines: RotaLine[] = [];
  const blank = (n = 1) => {
    for (let i = 0; i < n; i++) lines.push({ ...BLANK });
  };
  const get = (role: RotaShiftLike["role_type"]) =>
    shifts
      .filter((s) => s.role_type === role)
      .sort((a, b) => a.shift_number - b.shift_number);

  // Header block.
  blank();
  lines.push({ label: "DATE", name: dateLine(ship.date), time: "", pos: "" });
  blank();
  lines.push({ label: "SHIP", name: ship.ship_name, time: "", pos: "" });
  blank();
  lines.push({ label: "DOCK", name: ship.dock ?? "", time: "", pos: "" });
  blank();
  lines.push({ label: "TIME IN PORT", name: portRange(ship.arrival_time, ship.departure_time), time: "", pos: "" });
  blank();
  lines.push({ label: "", name: "NAME", time: "TIME", pos: "POSITION" });
  blank();

  // People sections (3 blank rows between; 2 before the buses block).
  const people: RotaShiftLike["role_type"][] = ["coordinator", "travel_advisor", "ambassador"];
  for (const role of people) {
    const members = get(role);
    if (members.length === 0) {
      lines.push({ label: SECTION_TITLES[role], name: "", time: "", pos: "" });
    } else {
      members.forEach((s, i) => {
        lines.push({
          label: i === 0 ? SECTION_TITLES[role] : "",
          name: data.staffName(s.assigned_staff_id),
          time: dotRange(s.start_time, s.end_time),
          pos: s.location ?? "",
        });
      });
    }
    blank(3);
  }
  // Volunteers (start time only).
  const vols = get("volunteer");
  if (vols.length === 0) {
    lines.push({ label: SECTION_TITLES.volunteer, name: "", time: "", pos: "" });
  } else {
    vols.forEach((s, i) => {
      lines.push({
        label: i === 0 ? SECTION_TITLES.volunteer : "",
        name: data.staffName(s.assigned_staff_id),
        time: dot(s.start_time),
        pos: s.location ?? "",
      });
    });
  }
  blank(2);

  // Buses / shuttles.
  lines.push({ label: "", name: "BUSES", time: "TIMES", pos: "FREQUENCY" });
  if (shuttles.length === 0) {
    lines.push({ label: "SHUTTLES", name: "", time: "", pos: "" });
  } else {
    shuttles.forEach((b, i) => {
      lines.push({
        label: i === 0 ? "SHUTTLES" : "",
        name: busLabel(b),
        time: `1st Bus ${dot(b.first_from_dock)}`,
        pos: b.frequency_minutes ? `Every ${b.frequency_minutes}minutes` : "",
      });
      lines.push({ label: "", name: "", time: `Last Bus ${dot(b.last_from_city)}`, pos: "" });
    });
  }
  blank();

  // Footer.
  lines.push({ label: "PAYMENT", name: data.payment || "TBC", time: "", pos: "" });
  blank();
  lines.push({ label: "CAPACITY", name: ship.capacity != null ? String(ship.capacity) : "", time: "", pos: "" });
  blank();
  lines.push({ label: "VBWC", name: data.vbwcHours || "", time: "", pos: "" });

  return lines;
}
