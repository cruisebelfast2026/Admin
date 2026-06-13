/**
 * Client-side file reading for uploads. Supports CSV (papaparse) and
 * Excel .xlsx/.xls (SheetJS). PDF is accepted but flagged for manual entry
 * since reliable in-browser table extraction is out of scope.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ReadResult {
  rows: Record<string, unknown>[];
  format: "csv" | "xlsx" | "pdf";
  needsManual?: boolean;
}

export async function readTabularFile(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return { rows: parsed.data, format: "csv" };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
    return { rows, format: "xlsx" };
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    // PDF table extraction is unreliable client-side; flag for manual entry.
    return { rows: [], format: "pdf", needsManual: true };
  }

  throw new Error("Unsupported file type. Upload .csv, .xlsx or .pdf.");
}

/** Read a sheet as a 2-D array of cells (for the availability grid layout). */
export async function readSheetMatrix(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: true });
    return parsed.data;
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
}
