import { describe, expect, it } from "vitest";
import { parseCoordinatorRows, resolveCoordinator } from "./parse-coordinator";
import { timesOverlap } from "./time";

const coords = [
  { id: "damien", first_name: "Damien", display_name: "Damien M" },
  { id: "conor", first_name: "Conor", display_name: "Conor B" },
];

describe("parseCoordinatorRows", () => {
  it("reads date + initial with tolerant headers", () => {
    const rows = parseCoordinatorRows([
      { Date: "07/06/2026", Coordinator: "D" },
      { Date: "08/06/2026", Coordinator: "C" },
    ]);
    expect(rows).toEqual([
      { date: "2026-06-07", initial: "D" },
      { date: "2026-06-08", initial: "C" },
    ]);
  });
});

describe("resolveCoordinator", () => {
  it("matches an initial to the coordinator by first-name letter", () => {
    expect(resolveCoordinator("D", coords)).toBe("damien");
    expect(resolveCoordinator("C", coords)).toBe("conor");
  });
  it("matches a full first name", () => {
    expect(resolveCoordinator("Conor", coords)).toBe("conor");
  });
  it("returns null for an unknown initial", () => {
    expect(resolveCoordinator("Z", coords)).toBeNull();
  });
});

describe("timesOverlap", () => {
  it("detects overlapping spans", () => {
    expect(timesOverlap("08:00", "12:00", "11:00", "14:00")).toBe(true);
  });
  it("treats touching endpoints as non-overlapping", () => {
    expect(timesOverlap("08:00", "12:00", "12:00", "16:00")).toBe(false);
  });
  it("is false when a time is missing", () => {
    expect(timesOverlap("08:00", null, "09:00", "10:00")).toBe(false);
  });
});
