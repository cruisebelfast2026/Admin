import { describe, expect, it } from "vitest";
import { nullEmpty, numOrNull } from "./sanitize";

describe("nullEmpty", () => {
  it("converts present empty-string keys to null", () => {
    expect(nullEmpty({ a: "", b: "x" }, ["a", "b"])).toEqual({ a: null, b: "x" });
  });

  it("does NOT inject keys that are absent (safe for partial patches)", () => {
    // Regression: a partial ship patch must not wipe date/arrival/etc.
    const patch = { rota_status: "complete_sent" } as Record<string, unknown>;
    const out = nullEmpty(patch, ["date", "arrival_time", "departure_time"]);
    expect(out).toEqual({ rota_status: "complete_sent" });
    expect("date" in out).toBe(false);
  });

  it("leaves existing null/values untouched", () => {
    expect(nullEmpty({ a: null, b: 5 }, ["a", "b"])).toEqual({ a: null, b: 5 });
  });
});

describe("numOrNull", () => {
  it("returns finite numbers and nulls NaN/empty", () => {
    expect(numOrNull(5)).toBe(5);
    expect(numOrNull("7")).toBe(7);
    expect(numOrNull("")).toBeNull();
    expect(numOrNull(NaN)).toBeNull();
  });
});
