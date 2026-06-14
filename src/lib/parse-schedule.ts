/**
 * Schedule parsing (Build Brief Section 5).
 * Tolerant to column-name variations. Returns parsed rows plus a list of
 * fields that could not be recognised so the UI can flag them for manual
 * correction.
 */

import { DOCKS } from "./constants";

export interface ParsedShipRow {
  day: string | null;
  date: string | null; // ISO yyyy-mm-dd
  arrival_time: string | null;
  departure_time: string | null;
  cruise_line: string | null;
  ship_name: string | null;
  capacity: number | null;
  dock: string | null;
  _warnings: string[];
}

const HEADER_ALIASES: Record<keyof Omit<ParsedShipRow, "_warnings">, string[]> = {
  day: ["day", "weekday", "day of week"],
  date: ["date", "call date", "arrival date"],
  arrival_time: ["arrival", "arrival time", "arr", "eta", "in", "arrive"],
  departure_time: ["departure", "departure time", "dep", "etd", "out", "depart"],
  cruise_line: ["cruise line", "cruiseline", "company", "line", "operator"],
  ship_name: ["ship name", "ship", "vessel", "vessel name"],
  capacity: ["capacity", "pax", "passengers", "passenger count", "guests"],
  dock: ["dock", "berth", "location", "quay"],
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/** Map raw header names to canonical field keys. */
export function mapHeaders(headers: string[]): Record<string, keyof ParsedShipRow> {
  const out: Record<string, keyof ParsedShipRow> = {};
  for (const raw of headers) {
    const n = norm(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => n === a || n.includes(a))) {
        out[raw] = field as keyof ParsedShipRow;
        break;
      }
    }
  }
  return out;
}

/** Parse a date in DD/MM/YYYY (or similar) to ISO yyyy-mm-dd. */
export function parseDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  // Excel serial date (1900 system; epoch 1899-12-30).
  if (typeof value === "number" && value > 59) {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? "20" + yRaw : yRaw;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // ISO already
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/** Normalise a time-ish cell to "HH:MM" 24h. */
export function parseTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  // Excel serial fraction of a day
  if (typeof value === "number" && value > 0 && value < 1) {
    const mins = Math.round(value * 24 * 60);
    const h = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  const s = String(value).trim();
  const m = /(\d{1,2})[:.h](\d{2})\s*(am|pm)?/i.exec(s);
  if (m) {
    let h = Number(m[1]);
    const mm = Number(m[2]);
    const ap = m[3]?.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  return null;
}

function parseDock(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  const match = DOCKS.find((d) => d.toLowerCase() === s.toLowerCase());
  return match ?? s; // keep raw if unknown — flagged via warning
}

/** Parse an array of row objects (keyed by raw header) into ship rows. */
export function parseScheduleRows(
  rows: Record<string, unknown>[],
): ParsedShipRow[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const map = mapHeaders(headers);

  return rows
    .map((row) => {
      const out: ParsedShipRow = {
        day: null,
        date: null,
        arrival_time: null,
        departure_time: null,
        cruise_line: null,
        ship_name: null,
        capacity: null,
        dock: null,
        _warnings: [],
      };
      for (const [raw, field] of Object.entries(map)) {
        const v = row[raw];
        switch (field) {
          case "date":
            out.date = parseDate(v);
            if (v && !out.date) out._warnings.push(`Unrecognised date: "${v}"`);
            break;
          case "arrival_time":
            out.arrival_time = parseTime(v);
            break;
          case "departure_time":
            out.departure_time = parseTime(v);
            break;
          case "capacity": {
            const n = Number(String(v ?? "").replace(/[^0-9]/g, ""));
            out.capacity = Number.isFinite(n) && n > 0 ? n : null;
            break;
          }
          case "dock": {
            out.dock = parseDock(v);
            if (out.dock && !DOCKS.includes(out.dock as (typeof DOCKS)[number]))
              out._warnings.push(`Unknown dock: "${out.dock}"`);
            break;
          }
          case "day":
            out.day = v ? String(v).trim() : null;
            break;
          case "cruise_line":
            out.cruise_line = v ? String(v).trim() : null;
            break;
          case "ship_name":
            out.ship_name = v ? String(v).trim() : null;
            break;
        }
      }
      if (!out.ship_name) out._warnings.push("Missing ship name");
      if (!out.date) out._warnings.push("Missing date");
      return out;
    })
    .filter((r) => r.ship_name || r.date); // drop fully empty rows
}
