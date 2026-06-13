/**
 * Availability sheet parsing (Build Brief Section 7.1 / 20.2).
 *
 * Layout: a header row holds ship-data columns (Day, Date, In-Port Times,
 * Company, Ship) followed by one column per staff member. Each subsequent row
 * is a ship call; per-staff cells contain AM / PM / EV (or combinations).
 */

const PERIOD_RE = /\b(AM|PM|EV)\b/gi;

export interface ParsedAvailabilityCell {
  date: string | null; // ISO
  shipName: string | null;
  staffName: string;
  period: string; // normalised e.g. "AM+PM"
}

export interface ParsedAvailability {
  cells: ParsedAvailabilityCell[];
  staffNames: string[];
  unmatched: string[];
}

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

function normalisePeriods(raw: unknown): string | null {
  const matches = norm(raw).toUpperCase().match(PERIOD_RE);
  if (!matches) return null;
  const order = ["AM", "PM", "EV"];
  const unique = Array.from(new Set(matches.map((m) => m.toUpperCase()))).sort(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  );
  return unique.join("+");
}

function parseDateCell(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = norm(value);
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? "20" + yRaw : yRaw;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return iso ? s.slice(0, 10) : null;
}

/**
 * @param matrix Raw sheet as 2-D array (header row + data rows).
 * @param shipDataColumns How many leading columns are ship metadata (default 5).
 */
export function parseAvailabilityMatrix(
  matrix: unknown[][],
  shipDataColumns = 5,
): ParsedAvailability {
  if (matrix.length < 2) return { cells: [], staffNames: [], unmatched: [] };

  // Find the header row: the first row whose cells past shipDataColumns are non-empty text.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(matrix.length, 5); i++) {
    const tail = matrix[i].slice(shipDataColumns).filter((c) => norm(c));
    if (tail.length >= 1) {
      headerIdx = i;
      break;
    }
  }

  const header = matrix[headerIdx];
  const staffCols: { idx: number; name: string }[] = [];
  for (let c = shipDataColumns; c < header.length; c++) {
    const name = norm(header[c]);
    if (name && name.toLowerCase() !== "notes") staffCols.push({ idx: c, name });
  }

  // Locate the date column within the ship-data block (prefer one named "date").
  let dateCol = 1;
  for (let c = 0; c < shipDataColumns; c++) {
    if (norm(header[c]).toLowerCase().includes("date")) dateCol = c;
  }
  let shipCol = shipDataColumns - 1;
  for (let c = 0; c < shipDataColumns; c++) {
    if (norm(header[c]).toLowerCase().includes("ship")) shipCol = c;
  }

  const cells: ParsedAvailabilityCell[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.every((c) => !norm(c))) continue;
    const date = parseDateCell(row[dateCol]);
    const shipName = norm(row[shipCol]) || null;
    for (const { idx, name } of staffCols) {
      const period = normalisePeriods(row[idx]);
      if (period) cells.push({ date, shipName, staffName: name, period });
    }
  }

  return { cells, staffNames: staffCols.map((s) => s.name), unmatched: [] };
}
