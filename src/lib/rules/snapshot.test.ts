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
