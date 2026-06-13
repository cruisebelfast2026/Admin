import { describe, expect, it } from "vitest";
import {
  ambassadorWindow,
  availabilityCoversShift,
  defaultShiftLocation,
  periodsForStart,
  splitShift,
  travelAdvisorShifts,
} from "./rota-calc";

describe("ambassadorWindow", () => {
  it("applies default offsets to shuttle times", () => {
    // First shuttle from dock 08:30, last from city 17:30 (Arcadia sample).
    const w = ambassadorWindow("08:30", "17:30");
    expect(w.dock.start).toBe("08:15"); // -15
    expect(w.vbwc.start).toBe("08:45"); // +15
    expect(w.dock.end).toBe("17:45"); // +15
    expect(w.vbwc.end).toBe("17:30"); // same
  });
});

describe("splitShift", () => {
  it("keeps a single shift when <= 4 hours", () => {
    expect(splitShift({ start: "08:15", end: "12:15" })).toHaveLength(1);
  });

  it("splits into 2 when > 4h and <= 10h, rounded to 15 min", () => {
    const parts = splitShift({ start: "08:00", end: "17:00" }); // 9h
    expect(parts).toHaveLength(2);
    expect(parts[0].start).toBe("08:00");
    expect(parts[1].end).toBe("17:00");
    // midpoint 12:30
    expect(parts[0].end).toBe("12:30");
    expect(parts[1].start).toBe("12:30");
  });

  it("splits into 3 when > 10 hours", () => {
    const parts = splitShift({ start: "07:00", end: "18:00" }); // 11h
    expect(parts).toHaveLength(3);
    expect(parts[0].start).toBe("07:00");
    expect(parts[2].end).toBe("18:00");
  });
});

describe("defaultShiftLocation", () => {
  it("uses VBWC for a single shift", () => {
    expect(defaultShiftLocation(0, 1, "D1")).toBe("VBWC");
  });
  it("puts first at VBWC and rest at the dock", () => {
    expect(defaultShiftLocation(0, 2, "D1")).toBe("VBWC");
    expect(defaultShiftLocation(1, 2, "D1")).toBe("D1");
  });
});

describe("travelAdvisorShifts", () => {
  it("1 TA below threshold, start = arrival + 30, 4h duration", () => {
    const r = travelAdvisorShifts("07:30", 900, "D1");
    expect(r.count).toBe(1);
    expect(r.span.start).toBe("08:00");
    expect(r.span.end).toBe("12:00");
    expect(r.location).toBe("D1");
  });
  it("2 TAs at/above 1200 capacity", () => {
    expect(travelAdvisorShifts("07:30", 2960, "D1").count).toBe(2);
  });
});

describe("periodsForStart", () => {
  it("classifies an 08:15 start as AM", () => {
    expect(periodsForStart("08:15")).toEqual(["AM"]);
  });
  it("classifies a 12:30 start as both AM and PM", () => {
    expect(periodsForStart("12:30").sort()).toEqual(["AM", "PM"]);
  });
  it("classifies a 16:30 start as PM and EV", () => {
    expect(periodsForStart("16:30").sort()).toEqual(["EV", "PM"]);
  });
});

describe("availabilityCoversShift", () => {
  it("matches when availability includes a shift period", () => {
    expect(availabilityCoversShift("AM", "08:15")).toBe(true);
    expect(availabilityCoversShift("PM+EV", "08:15")).toBe(false);
    expect(availabilityCoversShift("AM+PM", "12:30")).toBe(true);
  });
});
