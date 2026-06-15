/**
 * Excel (.xlsx) generation for an individual rota — matches the established CWA
 * rota sheet exactly. Uses the shared line model so it's identical to the PDF.
 * The worksheet tab is named after the file.
 */
import * as XLSX from "xlsx";
import { buildRotaLines, type RotaOutputData } from "./types";

type Row = (string | number)[];

/** Map shared rota lines to spreadsheet rows: label | (blank) | name | time | position. */
export function buildRotaAoa(data: RotaOutputData): Row[] {
  return buildRotaLines(data).map((l) => {
    if (!l.label && !l.name && !l.time && !l.pos) return [];
    return [l.label, "", l.name, l.time, l.pos];
  });
}

export function downloadRotaXlsx(data: RotaOutputData, fileName: string) {
  const ws = XLSX.utils.aoa_to_sheet(buildRotaAoa(data));
  ws["!cols"] = [
    { wch: 18 }, { wch: 3 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 2 }, { wch: 2 },
  ];
  const wb = XLSX.utils.book_new();
  // Worksheet tab name == file name (Excel caps tab names at 31 chars).
  XLSX.utils.book_append_sheet(wb, ws, fileName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
