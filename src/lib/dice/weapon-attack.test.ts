import { describe, expect, it } from "vitest";

import {
  attackIterationOffsets,
  damageExpression,
  isCriticalThreat,
} from "./weapon-attack";
import { rollNotation } from "./roller";

describe("attackIterationOffsets", () => {
  it("returns one 0 offset for a single attack", () => {
    expect(attackIterationOffsets(1)).toEqual([0]);
  });

  it("drops by 5 per attack for a full attack sequence", () => {
    expect(attackIterationOffsets(3)).toEqual([0, -5, -10]);
    expect(attackIterationOffsets(4)).toEqual([0, -5, -10, -15]);
  });

  it("returns an empty array for a non-positive count", () => {
    expect(attackIterationOffsets(0)).toEqual([]);
  });
});

describe("isCriticalThreat", () => {
  it("threatens on a natural 20 when the weapon's crit range is unknown", () => {
    expect(isCriticalThreat(20, null)).toBe(true);
    expect(isCriticalThreat(19, null)).toBe(false);
  });

  it("threatens anywhere in an expanded crit range (e.g. 19-20)", () => {
    expect(isCriticalThreat(19, 19)).toBe(true);
    expect(isCriticalThreat(20, 19)).toBe(true);
    expect(isCriticalThreat(18, 19)).toBe(false);
  });
});

describe("damageExpression", () => {
  it("builds a plain damage roll with the ability mod folded in", () => {
    expect(damageExpression("1d8", 3, false, 2)).toBe("1d8+3");
    expect(damageExpression("1d6", -1, false, 2)).toBe("1d6-1");
    expect(damageExpression("2d6", 0, false, 2)).toBe("2d6");
  });

  it("wraps and multiplies the whole roll on a crit", () => {
    expect(damageExpression("1d8", 3, true, 2)).toBe("(1d8+3)*2");
    expect(damageExpression("1d6", 2, true, 3)).toBe("(1d6+2)*3");
  });

  it("defaults the crit multiplier to x2 when unknown", () => {
    expect(damageExpression("1d8", 3, true, null)).toBe("(1d8+3)*2");
  });

  it("produces notation the dice roller actually accepts", () => {
    const expr = damageExpression("1d8", 3, true, 2);
    const outcome = rollNotation(expr);
    expect(outcome.total).toBeGreaterThanOrEqual(8); // (1+3)*2
    expect(outcome.total).toBeLessThanOrEqual(22); // (8+3)*2
  });
});
