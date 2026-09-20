import { describe, expect, it } from "vitest";

import {
  effectiveItemType,
  readEffects,
  resolveItemStats,
  type InventoryItemLike,
} from "./inventory-item";

function catalogItem(overrides: Record<string, unknown> = {}) {
  return {
    type: "WEAPON",
    description: "",
    weaponCategory: "MARTIAL",
    damage: "1d8",
    damageType: "S",
    critRange: 19,
    critMultiplier: 2,
    rangeIncrement: null,
    armorCategory: null,
    acBonus: 0,
    maxDexBonus: null,
    armorCheckPenalty: 0,
    spellFailure: 0,
    ...overrides,
  } as unknown as InventoryItemLike["item"];
}

describe("effectiveItemType", () => {
  it("uses the catalog item's type when present", () => {
    expect(
      effectiveItemType({ item: catalogItem({ type: "ARMOR" }), customData: {} }),
    ).toBe("ARMOR");
  });

  it("falls back to customData.type for a fully custom item", () => {
    expect(
      effectiveItemType({ item: null, customData: { type: "SHIELD" } }),
    ).toBe("SHIELD");
  });

  it("is null when neither is set", () => {
    expect(effectiveItemType({ item: null, customData: {} })).toBeNull();
  });
});

describe("resolveItemStats", () => {
  it("reads straight from the catalog item when there's no override", () => {
    const stats = resolveItemStats({
      item: catalogItem({ damage: "2d6", critMultiplier: 3 }),
      customData: {},
    });
    expect(stats.damage).toBe("2d6");
    expect(stats.critMultiplier).toBe(3);
  });

  it("lets customData override individual catalog fields", () => {
    const stats = resolveItemStats({
      item: catalogItem({ acBonus: 2, armorCheckPenalty: 3 }),
      customData: { acBonus: 5 },
    });
    expect(stats.acBonus).toBe(5);
    expect(stats.armorCheckPenalty).toBe(3);
  });

  it("computes a full stat block for a fully custom item from customData alone", () => {
    const stats = resolveItemStats({
      item: null,
      customData: {
        type: "ARMOR",
        acBonus: 4,
        maxDexBonus: 3,
        armorCheckPenalty: 2,
        spellFailure: 20,
        description: "A patchwork breastplate.",
      },
    });
    expect(stats.type).toBe("ARMOR");
    expect(stats.acBonus).toBe(4);
    expect(stats.maxDexBonus).toBe(3);
    expect(stats.armorCheckPenalty).toBe(2);
    expect(stats.spellFailure).toBe(20);
    expect(stats.description).toBe("A patchwork breastplate.");
  });

  it("treats an explicit null maxDexBonus override as unlimited, not '0 falls back'", () => {
    const stats = resolveItemStats({
      item: catalogItem({ maxDexBonus: 2 }),
      customData: { maxDexBonus: null },
    });
    expect(stats.maxDexBonus).toBeNull();
  });
});

describe("readEffects", () => {
  it("parses a well-formed effects array", () => {
    const effects = readEffects([
      { id: "a", name: "+1 flaming", description: "Deals extra fire damage." },
    ]);
    expect(effects).toHaveLength(1);
    expect(effects[0].name).toBe("+1 flaming");
  });

  it("returns an empty array for anything malformed", () => {
    expect(readEffects(null)).toEqual([]);
    expect(readEffects(undefined)).toEqual([]);
    expect(readEffects("not an array")).toEqual([]);
    expect(readEffects([{ name: "missing id" }])).toEqual([]);
  });
});
