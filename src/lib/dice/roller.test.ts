import { describe, expect, it } from "vitest";

import { InvalidDiceNotationError, rollNotation, signed } from "./roller";

describe("signed", () => {
  it("formats modifiers", () => {
    expect(signed(0)).toBe("");
    expect(signed(3)).toBe("+3");
    expect(signed(-2)).toBe("-2");
  });
});

describe("rollNotation", () => {
  it("rolls within the theoretical bounds", () => {
    for (let i = 0; i < 200; i++) {
      const r = rollNotation("1d20+7");
      expect(r.total).toBeGreaterThanOrEqual(8);
      expect(r.total).toBeLessThanOrEqual(27);
      expect(r.dice).toHaveLength(1);
      expect(r.dice[0]).toBeGreaterThanOrEqual(1);
      expect(r.dice[0]).toBeLessThanOrEqual(20);
    }
  });

  it("reports min and max totals", () => {
    const r = rollNotation("2d6+3");
    expect(r.minTotal).toBe(5);
    expect(r.maxTotal).toBe(15);
    expect(r.dice).toHaveLength(2);
  });

  it("supports keep-highest notation", () => {
    const r = rollNotation("4d6kh3");
    expect(r.total).toBeGreaterThanOrEqual(3);
    expect(r.total).toBeLessThanOrEqual(18);
  });

  it("rejects unsafe input", () => {
    expect(() => rollNotation("1d20; DROP TABLE")).toThrow(
      InvalidDiceNotationError,
    );
    expect(() => rollNotation("")).toThrow(InvalidDiceNotationError);
    expect(() => rollNotation("alert(1)")).toThrow(InvalidDiceNotationError);
  });
});
