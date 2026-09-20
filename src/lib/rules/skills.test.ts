import { describe, expect, it } from "vitest";

import { computeSkillTotal, findSkillTotal } from "./skills";
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
      { name: "Knowledge (arcana)", keyAbility: "INT", ranks: 1, isClassSkill: true },
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(withRanks).toBe(1 + 3 + 2); // ranks + class + INT mod

    const noRanks = computeSkillTotal(
      { name: "Knowledge (arcana)", keyAbility: "INT", ranks: 0, isClassSkill: true },
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(noRanks).toBe(2); // just the INT mod
  });

  it("subtracts armor check penalty for affected skills", () => {
    const total = computeSkillTotal(
      {
        name: "Acrobatics",
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
      { name: "Acrobatics", keyAbility: "DEX", ranks: 5, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 4 },
    );
    expect(total).toBe(5 + 3);
  });

  it("applies the size modifier to Stealth", () => {
    const small = computeSkillTotal(
      { name: "Stealth", keyAbility: "DEX", ranks: 0, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 0, size: "SMALL" },
    );
    const large = computeSkillTotal(
      { name: "Stealth", keyAbility: "DEX", ranks: 0, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 0, size: "LARGE" },
    );
    expect(small).toBe(3 + 4); // DEX mod + Small Stealth bonus
    expect(large).toBe(3 - 4); // DEX mod + Large Stealth penalty
  });

  it("applies the (smaller) size modifier to Fly, and none to unrelated skills", () => {
    const fly = computeSkillTotal(
      { name: "Fly", keyAbility: "DEX", ranks: 0, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 0, size: "SMALL" },
    );
    expect(fly).toBe(3 + 2);

    const climb = computeSkillTotal(
      { name: "Climb", keyAbility: "STR", ranks: 0, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 0, size: "SMALL" },
    );
    expect(climb).toBe(1); // STR mod only — Climb has no size modifier
  });

  it("defaults to no size modifier when size is omitted", () => {
    const total = computeSkillTotal(
      { name: "Stealth", keyAbility: "DEX", ranks: 0, isClassSkill: false },
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(total).toBe(3);
  });
});

describe("findSkillTotal", () => {
  it("computes the total from the character's own rank row when one exists", () => {
    const total = findSkillTotal(
      "Bluff",
      "CHA",
      [
        {
          ranks: 4,
          isClassSkill: true,
          miscMod: 0,
          skill: { name: "Bluff", keyAbility: "CHA", armorCheckPenalty: false },
        },
      ],
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(total).toBe(4 + 3 - 1); // ranks + class - CHA mod (8 -> -1)
  });

  it("matches the skill name case-insensitively", () => {
    const total = findSkillTotal(
      "bluff",
      "CHA",
      [
        {
          ranks: 2,
          isClassSkill: false,
          miscMod: 0,
          skill: { name: "Bluff", keyAbility: "CHA", armorCheckPenalty: false },
        },
      ],
      { abilityScores: scores, armorCheckPenalty: 0 },
    );
    expect(total).toBe(2 - 1);
  });

  it("falls back to untrained (just the ability mod) when there's no rank row", () => {
    const total = findSkillTotal("Bluff", "CHA", [], {
      abilityScores: scores,
      armorCheckPenalty: 0,
    });
    expect(total).toBe(-1); // CHA mod only, 0 ranks, not a class skill
  });
});
