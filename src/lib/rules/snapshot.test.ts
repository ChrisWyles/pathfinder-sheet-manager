import { describe, expect, it } from "vitest";

import { deriveCharacter, type CharacterForDerivation } from "./snapshot";

/** A minimal character; only the fields the derivation reads matter here. */
function character(
  overrides: Partial<CharacterForDerivation> = {},
): CharacterForDerivation {
  return {
    strength: 10,
    dexterity: 12,
    constitution: 14,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    abilityModifiers: {},
    modifiers: {},
    size: "MEDIUM",
    baseSpeed: 30,
    classes: [
      {
        levels: 1,
        babProgression: "THREE_QUARTER",
        fortProgression: "POOR",
        refProgression: "POOR",
        willProgression: "GOOD",
      },
    ],
    inventory: [],
    ...overrides,
  } as unknown as CharacterForDerivation;
}

describe("deriveCharacter — racial ability adjustments", () => {
  it("folds racial adjustments into the effective score and every downstream stat", () => {
    const elf = character({
      dexterity: 14,
      constitution: 14,
      intelligence: 13,
      // Elf: +2 Dex, +2 Int, -2 Con
      abilityModifiers: { racial: { DEX: 2, INT: 2, CON: -2 } },
    });

    const d = deriveCharacter(elf);

    expect(d.abilityScores.DEX).toBe(16); // 14 + 2
    expect(d.abilityScores.CON).toBe(12); // 14 - 2
    expect(d.abilityScores.INT).toBe(15); // 13 + 2
    expect(d.abilityMods.DEX).toBe(3);
    expect(d.abilityMods.CON).toBe(1);
    expect(d.initiative).toBe(3); // Dex mod
  });

  it("leaves scores untouched when there are no adjustments", () => {
    const d = deriveCharacter(character());
    expect(d.abilityScores).toEqual({
      STR: 10,
      DEX: 12,
      CON: 14,
      INT: 10,
      WIS: 10,
      CHA: 10,
    });
  });

  it("sums multiple adjustment buckets (racial + enhancement)", () => {
    const d = deriveCharacter(
      character({
        strength: 12,
        abilityModifiers: {
          racial: { STR: 2 },
          enhancement: { STR: 2 },
        },
      }),
    );
    expect(d.abilityScores.STR).toBe(16);
    expect(d.abilityMods.STR).toBe(3);
  });
});

/** Inventory rows only need the fields deriveCharacter actually reads. */
function inventory(
  items: {
    equipped: boolean;
    masterwork: boolean;
    item?: Record<string, unknown> | null;
    customData?: Record<string, unknown>;
  }[],
): CharacterForDerivation["inventory"] {
  return items.map((i) => ({
    item: null,
    customData: {},
    ...i,
  })) as unknown as CharacterForDerivation["inventory"];
}

describe("deriveCharacter — masterwork equipment", () => {
  it("reduces armor check penalty by 1 for masterwork armor, floored at 0", () => {
    const withoutMasterwork = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: false,
          item: { type: "ARMOR", acBonus: 2, maxDexBonus: 6, armorCheckPenalty: 1 },
        },
      ]),
    });
    const withMasterwork = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: true,
          item: { type: "ARMOR", acBonus: 2, maxDexBonus: 6, armorCheckPenalty: 1 },
        },
      ]),
    });
    const floored = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: true,
          item: { type: "ARMOR", acBonus: 2, maxDexBonus: 6, armorCheckPenalty: 0 },
        },
      ]),
    });

    expect(deriveCharacter(withoutMasterwork).armorCheckPenalty).toBe(1);
    expect(deriveCharacter(withMasterwork).armorCheckPenalty).toBe(0);
    expect(deriveCharacter(floored).armorCheckPenalty).toBe(0);
  });

  it("gives +1 attack from an equipped masterwork weapon, melee vs ranged by range increment", () => {
    const meleeWeapon = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: true,
          item: { type: "WEAPON", rangeIncrement: null },
        },
      ]),
    });
    const rangedWeapon = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: true,
          item: { type: "WEAPON", rangeIncrement: 80 },
        },
      ]),
    });
    const unequippedMasterwork = character({
      inventory: inventory([
        {
          equipped: false,
          masterwork: true,
          item: { type: "WEAPON", rangeIncrement: null },
        },
      ]),
    });

    const baseline = deriveCharacter(character());
    const melee = deriveCharacter(meleeWeapon);
    const ranged = deriveCharacter(rangedWeapon);
    const unequipped = deriveCharacter(unequippedMasterwork);

    expect(melee.meleeAttack).toBe(baseline.meleeAttack + 1);
    expect(melee.rangedAttack).toBe(baseline.rangedAttack);
    expect(ranged.rangedAttack).toBe(baseline.rangedAttack + 1);
    expect(ranged.meleeAttack).toBe(baseline.meleeAttack);
    expect(unequipped.meleeAttack).toBe(baseline.meleeAttack);
  });

  it("applies a fully custom (no catalog item) equipped armor's stats too", () => {
    const withCustomArmor = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: true,
          customData: {
            type: "ARMOR",
            acBonus: 3,
            maxDexBonus: 4,
            armorCheckPenalty: 2,
          },
        },
      ]),
    });

    const d = deriveCharacter(withCustomArmor);
    expect(d.ac).toBe(deriveCharacter(character()).ac + 3);
    // Masterwork custom armor still gets the -1 check penalty.
    expect(d.armorCheckPenalty).toBe(1);
  });

  it("gives +1 attack from a fully custom masterwork weapon", () => {
    const withCustomWeapon = character({
      inventory: inventory([
        {
          equipped: true,
          masterwork: true,
          customData: { type: "WEAPON", rangeIncrement: null },
        },
      ]),
    });

    const baseline = deriveCharacter(character());
    const d = deriveCharacter(withCustomWeapon);
    expect(d.meleeAttack).toBe(baseline.meleeAttack + 1);
  });
});
