import { abilityModifiers, sumAcModifiers } from "./abilities";
import {
  attackSequenceFromBab,
  totalBab,
  totalBaseSaves,
} from "./progressions";
import { sizeAcAttackModifier, specialSizeModifier } from "./size";
import type { DerivedInput, DerivedStats } from "./types";

/**
 * Compute every derived value on a character sheet from a normalized snapshot.
 * Pure and deterministic — the single source of truth the UI and the dice
 * builders both read from.
 */
export function computeDerivedStats(input: DerivedInput): DerivedStats {
  const mods = abilityModifiers(input.abilityScores);
  const modifiers = input.modifiers ?? {};

  const totalLevel = input.classes.reduce(
    (s, c) => s + Math.max(0, c.levels),
    0,
  );
  const baseAttackBonus = totalBab(input.classes);
  const baseSaves = totalBaseSaves(input.classes);

  const sizeMod = sizeAcAttackModifier(input.size);
  const specialSize = specialSizeModifier(input.size);

  const armor = input.armor ?? {
    acBonus: 0,
    maxDexBonus: null,
    armorCheckPenalty: 0,
  };
  const shield = input.shield ?? { acBonus: 0, armorCheckPenalty: 0 };

  const maxDexApplied =
    armor.maxDexBonus === null
      ? mods.DEX
      : Math.min(mods.DEX, armor.maxDexBonus);

  const dodge = sumAcModifiers(modifiers, "dodge");
  const deflection = sumAcModifiers(modifiers, "deflection");
  const naturalAndMisc = sumAcModifiers(
    modifiers,
    "natural",
    "insight",
    "luck",
    "sacred",
    "profane",
    "misc",
  );

  const ac =
    10 +
    armor.acBonus +
    shield.acBonus +
    maxDexApplied +
    sizeMod +
    dodge +
    deflection +
    naturalAndMisc;
  const touchAc = 10 + maxDexApplied + sizeMod + dodge + deflection;
  const flatFootedAc = ac - Math.max(0, maxDexApplied) - dodge;

  const armorCheckPenalty = armor.armorCheckPenalty + shield.armorCheckPenalty;

  const attackBonusCommon = baseAttackBonus + sizeMod + (modifiers.attack ?? 0);
  const meleeAttack = attackBonusCommon + mods.STR;
  const rangedAttack = attackBonusCommon + mods.DEX;

  const cmb = baseAttackBonus + mods.STR + specialSize + (modifiers.cmb ?? 0);
  const cmd =
    10 +
    baseAttackBonus +
    mods.STR +
    mods.DEX +
    specialSize +
    dodge +
    deflection +
    (modifiers.cmd ?? 0);

  return {
    totalLevel,
    abilityMods: mods,
    baseAttackBonus,
    attackSequence: attackSequenceFromBab(baseAttackBonus),
    meleeAttack,
    rangedAttack,
    cmb,
    cmd,
    ac,
    touchAc,
    flatFootedAc,
    saves: {
      fort: baseSaves.fort + mods.CON + (modifiers.saves?.fort ?? 0),
      ref: baseSaves.ref + mods.DEX + (modifiers.saves?.ref ?? 0),
      will: baseSaves.will + mods.WIS + (modifiers.saves?.will ?? 0),
    },
    initiative: mods.DEX + (modifiers.initiative ?? 0),
    speed: input.baseSpeed + (modifiers.speed ?? 0),
    maxDexApplied,
    armorCheckPenalty,
  };
}
