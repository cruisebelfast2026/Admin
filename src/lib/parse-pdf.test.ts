import { describe, expect, it } from "vitest";
import { matrixToObjects, reconstructRows, type TextItem } from "./parse-pdf";

// Helper: build a positioned text item (width ≈ 7 units per char).
function item(str: string, x: number, y: number): TextItem {
  return { str, x, y, w: str.length * 7 };
}

describe("reconstructRows", () => {
  it("groups items into rows by y and splits columns by x gaps", () => {
    // Two columns far apart (big x gap), two rows at different y.
    const items: TextItem[] = [
      item("Date", 50, 700),
      item("Ship", 300, 700),
      item("07/06/2026", 50, 680),
      item("Arcadia", 300, 680),
    ];
    const rows = reconstructRows(items);
    expect(rows).toEqual([
      ["Date", "Ship"],
      ["07/06/2026", "Arcadia"],
    ]);
  });

  it("keeps words within a cell together (small gaps)", () => {
    const items: TextItem[] = [
      item("P&O", 50, 500),
      item("Cruises", 75, 500), // small gap → same cell
      item("Arcadia", 300, 500),
    ];
    const [row] = reconstructRows(items);
    expect(row[0]).toBe("P&O Cruises");
    expect(row[1]).toBe("Arcadia");
  });
});

describe("matrixToObjects", () => {
  it("keys data rows by the header row", () => {
    const objs = matrixToObjects([
      ["Date", "Ship"],
      ["07/06/2026", "Arcadia"],
    ]);
    expect(objs).toEqual([{ Date: "07/06/2026", Ship: "Arcadia" }]);
  });

  it("returns nothing for a header-only matrix", () => {
    expect(matrixToObjects([["Date", "Ship"]])).toEqual([]);
  });
});
