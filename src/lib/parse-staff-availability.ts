/**
 * Per-staff availability parsing (one file per person). Each file uses the CWA
 * availability template: a header row of
 *   Day | Date | In Port Times | COMPANY | SHIP | AM | PM | EV | Notes
 * and one row per ship call, with the AM/PM/EV cells marked when the person is
 * available. Marking styles vary by person (e.g. "x", "Free", "yes"); anything
 * that isn't blank or an explicit "NA"/"no" counts as available.
 *
 * Supports Excel/CSV (via a parsed matrix) and PDF (position-aware, including
 * wide tables split across pages).
 */

import { parseDate } from "./parse-schedule";

export interface StaffAvailRow {
  date: string; // ISO
  shipName: string | null;
  period: string; // e.g. "AM", "PM+EV", "AM+PM+EV"
}

const NEGATIVE = new Set([
  "na", "n/a", "no", "n", "-", "–", "—", "0", "off", "unavailable", "false", "none",
]);

function isAvailable(cell: unknown): boolean {
  const t = String(cell ?? "").trim().toLowerCase();
  if (!t) return false;
  return !NEGATIVE.has(t);
}

/** Parse a spreadsheet matrix (Excel/CSV) for a single staff member. */
export function parseStaffAvailabilityMatrix(matrix: unknown[][]): StaffAvailRow[] {
  let header = -1;
  let dCol = -1, sCol = -1, amCol = -1, pmCol = -1, evCol = -1;
  for (let i = 0; i < Math.min(matrix.length, 12); i++) {
    const row = (matrix[i] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
    const am = row.indexOf("am");
    const date = row.indexOf("date");
    if (am >= 0 && date >= 0) {
      header = i;
      dCol = date;
      amCol = am;
      pmCol = row.indexOf("pm");
      evCol = row.indexOf("ev");
      sCol = row.indexOf("ship");
      break;
    }
  }
  if (header < 0) return [];

  const out: StaffAvailRow[] = [];
  for (let r = header + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const date = parseDate(row[dCol]);
    if (!date) continue;
    const periods: string[] = [];
    if (amCol >= 0 && isAvailable(row[amCol])) periods.push("AM");
    if (pmCol >= 0 && isAvailable(row[pmCol])) periods.push("PM");
    if (evCol >= 0 && isAvailable(row[evCol])) periods.push("EV");
    if (periods.length === 0) continue;
    out.push({
      date,
      shipName: sCol >= 0 ? String(row[sCol] ?? "").trim() || null : null,
      period: periods.join("+"),
    });
  }
  return out;
}

interface PdfItem {
  s: string;
  x: number;
  y: number;
}

/** Parse a PDF for a single staff member (handles tables split across pages). */
export async function parseStaffAvailabilityPdf(file: File): Promise<StaffAvailRow[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  // Wide tables are sometimes printed across pages (e.g. AM on page 1, PM/EV on
  // page 2). Offset each page's x so the same printed row (shared y) lines up.
  const PAGE_OFFSET = 2000;
  const items: PdfItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const s = it.str.trim();
      if (!s) continue;
      const t = (it as { transform: number[] }).transform;
      items.push({ s, x: t[4] + (p - 1) * PAGE_OFFSET, y: Math.round(t[5]) });
    }
  }
  await loadingTask.destroy();

  const headerX = (name: string): number | null => {
    const it = items.find((i) => new RegExp(`^${name}$`, "i").test(i.s));
    return it ? it.x : null;
  };
  const amX = headerX("am");
  const pmX = headerX("pm");
  const evX = headerX("ev");
  const shipX = headerX("ship");
  if (amX == null) return [];

  // Group items into lines by y (across pages), sorted top-to-bottom.
  const groups: PdfItem[][] = [];
  for (const it of items) {
    const line = groups.find((g) => Math.abs(g[0].y - it.y) <= 3);
    if (line) line.push(it);
    else groups.push([it]);
  }
  groups.sort((a, b) => b[0].y - a[0].y);

  const markNear = (line: PdfItem[], cx: number | null): boolean => {
    if (cx == null) return false;
    return line.some(
      (i) =>
        Math.abs(i.x - cx) < 22 &&
        isAvailable(i.s) &&
        !/\d{1,2}[:/]\d{2}/.test(i.s),
    );
  };

  const out: StaffAvailRow[] = [];
  for (const line of groups) {
    const joined = line.map((i) => i.s).join(" ");
    const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(joined);
    if (!m) continue;
    const date = `${m[3]}-${m[2]}-${m[1]}`;
    const periods: string[] = [];
    if (markNear(line, amX)) periods.push("AM");
    if (markNear(line, pmX)) periods.push("PM");
    if (markNear(line, evX)) periods.push("EV");
    if (periods.length === 0) continue;
    const ship =
      shipX != null
        ? line
            .filter((i) => i.x >= shipX - 5 && i.x < amX - 10)
            .map((i) => i.s)
            .join(" ")
            .replace(/\d{1,2}[:/]\d{2}\s*-?\s*\d{0,2}:?\d{0,2}/g, "")
            .trim() || null
        : null;
    out.push({ date, shipName: ship, period: periods.join("+") });
  }
  return out;
}
