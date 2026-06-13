import { describe, expect, it } from "vitest";
import { assignSeasonNumbers } from "./ships-store";
import type { Ship } from "./types";

function ship(date: string, name: string): Ship {
  return {
    id: name,
    year: 2026,
    month: Number(date.slice(5, 7)),
    season_number: 0,
    date,
    arrival_time: null,
    departure_time: null,
    dock: null,
    cruise_line: null,
    ship_name: name,
    capacity: null,
    rota_status: "draft_no_info",
    vbwc_opening_hours: null,
    payment_notes: null,
    info_received: false,
    rota_sent: false,
    volunteers_sent: false,
    confirmed: false,
    created_at: "",
    updated_at: "",
  };
}

describe("assignSeasonNumbers", () => {
  it("numbers ships sequentially by date order", () => {
    const result = assignSeasonNumbers([
      ship("2026-07-10", "C"),
      ship("2026-06-07", "A"),
      ship("2026-06-20", "B"),
    ]);
    const byName = Object.fromEntries(result.map((s) => [s.ship_name, s.season_number]));
    expect(byName).toEqual({ A: 1, B: 2, C: 3 });
  });
});
