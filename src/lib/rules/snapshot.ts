import type {
  Character,
  CharacterClass,
  InventoryItem,
  Item,
} from "@prisma/client";

import { applyAbilityAdjustments, parseAbilityAdjustments } from "./abilities";
import { computeDerivedStats } from "./derived";
import { effectiveItemType, resolveItemStats } from "./inventory-item";
import type {
  AbilityScores,
  ArmorContribution,
  DerivedInput,
  DerivedStats,
  TypedModifiers,
} from "./types";

export type CharacterForDerivation = Character & {
  classes: CharacterClass[];
  inventory: (InventoryItem & { item: Item | null })[];
};

function baseScores(c: Character): AbilityScores {
  return {
    STR: c.strength,
    DEX: c.dexterity,
    CON: c.constitution,
    INT: c.intelligence,
    WIS: c.wisdom,
    CHA: c.charisma,
  };
}

function asTypedModifiers(value: unknown): TypedModifiers {
  if (!value || typeof value !== "object") return {};
  return value as TypedModifiers;
}

function armorFromInventory(
  inventory: CharacterForDerivation["inventory"],
  type: "ARMOR" | "SHIELD",
): ArmorContribution {
  const empty: ArmorContribution = {
    acBonus: 0,
    maxDexBonus: null,
    armorCheckPenalty: 0,
  };
  const worn = inventory.find(
    (i) => i.equipped && effectiveItemType(i) === type,
  );
  if (!worn) return empty;
  const stats = resolveItemStats(worn);
  return {
    acBonus: stats.acBonus,
    maxDexBonus: stats.maxDexBonus,
    // Masterwork armor/shields reduce the check penalty by 1.
    armorCheckPenalty: worn.masterwork
      ? Math.max(0, stats.armorCheckPenalty - 1)
      : stats.armorCheckPenalty,
  };
}

/** +1 to attack from an equipped masterwork weapon of the given reach —
 * ranged if it has a range increment, melee otherwise (thrown weapons with
 * a range increment count as ranged, matching the sheet's single
 * melee/ranged attack values). */
function masterworkWeaponBonus(
  inventory: CharacterForDerivation["inventory"],
  which: "melee" | "ranged",
): number {
  const hasMasterwork = inventory.some((i) => {
    if (!i.equipped || !i.masterwork || effectiveItemType(i) !== "WEAPON") {
      return false;
    }
    const rangeIncrement = resolveItemStats(i).rangeIncrement;
    return which === "ranged" ? rangeIncrement != null : rangeIncrement == null;
  });
  return hasMasterwork ? 1 : 0;
}

export function toDerivedInput(c: CharacterForDerivation): DerivedInput {
  const abilityScores = applyAbilityAdjustments(
    baseScores(c),
    parseAbilityAdjustments(c.abilityModifiers),
  );

  const armor = armorFromInventory(c.inventory, "ARMOR");
  const shield = armorFromInventory(c.inventory, "SHIELD");

  return {
    size: c.size,
    baseSpeed: c.baseSpeed,
    abilityScores,
    classes: c.classes.map((cl) => ({
      levels: cl.levels,
      babProgression: cl.babProgression,
      fortProgression: cl.fortProgression,
      refProgression: cl.refProgression,
      willProgression: cl.willProgression,
    })),
    armor,
    shield: {
      acBonus: shield.acBonus,
      armorCheckPenalty: shield.armorCheckPenalty,
    },
    meleeAttackBonus: masterworkWeaponBonus(c.inventory, "melee"),
    rangedAttackBonus: masterworkWeaponBonus(c.inventory, "ranged"),
    modifiers: asTypedModifiers(c.modifiers),
  };
}

export function deriveCharacter(c: CharacterForDerivation): DerivedStats {
  return computeDerivedStats(toDerivedInput(c));
}
