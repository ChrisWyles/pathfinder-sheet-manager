import { describe, expect, it } from "vitest";

import {
  abilityBreakdown,
  abilityModifier,
  applyAbilityAdjustments,
  parseAbilityAdjustments,
} from "./abilities";
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

describe("abilityBreakdown", () => {
  it("is just Base when there are no adjustments", () => {
    expect(abilityBreakdown("STR", 10, null)).toEqual([
      { label: "Base", value: 10 },
    ]);
  });

  it("adds one labeled line per nonzero bucket, capitalized, skipping zeros", () => {
    const lines = abilityBreakdown("STR", 10, {
      racial: { STR: 2 },
      enhancement: { STR: 0 },
      inherent: { STR: 4 },
    });
    expect(lines).toEqual([
      { label: "Base", value: 10 },
      { label: "Racial", value: 2 },
      { label: "Inherent", value: 4 },
    ]);
    expect(lines.reduce((s, l) => s + l.value, 0)).toBe(16);
  });

  it("ignores buckets that don't touch this ability", () => {
    const lines = abilityBreakdown("CHA", 10, { racial: { STR: 2 } });
    expect(lines).toEqual([{ label: "Base", value: 10 }]);
  });
});

describe("parseAbilityAdjustments", () => {
  it("returns null for missing/non-object values", () => {
    expect(parseAbilityAdjustments(null)).toBeNull();
    expect(parseAbilityAdjustments(undefined)).toBeNull();
    expect(parseAbilityAdjustments("nope")).toBeNull();
  });

  it("passes through a well-formed adjustments object", () => {
    expect(parseAbilityAdjustments({ racial: { DEX: 2 } })).toEqual({
      racial: { DEX: 2 },
    });
  });
});
