import { describe, expect, it } from "vitest";

import { computeSkillTotal } from "./skills";
import type { AbilityScores } from "./types";

const scores: AbilityScores = {
  STR: 12,
  DEX: 16,
  CON: 10,
  INT: 14,
  WIS: 10,
  CHA: 8,
};

describe("computeSkillTotal", () => {
  it("adds the +3 class-skill bonus only with at least one rank", () => {
    const withRanks = computeSkillTotal(
      { keyAbility: "INT", ranks: 1, isClassSkill: true },
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(withRanks).toBe(1 + 3 + 2); // ranks + class + INT mod

    const noRanks = computeSkillTotal(
      { keyAbility: "INT", ranks: 0, isClassSkill: true },
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(noRanks).toBe(2); // just the INT mod
  });

  it("subtracts armor check penalty for affected skills", () => {
    const total = computeSkillTotal(
      {
        keyAbility: "DEX",
        ranks: 5,
        isClassSkill: true,
        miscMod: 2,
        usesArmorCheckPenalty: true,
      },
      { abilityScores: scores, armorCheckPenalty: 4 },
    );
    expect(total).toBe(5 + 3 + 3 + 2 - 4); // ranks + class + DEX + misc - ACP
  });

  it("ignores armor check penalty for unaffected skills", () => {
    const total = computeSkillTotal(
      { keyAbility: "DEX", ranks: 5, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 4 },
    );
    expect(total).toBe(5 + 3);
  });
});
