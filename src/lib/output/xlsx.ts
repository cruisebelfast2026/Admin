/**
 * Excel (.xlsx) generation for an individual rota (Section 13.3), laid out to
 * match the established CWA rota sheet. The worksheet tab is named after the
 * file (e.g. 16_CWA_Rota_AMBITION_14th_June_2026).
 */
import * as XLSX from "xlsx";
import {
  busLabel,
  dateLine,
  dot,
  dotRange,
  portRange,
  SECTION_ORDER,
  SECTION_TITLES,
  type RotaOutputData,
} from "./types";

type Row = (string | number)[];

export function buildRotaAoa(data: RotaOutputData): Row[] {
  const { ship, shifts, shuttles } = data;
  const rows: Row[] = [];
  const blank = () => rows.push([]);
  const get = (role: (typeof SECTION_ORDER)[number]) =>
    shifts
      .filter((s) => s.role_type === role)
      .sort((a, b) => a.shift_number - b.shift_number);

  blank();
  rows.push(["DATE", "", dateLine(ship.date)]);
  blank();
  rows.push(["SHIP", "", ship.ship_name]);
  blank();
  rows.push(["DOCK", "", ship.dock ?? ""]);
  blank();
  rows.push(["TIME IN PORT", "", portRange(ship.arrival_time, ship.departure_time)]);
  blank();
  rows.push(["", "", "NAME", "TIME", "POSITION"]);
  blank();

  // People sections: section label sits on the first member's row.
  const personSections: (typeof SECTION_ORDER)[number][] = [
    "coordinator",
    "travel_advisor",
    "ambassador",
    "volunteer",
  ];
  for (const role of personSections) {
    const members = get(role);
    if (members.length === 0) {
      rows.push([SECTION_TITLES[role]]);
    } else {
      members.forEach((s, i) => {
        const label = i === 0 ? SECTION_TITLES[role] : "";
        const time =
          role === "volunteer" ? dot(s.start_time) : dotRange(s.start_time, s.end_time);
        rows.push([label, "", data.staffName(s.assigned_staff_id), time, s.location ?? ""]);
      });
    }
    blank();
    blank();
  }

  // Shuttles block.
  rows.push(["", "", "BUSES", "TIMES", "FREQUENCY"]);
  if (shuttles.length === 0) {
    rows.push(["SHUTTLES"]);
  } else {
    shuttles.forEach((b, i) => {
      const label = i === 0 ? "SHUTTLES" : "";
      const freq = b.frequency_minutes ? `Every ${b.frequency_minutes}minutes` : "";
      rows.push([label, "", busLabel(b), `1st Bus ${dot(b.first_from_dock)}`, freq]);
      rows.push(["", "", "", `Last Bus ${dot(b.last_from_city)}`, ""]);
    });
  }
  blank();

  rows.push(["PAYMENT", "", data.payment || "TBC"]);
  blank();
  rows.push(["CAPACITY", "", ship.capacity ?? ""]);
  blank();
  rows.push(["VBWC", "", dotRange(splitHours(data.vbwcHours)[0], splitHours(data.vbwcHours)[1]) || data.vbwcHours || ""]);

  return rows;
}

/** Accept "09:00-17:00" or "09.00–17.00" and return [start, end] in HH:MM. */
function splitHours(v: string): [string | null, string | null] {
  const m = /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/.exec(v ?? "");
  if (!m) return [null, null];
  return [`${m[1].padStart(2, "0")}:${m[2]}`, `${m[3].padStart(2, "0")}:${m[4]}`];
}

export function downloadRotaXlsx(data: RotaOutputData, fileName: string) {
  const ws = XLSX.utils.aoa_to_sheet(buildRotaAoa(data));
  ws["!cols"] = [
    { wch: 18 }, { wch: 2 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 2 }, { wch: 2 },
  ];
  const wb = XLSX.utils.book_new();
  // Worksheet tab name == file name (Excel caps tab names at 31 chars).
  XLSX.utils.book_append_sheet(wb, ws, fileName.slice(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
