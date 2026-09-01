import type {
  Character,
  CharacterClass,
  InventoryItem,
  Item,
} from "@prisma/client";

import { applyAbilityAdjustments } from "./abilities";
import { computeDerivedStats } from "./derived";
import type {
  AbilityKey,
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

function asAdjustments(
  value: unknown,
): Record<string, Partial<Record<AbilityKey, number>>> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, Partial<Record<AbilityKey, number>>>;
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
  const worn = inventory.find((i) => i.equipped && i.item?.type === type);
  if (!worn?.item) return empty;
  const custom = (worn.customData ?? {}) as Record<string, unknown>;
  const num = (key: string, fallback: number | null) =>
    typeof custom[key] === "number" ? (custom[key] as number) : fallback;
  return {
    acBonus: num("acBonus", worn.item.acBonus ?? 0) ?? 0,
    maxDexBonus: num("maxDexBonus", worn.item.maxDexBonus ?? null),
    armorCheckPenalty:
      num("armorCheckPenalty", worn.item.armorCheckPenalty ?? 0) ?? 0,
  };
}

export function toDerivedInput(c: CharacterForDerivation): DerivedInput {
  const abilityScores = applyAbilityAdjustments(
    baseScores(c),
    asAdjustments(c.abilityModifiers),
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
    modifiers: asTypedModifiers(c.modifiers),
  };
}

export function deriveCharacter(c: CharacterForDerivation): DerivedStats {
  return computeDerivedStats(toDerivedInput(c));
}
