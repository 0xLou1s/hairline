import { describe, expect, it } from "vitest";
import { number, ranges } from "../src/ranges";

const r = ranges.riffle.stagger; // 0 to 90, default 40

describe("number", () => {
  it("keeps a number inside the range", () => {
    expect(number(60, r)).toBe(60);
  });
  it("clamps to the range", () => {
    expect(number(-5, r)).toBe(0);
    expect(number(500, r)).toBe(90);
  });
  it("reads a numeric string, as an attribute or a form field would give it", () => {
    expect(number("60", r)).toBe(60);
    expect(number(" 500 ", r)).toBe(90);
  });
  it.each([undefined, null, NaN, Infinity, -Infinity, "", "  ", "fast", {}, [], true])("falls back to the default for %o", (v) => {
    expect(number(v, r)).toBe(40);
  });
});

describe("ranges", () => {
  it("has a default inside every range and a positive step", () => {
    for (const figure of Object.values(ranges)) {
      for (const range of Object.values(figure) as Array<(typeof ranges)["riffle"]["stagger"]>) {
        expect(range.min).toBeLessThan(range.max);
        expect(range.default).toBeGreaterThanOrEqual(range.min);
        expect(range.default).toBeLessThanOrEqual(range.max);
        expect(range.step).toBeGreaterThan(0);
      }
    }
  });
});
