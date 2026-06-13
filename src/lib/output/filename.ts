import type { Ship } from "../types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/**
 * CWA filename convention (Section 13.1):
 *   08_CWA_Rota_ARCADIA_7th_June_2026
 */
export function rotaFileName(ship: Ship): string {
  const d = new Date(ship.date + "T00:00:00");
  const num = String(ship.season_number ?? 0).padStart(2, "0");
  const name = (ship.ship_name ?? "SHIP").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const day = ordinal(d.getDate());
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${num}_CWA_Rota_${name}_${day}_${month}_${year}`;
}
