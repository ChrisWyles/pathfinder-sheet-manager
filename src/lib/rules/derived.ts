import { abilityModifiers, sumAcModifiers } from "./abilities";
import {
  attackSequenceFromBab,
  totalBab,
  totalBaseSaves,
} from "./progressions";
import { sizeAcAttackModifier, specialSizeModifier } from "./size";
import type { DerivedInput, DerivedStats, StatBreakdownLine } from "./types";

function line(label: string, value: number): StatBreakdownLine {
  return { label, value };
}

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
  const meleeAttack =
    attackBonusCommon + mods.STR + (input.meleeAttackBonus ?? 0);
  const rangedAttack =
    attackBonusCommon + mods.DEX + (input.rangedAttackBonus ?? 0);

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

  const fort = baseSaves.fort + mods.CON + (modifiers.saves?.fort ?? 0);
  const ref = baseSaves.ref + mods.DEX + (modifiers.saves?.ref ?? 0);
  const will = baseSaves.will + mods.WIS + (modifiers.saves?.will ?? 0);
  const initiative = mods.DEX + (modifiers.initiative ?? 0);
  const speed = input.baseSpeed + (modifiers.speed ?? 0);

  // Only the positive part of Dex applies to flat-footed AC — a Dex penalty
  // still does (you're not any less clumsy for being caught flat-footed).
  const flatFootedDex = Math.min(0, maxDexApplied);

  const breakdowns = {
    ac: [
      line("Base", 10),
      line("Armor", armor.acBonus),
      line("Shield", shield.acBonus),
      line("Dex", maxDexApplied),
      line("Size", sizeMod),
      line("Dodge", dodge),
      line("Deflection", deflection),
      line("Natural/other", naturalAndMisc),
    ],
    touchAc: [
      line("Base", 10),
      line("Dex", maxDexApplied),
      line("Size", sizeMod),
      line("Dodge", dodge),
      line("Deflection", deflection),
    ],
    flatFootedAc: [
      line("Base", 10),
      line("Armor", armor.acBonus),
      line("Shield", shield.acBonus),
      line("Size", sizeMod),
      line("Deflection", deflection),
      line("Natural/other", naturalAndMisc),
      ...(flatFootedDex !== 0 ? [line("Dex penalty", flatFootedDex)] : []),
    ],
    cmb: [
      line("Base attack bonus", baseAttackBonus),
      line("Str", mods.STR),
      line("Size", specialSize),
      line("Other", modifiers.cmb ?? 0),
    ],
    cmd: [
      line("Base", 10),
      line("Base attack bonus", baseAttackBonus),
      line("Str", mods.STR),
      line("Dex", mods.DEX),
      line("Size", specialSize),
      line("Dodge", dodge),
      line("Deflection", deflection),
      line("Other", modifiers.cmd ?? 0),
    ],
    meleeAttack: [
      line("Base attack bonus", baseAttackBonus),
      line("Str", mods.STR),
      line("Size", sizeMod),
      line("Equipment", input.meleeAttackBonus ?? 0),
      line("Other", modifiers.attack ?? 0),
    ],
    rangedAttack: [
      line("Base attack bonus", baseAttackBonus),
      line("Dex", mods.DEX),
      line("Size", sizeMod),
      line("Equipment", input.rangedAttackBonus ?? 0),
      line("Other", modifiers.attack ?? 0),
    ],
    saves: {
      fort: [
        line("Base", baseSaves.fort),
        line("Con", mods.CON),
        line("Other", modifiers.saves?.fort ?? 0),
      ],
      ref: [
        line("Base", baseSaves.ref),
        line("Dex", mods.DEX),
        line("Other", modifiers.saves?.ref ?? 0),
      ],
      will: [
        line("Base", baseSaves.will),
        line("Wis", mods.WIS),
        line("Other", modifiers.saves?.will ?? 0),
      ],
    },
    initiative: [
      line("Dex", mods.DEX),
      line("Other", modifiers.initiative ?? 0),
    ],
    speed: [
      line("Base", input.baseSpeed),
      line("Other", modifiers.speed ?? 0),
    ],
    armorCheckPenalty: [
      line("Armor", armor.armorCheckPenalty),
      line("Shield", shield.armorCheckPenalty),
    ],
  };

  return {
    totalLevel,
    abilityScores: input.abilityScores,
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
    saves: { fort, ref, will },
    initiative,
    speed,
    maxDexApplied,
    armorCheckPenalty,
    breakdowns,
  };
}
