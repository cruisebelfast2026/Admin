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
  it("handles colon-less times", () => {
    expect(parseTime("0800")).toBe("08:00");
    expect(parseTime("1730")).toBe("17:30");
    expect(parseTime("620")).toBe("06:20");
  });
});

describe("combined In Port Times column", () => {
  it("splits an in-port range into arrival/departure", () => {
    const parsed = parseScheduleRows([
      { Date: "07/06/2026", "In Port Times": "06:20-18:30", Ship: "Arcadia", Dock: "D1" },
    ]);
    expect(parsed[0]).toMatchObject({
      arrival_time: "06:20",
      departure_time: "18:30",
    });
  });
  it("handles colon-less in-port ranges with spaces", () => {
    const parsed = parseScheduleRows([
      { Date: "07/06/2026", "Time in Port": "0800 - 1730", Ship: "Arcadia" },
    ]);
    expect(parsed[0]).toMatchObject({
      arrival_time: "08:00",
      departure_time: "17:30",
    });
  });
  it("detects a time-range column by its values even with an odd header", () => {
    const parsed = parseScheduleRows([
      { Date: "07/06/2026", Ship: "Arcadia", Schedule: "07:00-18:00" },
      { Date: "08/06/2026", Ship: "Aurora", Schedule: "08:30-17:45" },
    ]);
    expect(parsed[0]).toMatchObject({ arrival_time: "07:00", departure_time: "18:00" });
    expect(parsed[1]).toMatchObject({ arrival_time: "08:30", departure_time: "17:45" });
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
