/**
 * Time helpers. All times are "HH:MM" 24-hour strings in 15-minute increments.
 */

export function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function toTime(mins: number): string {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(t: string, delta: number): string {
  const base = toMinutes(t);
  if (base == null) return t;
  return toTime(base + delta);
}

/** Round a minute value to the nearest 15-minute increment. */
export function roundTo15(mins: number): number {
  return Math.round(mins / 15) * 15;
}

/** Generate "HH:MM" options at 15-minute increments for select dropdowns. */
export function quarterHourOptions(
  from = "00:00",
  to = "23:45",
): string[] {
  const start = toMinutes(from) ?? 0;
  const end = toMinutes(to) ?? 1425;
  const out: string[] = [];
  for (let m = start; m <= end; m += 15) out.push(toTime(m));
  return out;
}

export function durationHours(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return 0;
  return (e - s) / 60;
}
