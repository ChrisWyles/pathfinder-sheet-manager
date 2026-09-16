import { describe, expect, it } from "vitest";

import {
  classSkillSet,
  estimateStartingHp,
  featSlotCount,
  maxRanksPerSkill,
  pointBuyTotal,
  roll4d6DropLowest,
  rollAbilitySet,
  skillRanksBudget,
  startingWealth,
  STANDARD_ARRAY,
} from "./creation";

/** Deterministic RNG: cycles through the given [0,1) values. */
function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("point buy", () => {
  it("prices the standard array at the classic 15 points", () => {
    expect(pointBuyTotal(STANDARD_ARRAY)).toBe(15);
  });

  it("prices an all-10 array at 0", () => {
    expect(
      pointBuyTotal({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }),
    ).toBe(0);
  });

  it("charges the premium above 13 and refunds below 10", () => {
    expect(
      pointBuyTotal({ STR: 18, DEX: 7, CON: 10, INT: 10, WIS: 10, CHA: 10 }),
    ).toBe(17 - 4);
  });
});

describe("ability rolls", () => {
  it("drops the lowest of four dice", () => {
    // rolls 1, 2, 3, 4 -> keep 2 + 3 + 4 = 9
    const rng = seededRng([0 / 6, 1 / 6, 2 / 6, 3 / 6]);
    expect(roll4d6DropLowest(rng)).toBe(9);
  });

  it("returns six values sorted high to low", () => {
    const set = rollAbilitySet(seededRng([0.1, 0.5, 0.9, 0.3, 0.7, 0.2]));
    expect(set).toHaveLength(6);
    expect([...set].sort((a, b) => b - a)).toEqual(set);
    for (const v of set) {
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(18);
    }
  });
});

describe("skillRanksBudget", () => {
  it("applies the minimum of 1 rank per level before the human bonus", () => {
    // class 2/level, Int -3 -> max(1, -1) = 1, +1 human = 2/level, ×3 = 6
    expect(
      skillRanksBudget({
        classRanksPerLevel: 2,
        intMod: -3,
        level: 3,
        human: true,
      }),
    ).toBe(6);
  });

  it("adds Int modifier and favored-class ranks", () => {
    // (6 + 2) × 5 = 40, +2 favored = 42
    expect(
      skillRanksBudget({
        classRanksPerLevel: 6,
        intMod: 2,
        level: 5,
        favoredRanks: 2,
      }),
    ).toBe(42);
  });
});

describe("maxRanksPerSkill", () => {
  it("equals character level", () => {
    expect(maxRanksPerSkill(1)).toBe(1);
    expect(maxRanksPerSkill(7)).toBe(7);
  });
});

describe("featSlotCount", () => {
  it("gives one feat at 1st and every odd level", () => {
    expect(featSlotCount({ level: 1 })).toBe(1);
    expect(featSlotCount({ level: 5 })).toBe(3);
    expect(featSlotCount({ level: 6 })).toBe(3);
  });

  it("adds one for humans", () => {
    expect(featSlotCount({ level: 1, human: true })).toBe(2);
  });
});

describe("classSkillSet", () => {
  const all = [
    "Acrobatics",
    "Knowledge (arcana)",
    "Knowledge (nature)",
    "Knowledge (planes)",
    "Spellcraft",
  ];

  it("expands a grouped 'Knowledge (all)' entry", () => {
    const set = classSkillSet(["Knowledge (all)", "Spellcraft"], all);
    expect(set.has("knowledge (arcana)")).toBe(true);
    expect(set.has("knowledge (planes)")).toBe(true);
    expect(set.has("spellcraft")).toBe(true);
    expect(set.has("acrobatics")).toBe(false);
  });

  it("matches a specific skill by name", () => {
    const set = classSkillSet(["Acrobatics"], all);
    expect([...set]).toEqual(["acrobatics"]);
  });
});

describe("startingWealth", () => {
  it("looks up a core class", () => {
    expect(startingWealth("Fighter").avg).toBe(175);
  });

  it("strips a (Spheres) suffix and falls back to the group", () => {
    expect(startingWealth("Incanter (Spheres)", "spherecaster").avg).toBe(70);
  });

  it("uses the generic fallback when nothing matches", () => {
    expect(startingWealth("Homebrew Thing", null).avg).toBe(105);
  });
});

describe("estimateStartingHp", () => {
  it("takes the full hit die at level 1", () => {
    expect(estimateStartingHp(10, 1, 2)).toBe(12);
  });

  it("adds the class average per level after 1st plus Con each level", () => {
    // d8: L1 = 8, L2/L3 average 5 each -> 18, + Con(1)×3 = 21
    expect(estimateStartingHp(8, 3, 1)).toBe(21);
  });

  it("never drops below 1", () => {
    expect(estimateStartingHp(6, 1, -5)).toBe(1);
  });
});
