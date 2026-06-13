/**
 * Best-effort PDF table extraction (Build Brief Section 5 — "attempt to
 * auto-extract tabular data; any unrecognised fields should be flagged for
 * manual correction"). Uses PDF.js to read positioned text and reconstructs
 * rows (by y) and columns (by x gaps). Image-only/scanned PDFs yield no text,
 * which the callers flag for manual entry.
 *
 * pdfjs-dist is dynamically imported so it never loads during SSR/build.
 */

export interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Reconstruct a page's positioned text items into a matrix of cell strings. */
export function reconstructRows(items: TextItem[]): string[][] {
  if (items.length === 0) return [];

  // Group into lines by y (PDF y grows upward); small tolerance for jitter.
  const tol = 3;
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: TextItem[][] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - it.y) <= tol);
    if (line) line.push(it);
    else lines.push([it]);
  }

  const rows: string[][] = [];
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    // Column gap threshold: larger than an in-cell word space.
    const charWidths = line
      .filter((i) => i.str.length > 0)
      .map((i) => i.w / i.str.length);
    const gapThreshold = Math.max(6, median(charWidths) * 2.5);

    const cells: string[] = [];
    let current = "";
    let prevEnd = -Infinity;
    for (const it of line) {
      if (prevEnd !== -Infinity && it.x - prevEnd > gapThreshold) {
        cells.push(current.trim());
        current = "";
      }
      current += (current && current.slice(-1) !== " " ? " " : "") + it.str;
      prevEnd = it.x + it.w;
    }
    if (current.trim()) cells.push(current.trim());
    if (cells.some((c) => c.length > 0)) rows.push(cells);
  }
  return rows;
}

/** Extract a tabular matrix from a PDF File (all pages concatenated). */
export async function parsePdfToMatrix(file: File): Promise<string[][]> {
  const pdfjs = await import("pdfjs-dist");
  // Bundle the worker alongside the app (Turbopack resolves new URL(...)).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const allRows: string[][] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      .filter((i): i is typeof i & { str: string } => "str" in i)
      .map((i) => {
        // transform = [a, b, c, d, e, f]; e = x, f = y.
        const t = (i as { transform: number[] }).transform;
        return { str: i.str, x: t[4], y: t[5], w: (i as { width: number }).width };
      })
      .filter((i) => i.str.trim().length > 0);
    allRows.push(...reconstructRows(items));
  }

  await loadingTask.destroy();
  return allRows;
}

/** Turn a matrix into row objects keyed by the first (header) row. */
export function matrixToObjects(matrix: string[][]): Record<string, string>[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((h, i) => h || `col${i}`);
  return matrix.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}
