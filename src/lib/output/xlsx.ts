/**
 * Excel (.xlsx) generation for an individual rota (Section 13.3) — mirrors the
 * PDF section layout. Uses SheetJS.
 */
import * as XLSX from "xlsx";
import {
  hhmm,
  longDate,
  SECTION_ORDER,
  SECTION_TITLES,
  type RotaOutputData,
} from "./types";

export function downloadRotaXlsx(data: RotaOutputData, fileName: string) {
  const { ship, shifts, shuttles } = data;
  const aoa: (string | number)[][] = [];

  aoa.push(["CRUISE WELCOME AMBASSADOR ROTA"]);
  aoa.push([longDate(ship.date)]);
  aoa.push([]);
  aoa.push(["Ship", ship.ship_name, "Dock", ship.dock ?? "—"]);
  aoa.push([
    "Time in Port",
    `${hhmm(ship.arrival_time)} – ${hhmm(ship.departure_time)}`,
    "Capacity",
    ship.capacity ?? "—",
  ]);
  aoa.push(["Cruise Line", ship.cruise_line ?? "—", "Season Ship #", ship.season_number ?? "—"]);
  aoa.push([]);

  for (const role of SECTION_ORDER) {
    const rows = shifts
      .filter((s) => s.role_type === role)
      .sort((a, b) => a.shift_number - b.shift_number);
    if (rows.length === 0) continue;
    aoa.push([SECTION_TITLES[role]]);
    aoa.push(["Name", "Time", "Location"]);
    for (const s of rows) {
      const time =
        role === "volunteer"
          ? hhmm(s.start_time)
          : `${hhmm(s.start_time)} – ${hhmm(s.end_time)}`;
      aoa.push([data.staffName(s.assigned_staff_id), time, s.location ?? ""]);
    }
    aoa.push([]);
  }

  if (shuttles.length > 0) {
    aoa.push(["BUSES / SHUTTLES"]);
    aoa.push(["Buses", "First / Last", "Frequency"]);
    for (const b of shuttles) {
      aoa.push([
        `${b.bus_count} × ${b.bus_type === "double_decker" ? "Double Decker" : "Single"}`,
        `First ${hhmm(b.first_from_dock)} · Last ${hhmm(b.last_from_city)}`,
        `Every ${b.frequency_minutes ?? "—"} min`,
      ]);
    }
    aoa.push([]);
  }

  aoa.push(["Payment", data.payment || "TBC"]);
  aoa.push(["Capacity", ship.capacity ?? "—"]);
  aoa.push(["VBWC Opening Hours", data.vbwcHours || "—"]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 28 }, { wch: 26 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rota");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
