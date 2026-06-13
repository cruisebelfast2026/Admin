import { describe, expect, it } from "vitest";
import { parseDate, parseScheduleRows, parseTime } from "./parse-schedule";

describe("parseDate", () => {
  it("parses DD/MM/YYYY to ISO", () => {
    expect(parseDate("07/06/2026")).toBe("2026-06-07");
  });
  it("accepts ISO", () => {
    expect(parseDate("2026-06-07")).toBe("2026-06-07");
  });
  it("returns null for junk", () => {
    expect(parseDate("not a date")).toBeNull();
  });
});

describe("parseTime", () => {
  it("normalises H:MM and HH.MM", () => {
    expect(parseTime("8:30")).toBe("08:30");
    expect(parseTime("17.45")).toBe("17:45");
  });
  it("handles am/pm", () => {
    expect(parseTime("5:30 pm")).toBe("17:30");
  });
});

describe("parseScheduleRows", () => {
  it("maps tolerant headers and parses a row", () => {
    const rows = [
      {
        Day: "Sunday",
        Date: "07/06/2026",
        "Arrival Time": "07:30",
        "Departure Time": "18:30",
        Company: "P&O",
        Ship: "Arcadia",
        Pax: "2960",
        Berth: "D1",
      },
    ];
    const parsed = parseScheduleRows(rows);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      date: "2026-06-07",
      arrival_time: "07:30",
      departure_time: "18:30",
      cruise_line: "P&O",
      ship_name: "Arcadia",
      capacity: 2960,
      dock: "D1",
    });
    expect(parsed[0]._warnings).toHaveLength(0);
  });

  it("flags an unknown dock and missing ship name", () => {
    const parsed = parseScheduleRows([
      { Date: "08/06/2026", Dock: "Pier 9", Ship: "" },
    ]);
    expect(parsed[0]._warnings.join(" ")).toMatch(/Unknown dock/);
  });
});
