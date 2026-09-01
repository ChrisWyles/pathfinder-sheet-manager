import { describe, expect, it } from "vitest";

import { computeDerivedStats } from "./derived";
import type { DerivedInput } from "./types";

describe("computeDerivedStats", () => {
  it("computes a level 5 human fighter in a chain shirt and heavy shield", () => {
    const input: DerivedInput = {
      size: "MEDIUM",
      baseSpeed: 30,
      abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 8 },
      classes: [
        {
          levels: 5,
          babProgression: "FULL",
          fortProgression: "GOOD",
          refProgression: "POOR",
          willProgression: "POOR",
        },
      ],
      armor: { acBonus: 4, maxDexBonus: 4, armorCheckPenalty: 2 },
      shield: { acBonus: 2, armorCheckPenalty: 2 },
    };

    const d = computeDerivedStats(input);

    expect(d.totalLevel).toBe(5);
    expect(d.baseAttackBonus).toBe(5);
    expect(d.attackSequence).toEqual([5]);
    expect(d.meleeAttack).toBe(8);
    expect(d.rangedAttack).toBe(7);
    expect(d.cmb).toBe(8);
    expect(d.cmd).toBe(20);
    expect(d.ac).toBe(18);
    expect(d.touchAc).toBe(12);
    expect(d.flatFootedAc).toBe(16);
    expect(d.saves).toEqual({ fort: 6, ref: 3, will: 2 });
    expect(d.initiative).toBe(2);
    expect(d.speed).toBe(30);
    expect(d.armorCheckPenalty).toBe(4);
  });

  it("applies size and typed modifiers for a large barbarian", () => {
    const input: DerivedInput = {
      size: "LARGE",
      baseSpeed: 40,
      abilityScores: { STR: 20, DEX: 12, CON: 16, INT: 10, WIS: 10, CHA: 10 },
      classes: [
        {
          levels: 8,
          babProgression: "FULL",
          fortProgression: "GOOD",
          refProgression: "POOR",
          willProgression: "POOR",
        },
      ],
      armor: { acBonus: 4, maxDexBonus: 4, armorCheckPenalty: 3 },
      modifiers: {
        ac: { natural: 2, deflection: 1, dodge: 1 },
        saves: { fort: 1 },
        attack: 1,
        initiative: 4,
      },
    };

    const d = computeDerivedStats(input);

    expect(d.baseAttackBonus).toBe(8);
    expect(d.attackSequence).toEqual([8, 3]);
    expect(d.meleeAttack).toBe(13);
    expect(d.rangedAttack).toBe(9);
    expect(d.cmb).toBe(14);
    expect(d.cmd).toBe(27);
    expect(d.ac).toBe(18);
    expect(d.touchAc).toBe(12);
    expect(d.flatFootedAc).toBe(16);
    expect(d.saves).toEqual({ fort: 10, ref: 3, will: 2 });
    expect(d.initiative).toBe(5);
    expect(d.speed).toBe(40);
  });

  it("caps Dexterity to AC by the armor's max Dex bonus", () => {
    const d = computeDerivedStats({
      size: "MEDIUM",
      baseSpeed: 30,
      abilityScores: { STR: 10, DEX: 20, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      classes: [
        {
          levels: 1,
          babProgression: "THREE_QUARTER",
          fortProgression: "POOR",
          refProgression: "GOOD",
          willProgression: "GOOD",
        },
      ],
      armor: { acBonus: 9, maxDexBonus: 1, armorCheckPenalty: 6 },
    });
    // Dex mod is +5 but full-plate caps it at +1.
    expect(d.maxDexApplied).toBe(1);
    expect(d.ac).toBe(20);
    expect(d.touchAc).toBe(11);
  });
});
