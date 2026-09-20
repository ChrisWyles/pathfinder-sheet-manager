import type { ArmorCategory, Item, ItemType, WeaponCategory } from "@prisma/client";

/** The subset of InventoryItem fields every helper here needs — works for
 * both the Prisma row shape and lightweight test fixtures. */
export interface InventoryItemLike {
  item: Item | null;
  customData: unknown;
}

export interface ItemEffect {
  id: string;
  name: string;
  description: string;
}

/** Fields a fully custom (no catalog `item`) inventory entry stores in its
 * `customData` JSON — same shape as the relevant slice of the catalog
 * `Item` model, so both feed the same resolver below. */
export interface CustomItemStats {
  type?: ItemType;
  description?: string;
  weaponCategory?: WeaponCategory;
  damage?: string;
  damageType?: string;
  critRange?: number;
  critMultiplier?: number;
  rangeIncrement?: number | null;
  armorCategory?: ArmorCategory;
  acBonus?: number;
  maxDexBonus?: number | null;
  armorCheckPenalty?: number;
  spellFailure?: number;
  /** Special weapon properties, e.g. "trip, monk, fragile". */
  special?: string;
}

export interface ResolvedItemStats {
  type: ItemType | null;
  description: string;
  weaponCategory: WeaponCategory | null;
  damage: string | null;
  damageType: string | null;
  critRange: number | null;
  critMultiplier: number | null;
  rangeIncrement: number | null;
  armorCategory: ArmorCategory | null;
  acBonus: number;
  maxDexBonus: number | null;
  armorCheckPenalty: number;
  spellFailure: number;
  special: string;
}

function asCustomStats(customData: unknown): CustomItemStats {
  if (!customData || typeof customData !== "object") return {};
  return customData as CustomItemStats;
}

/** The scraper stores per-weapon "special properties" text in the catalog
 * Item's freeform `data` JSON (rather than a dedicated column) — "—" is its
 * placeholder for "none", which we normalize away to an empty string. */
function specialFromItemData(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const special = (data as { special?: unknown }).special;
  if (typeof special !== "string") return "";
  return special.trim() === "—" ? "" : special.trim();
}

/** WEAPON/ARMOR/SHIELD/etc for a row that may or may not link to a catalog
 * Item — custom entries carry their type in `customData.type`. */
export function effectiveItemType(inv: InventoryItemLike): ItemType | null {
  return inv.item?.type ?? asCustomStats(inv.customData).type ?? null;
}

/** Resolves an inventory row's full stat block: catalog `item` values,
 * overridden field-by-field by anything set in `customData` — the same
 * mechanism serves per-instance overrides on a catalog item AND fully
 * custom items (which have no `item` to fall back on at all). */
export function resolveItemStats(inv: InventoryItemLike): ResolvedItemStats {
  const custom = asCustomStats(inv.customData);
  const item = inv.item;

  return {
    type: custom.type ?? item?.type ?? null,
    description: custom.description ?? item?.description ?? "",
    weaponCategory: custom.weaponCategory ?? item?.weaponCategory ?? null,
    damage: custom.damage ?? item?.damage ?? null,
    damageType: custom.damageType ?? item?.damageType ?? null,
    critRange: custom.critRange ?? item?.critRange ?? null,
    critMultiplier: custom.critMultiplier ?? item?.critMultiplier ?? null,
    rangeIncrement:
      custom.rangeIncrement !== undefined
        ? custom.rangeIncrement
        : (item?.rangeIncrement ?? null),
    armorCategory: custom.armorCategory ?? item?.armorCategory ?? null,
    acBonus: custom.acBonus ?? item?.acBonus ?? 0,
    maxDexBonus:
      custom.maxDexBonus !== undefined
        ? custom.maxDexBonus
        : (item?.maxDexBonus ?? null),
    armorCheckPenalty: custom.armorCheckPenalty ?? item?.armorCheckPenalty ?? 0,
    spellFailure: custom.spellFailure ?? item?.spellFailure ?? 0,
    special: custom.special ?? specialFromItemData(item?.data),
  };
}

/** Formats a critical hit spread ("19-20/x2", "x3") from separate range/
 * multiplier fields, or null when neither is set (e.g. armor). */
export function formatCritical(
  critRange: number | null,
  critMultiplier: number | null,
): string | null {
  if (critRange == null && critMultiplier == null) return null;
  const range = critRange != null && critRange < 20 ? `${critRange}-20/` : "";
  return `${range}x${critMultiplier ?? 2}`;
}

export function readEffects(effects: unknown): ItemEffect[] {
  if (!Array.isArray(effects)) return [];
  return effects.filter(
    (e): e is ItemEffect =>
      !!e &&
      typeof e === "object" &&
      typeof (e as ItemEffect).id === "string" &&
      typeof (e as ItemEffect).name === "string",
  );
}
