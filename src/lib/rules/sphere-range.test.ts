import { describe, expect, it } from "vitest";

import { formatRange, resolveRangeFeet } from "./sphere-range";

describe("resolveRangeFeet", () => {
  it("is null for Touch (not a distance)", () => {
    expect(resolveRangeFeet({ kind: "TOUCH" }, 5)).toBeNull();
  });

  it("Close: 25 ft. + 5 ft. per 2 caster levels", () => {
    expect(resolveRangeFeet({ kind: "CLOSE" }, 1)).toBe(25);
    expect(resolveRangeFeet({ kind: "CLOSE" }, 2)).toBe(30);
    expect(resolveRangeFeet({ kind: "CLOSE" }, 3)).toBe(30);
    expect(resolveRangeFeet({ kind: "CLOSE" }, 4)).toBe(35);
    expect(resolveRangeFeet({ kind: "CLOSE" }, 20)).toBe(75);
  });

  it("Medium: 100 ft. + 10 ft. per caster level", () => {
    expect(resolveRangeFeet({ kind: "MEDIUM" }, 1)).toBe(110);
    expect(resolveRangeFeet({ kind: "MEDIUM" }, 10)).toBe(200);
  });

  it("Long: 400 ft. + 40 ft. per caster level", () => {
    expect(resolveRangeFeet({ kind: "LONG" }, 1)).toBe(440);
    expect(resolveRangeFeet({ kind: "LONG" }, 10)).toBe(800);
  });

  it("Static: the fixed distance given, clamped to non-negative", () => {
    expect(resolveRangeFeet({ kind: "STATIC", staticFeet: 60 }, 5)).toBe(60);
    expect(resolveRangeFeet({ kind: "STATIC" }, 5)).toBe(0);
    expect(resolveRangeFeet({ kind: "STATIC", staticFeet: -10 }, 5)).toBe(0);
  });

  it("floors fractional levels and treats level < 1 as level 1", () => {
    expect(resolveRangeFeet({ kind: "CLOSE" }, 0)).toBe(25);
    expect(resolveRangeFeet({ kind: "CLOSE" }, -5)).toBe(25);
  });
});

describe("formatRange", () => {
  it("formats Touch with no distance", () => {
    expect(formatRange({ kind: "TOUCH" }, 5)).toBe("Touch");
  });

  it("formats a scaling range with its kind and computed distance", () => {
    expect(formatRange({ kind: "CLOSE" }, 4)).toBe("Close (35 ft.)");
    expect(formatRange({ kind: "MEDIUM" }, 1)).toBe("Medium (110 ft.)");
    expect(formatRange({ kind: "LONG" }, 1)).toBe("Long (440 ft.)");
  });

  it("formats a static range as a plain distance", () => {
    expect(formatRange({ kind: "STATIC", staticFeet: 30 }, 5)).toBe("30 ft.");
  });
});
