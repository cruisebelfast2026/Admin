import { describe, expect, it } from "vitest";
import type { Ship } from "../types";
import { rotaFileName } from "./filename";
import { buildRotaAoa } from "./xlsx";
import { busLabel, dateLine, dot, dotRange, portRange } from "./types";
import type { RotaOutputData, RotaShiftLike, RotaShuttleLike } from "./types";

describe("time formatters", () => {
  it("formats dot times and ranges", () => {
    expect(dot("08:30")).toBe("08.30");
    expect(dotRange("07:30", "12:30")).toBe("07.30-12.30");
    expect(dotRange("08:00", null)).toBe("08.00");
  });
  it("formats time-in-port and date line", () => {
    expect(portRange("08:00", "17:30")).toBe("0800 - 1730");
    expect(dateLine("2026-06-14")).toBe("Sunday 14th June");
  });
  it("labels buses", () => {
    expect(busLabel({ bus_type: "double_decker", bus_count: 3 } as RotaShuttleLike)).toBe("x3 DD Buses");
  });
});

describe("rotaFileName", () => {
  it("follows the CWA convention", () => {
    const ship = { season_number: 16, ship_name: "Ambition", date: "2026-06-14" } as Ship;
    expect(rotaFileName(ship)).toBe("16_CWA_Rota_AMBITION_14th_June_2026");
  });
});

describe("buildRotaAoa", () => {
  const ship = {
    ship_name: "AMBITION",
    dock: "D1",
    arrival_time: "08:00",
    departure_time: "17:30",
    capacity: 1700,
    date: "2026-06-14",
    season_number: 16,
  } as Ship;

  const shifts: RotaShiftLike[] = [
    { role_type: "coordinator", shift_number: 1, start_time: "07:30", end_time: "12:30", location: "D1", assigned_staff_id: "conor" },
    { role_type: "travel_advisor", shift_number: 1, start_time: "08:00", end_time: "12:00", location: "D1", assigned_staff_id: "craig" },
    { role_type: "ambassador", shift_number: 1, start_time: "08:15", end_time: "13:00", location: "D1", assigned_staff_id: "anne" },
    { role_type: "volunteer", shift_number: 1, start_time: "08:00", end_time: null, location: "D1", assigned_staff_id: "kathryn" },
  ];
  const shuttles: RotaShuttleLike[] = [
    { bus_type: "double_decker", bus_count: 3, first_from_dock: "08:30", last_from_city: "17:00", frequency_minutes: 20 },
  ];
  const names: Record<string, string> = { conor: "Conor", craig: "Craig", anne: "Anne", kathryn: "Kathryn" };
  const data: RotaOutputData = {
    ship, shifts, shuttles, vbwcHours: "09:00-17:00", payment: "Included",
    staffName: (id) => names[id ?? ""] ?? "—",
  };

  const aoa = buildRotaAoa(data).map((r) => r.join("|"));

  it("renders the header block with dot/port formats", () => {
    expect(aoa).toContain("DATE||Sunday 14th June");
    expect(aoa).toContain("SHIP||AMBITION");
    expect(aoa).toContain("TIME IN PORT||0800 - 1730");
  });
  it("places section labels on the first member row with dot times", () => {
    expect(aoa).toContain("COORDINATOR||Conor|07.30-12.30|D1");
    expect(aoa).toContain("AMBASSADORS||Anne|08.15-13.00|D1");
  });
  it("shows volunteers with a start time only", () => {
    expect(aoa).toContain("VOLUNTEERS||Kathryn|08.00|D1");
  });
  it("renders the shuttle block and footer", () => {
    expect(aoa).toContain("||BUSES|TIMES|FREQUENCY");
    expect(aoa).toContain("SHUTTLES||x3 DD Buses|1st Bus 08.30|Every 20minutes");
    expect(aoa).toContain("|||Last Bus 17.00|");
    expect(aoa).toContain("PAYMENT||Included");
    expect(aoa).toContain("CAPACITY||1700");
  });
});
