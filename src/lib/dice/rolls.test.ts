import { describe, expect, it } from "vitest";

import type { DerivedStats } from "@/lib/rules/types";

import {
  abilityCheckRequest,
  attackRollRequest,
  buildExpression,
  executeRoll,
  initiativeRequest,
  saveRollRequest,
  skillRollRequest,
} from "./rolls";

const derived: DerivedStats = {
  totalLevel: 5,
  abilityScores: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 8 },
  abilityMods: { STR: 3, DEX: 2, CON: 2, INT: 0, WIS: 1, CHA: -1 },
  baseAttackBonus: 5,
  attackSequence: [5],
  meleeAttack: 8,
  rangedAttack: 7,
  cmb: 8,
  cmd: 20,
  ac: 18,
  touchAc: 12,
  flatFootedAc: 16,
  saves: { fort: 6, ref: 3, will: 2 },
  initiative: 2,
  speed: 30,
  maxDexApplied: 2,
  armorCheckPenalty: 4,
  breakdowns: {
    ac: [],
    touchAc: [],
    flatFootedAc: [],
    cmb: [],
    cmd: [],
    meleeAttack: [],
    rangedAttack: [],
    saves: { fort: [], ref: [], will: [] },
    initiative: [],
    speed: [],
    armorCheckPenalty: [],
  },
};

describe("buildExpression", () => {
  it("defaults to a d20 and sums modifiers", () => {
    expect(
      buildExpression({
        kind: "CUSTOM",
        label: "x",
        modifiers: [
          { source: "a", value: 5 },
          { source: "b", value: -2 },
        ],
      }),
    ).toBe("1d20+3");
  });

  it("keeps custom dice", () => {
    expect(
      buildExpression({
        kind: "DAMAGE",
        label: "greatsword",
        dice: "2d6",
        modifiers: [{ source: "STR", value: 4 }],
      }),
    ).toBe("2d6+4");
  });
});

describe("roll builders", () => {
  it("melee attack folds in the derived melee bonus", () => {
    const req = attackRollRequest(derived, {
      which: "melee",
      weaponName: "Longsword",
      weaponBonus: 1,
      situational: [{ source: "flanking", value: 2 }],
    });
    expect(buildExpression(req)).toBe("1d20+11");
    expect(req.label).toBe("Longsword attack");
  });

  it("save / ability / initiative / skill builders", () => {
    expect(buildExpression(saveRollRequest(derived, "will"))).toBe("1d20+2");
    expect(buildExpression(abilityCheckRequest(derived, "STR"))).toBe("1d20+3");
    expect(buildExpression(initiativeRequest(derived))).toBe("1d20+2");
    expect(buildExpression(skillRollRequest("Acrobatics", 9))).toBe("1d20+9");
  });

  it("executeRoll returns a bounded, labelled result", () => {
    const res = executeRoll(saveRollRequest(derived, "fort"));
    expect(res.kind).toBe("SAVE");
    expect(res.label).toBe("Fortitude save");
    expect(res.expression).toBe("1d20+6");
    expect(res.total).toBeGreaterThanOrEqual(7);
    expect(res.total).toBeLessThanOrEqual(26);
  });
});
