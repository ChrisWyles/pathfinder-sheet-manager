import { describe, expect, it } from "vitest";

import { abilityModifier, applyAbilityAdjustments } from "./abilities";
import type { AbilityScores } from "./types";

const base: AbilityScores = {
  STR: 10,
  DEX: 14,
  CON: 12,
  INT: 8,
  WIS: 13,
  CHA: 10,
};

describe("abilityModifier", () => {
  it("matches the Pathfinder table", () => {
    expect(abilityModifier(1)).toBe(-5);
    expect(abilityModifier(7)).toBe(-2);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(18)).toBe(4);
    expect(abilityModifier(24)).toBe(7);
  });
});

describe("applyAbilityAdjustments", () => {
  it("returns a copy when there are no adjustments", () => {
    const result = applyAbilityAdjustments(base, null);
    expect(result).toEqual(base);
    expect(result).not.toBe(base);
  });

  it("sums adjustments from every source", () => {
    const result = applyAbilityAdjustments(base, {
      racial: { STR: 2, INT: -2 },
      enhancement: { STR: 4 },
      inherent: { CON: 1 },
    });
    expect(result.STR).toBe(16);
    expect(result.INT).toBe(6);
    expect(result.CON).toBe(13);
    expect(result.DEX).toBe(14);
  });
});
