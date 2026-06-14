/**
 * Coordinator schedule parsing (Build Brief Section 6.3).
 * A sheet with a date column and a coordinator-initial column (e.g. 'D' =
 * Damien, 'C' = Conor). Initials resolve to staff by the first letter of the
 * coordinator's first name.
 */
import { parseDate } from "./parse-schedule";

export interface CoordinatorScheduleRow {
  date: string; // ISO
  initial: string;
}

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

/** Parse row objects into { date, initial } entries (tolerant header names). */
export function parseCoordinatorRows(
  rows: Record<string, unknown>[],
): CoordinatorScheduleRow[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const dateKey =
    headers.find((h) => /date/i.test(h)) ?? headers[0];
  const initialKey =
    headers.find((h) => /coord|initial|on.?duty|name/i.test(h)) ??
    headers[1] ??
    headers[0];

  const out: CoordinatorScheduleRow[] = [];
  for (const row of rows) {
    const date = parseDate(row[dateKey]);
    const initial = norm(row[initialKey]);
    if (date && initial) out.push({ date, initial });
  }
  return out;
}

/**
 * Resolve a coordinator initial to a staff id among the coordinators.
 * Matches the first letter of first_name (case-insensitive); falls back to a
 * unique display-name/first-name match.
 */
export function resolveCoordinator(
  initial: string,
  coordinators: { id: string; first_name: string; display_name: string }[],
): string | null {
  const i = initial.trim().toLowerCase();
  if (!i) return null;
  const byInitial = coordinators.filter(
    (c) => c.first_name[0]?.toLowerCase() === i[0],
  );
  if (byInitial.length === 1) return byInitial[0].id;
  // If the cell holds a fuller name, try an exact-ish match.
  const byName = coordinators.find(
    (c) =>
      c.first_name.toLowerCase() === i ||
      c.display_name.toLowerCase() === i,
  );
  if (byName) return byName.id;
  // Ambiguous initial → first match (best effort).
  return byInitial[0]?.id ?? null;
}
