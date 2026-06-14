import { describe, expect, it } from "vitest";
import { parseStaffAvailabilityMatrix } from "./parse-staff-availability";

const HEADER = ["Day", "Date", "In Port Times", "COMPANY", "SHIP", "AM", "PM", "EV", "Notes"];

describe("parseStaffAvailabilityMatrix", () => {
  it('reads "x" marks (Michele style)', () => {
    const rows = parseStaffAvailabilityMatrix([
      ["", ""],
      ["Your Name", ""],
      HEADER,
      ["Wed", "01/07/2026", "06:20-18:30", "NCL", "NORWEGIAN SKY", "x", "x", "", ""],
      ["Fri", "03/07/2026", "08:00-18:00", "SEABOURN", "SEABOURN OVATION", "", "", "", ""],
    ]);
    expect(rows).toEqual([
      { date: "2026-07-01", shipName: "NORWEGIAN SKY", period: "AM+PM" },
    ]);
  });

  it('reads "Free"/"NA" marks (Stephen style), trimming whitespace', () => {
    const rows = parseStaffAvailabilityMatrix([
      ["Your Name", "STEPHEN WALLACE "],
      HEADER,
      ["Wed", "01/07/2026", "", "NCL", "NORWEGIAN SKY", "Free", "Free", "Free", ""],
      ["Mon", "13/07/2026", "", "TUI", "MEIN SCHIFF 2", "Free ", "Free ", "NA", ""],
      ["Tue", "14/07/2026", "", "HAPAG", "EUROPA", "NA", "NA", "NA", ""],
    ]);
    expect(rows).toEqual([
      { date: "2026-07-01", shipName: "NORWEGIAN SKY", period: "AM+PM+EV" },
      { date: "2026-07-13", shipName: "MEIN SCHIFF 2", period: "AM+PM" },
    ]);
  });

  it("returns nothing when no header is present", () => {
    expect(parseStaffAvailabilityMatrix([["foo", "bar"]])).toEqual([]);
  });

  it("handles Date objects in the date column (Excel cellDates)", () => {
    const rows = parseStaffAvailabilityMatrix([
      HEADER,
      ["Wed", new Date(Date.UTC(2026, 6, 1)), "", "NCL", "SHIP A", "yes", "", "", ""],
    ]);
    expect(rows[0]).toMatchObject({ date: "2026-07-01", period: "AM" });
  });
});
