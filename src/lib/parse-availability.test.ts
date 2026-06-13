import { describe, expect, it } from "vitest";
import { parseAvailabilityMatrix } from "./parse-availability";

describe("parseAvailabilityMatrix", () => {
  it("extracts AM/PM/EV markers per staff per ship row", () => {
    const matrix = [
      ["Day", "Date", "In-Port", "Company", "Ship", "Patricia B", "Claire M", "Zoe K"],
      ["Sunday", "07/06/2026", "07:30-18:30", "P&O", "Arcadia", "AM", "AM/PM", ""],
      ["Monday", "08/06/2026", "08:00-17:00", "Cunard", "Queen", "", "PM", "EV"],
    ];
    const result = parseAvailabilityMatrix(matrix);
    expect(result.staffNames).toEqual(["Patricia B", "Claire M", "Zoe K"]);

    const arcadiaClaire = result.cells.find(
      (c) => c.shipName === "Arcadia" && c.staffName === "Claire M",
    );
    expect(arcadiaClaire?.period).toBe("AM+PM");
    expect(arcadiaClaire?.date).toBe("2026-06-07");

    const queenZoe = result.cells.find(
      (c) => c.shipName === "Queen" && c.staffName === "Zoe K",
    );
    expect(queenZoe?.period).toBe("EV");

    // Empty cells produce no entry.
    expect(
      result.cells.find((c) => c.shipName === "Arcadia" && c.staffName === "Zoe K"),
    ).toBeUndefined();
  });

  it("ignores a trailing Notes column", () => {
    const matrix = [
      ["Day", "Date", "In-Port", "Company", "Ship", "John E", "Notes"],
      ["Sunday", "07/06/2026", "07:30-18:30", "P&O", "Arcadia", "PM", "back late"],
    ];
    const result = parseAvailabilityMatrix(matrix);
    expect(result.staffNames).toEqual(["John E"]);
    expect(result.cells).toHaveLength(1);
  });
});
