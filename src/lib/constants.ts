import type {
  AbilityKey,
  BabProgressionKey,
  CreatureSizeKey,
  SaveProgressionKey,
} from "@/lib/rules/types";

export const RULES_SYSTEMS = [
  {
    value: "PATHFINDER_1E",
    label: "Pathfinder 1e",
    blurb: "Core Pathfinder First Edition rules.",
  },
  {
    value: "SPHERES_OF_POWER",
    label: "Spheres of Power",
    blurb:
      "Drop Dead Studios' Spheres of Power magic system on the PF1e chassis.",
  },
] as const;

export const ABILITY_META: Record<
  AbilityKey,
  { label: string; short: string }
> = {
  STR: { label: "Strength", short: "STR" },
  DEX: { label: "Dexterity", short: "DEX" },
  CON: { label: "Constitution", short: "CON" },
  INT: { label: "Intelligence", short: "INT" },
  WIS: { label: "Wisdom", short: "WIS" },
  CHA: { label: "Charisma", short: "CHA" },
};

export const SIZE_OPTIONS: { value: CreatureSizeKey; label: string }[] = [
  { value: "FINE", label: "Fine" },
  { value: "DIMINUTIVE", label: "Diminutive" },
  { value: "TINY", label: "Tiny" },
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LARGE", label: "Large" },
  { value: "HUGE", label: "Huge" },
  { value: "GARGANTUAN", label: "Gargantuan" },
  { value: "COLOSSAL", label: "Colossal" },
];

export interface ClassPreset {
  name: string;
  hitDie: number;
  skillRanksPerLevel: number;
  babProgression: BabProgressionKey;
  fortProgression: SaveProgressionKey;
  refProgression: SaveProgressionKey;
  willProgression: SaveProgressionKey;
}

/** Core PF1e class chassis. Full class features come from the library import. */
export const CLASS_PRESETS: ClassPreset[] = [
  g("Barbarian", 12, 4, "FULL", "GOOD", "POOR", "POOR"),
  g("Bard", 8, 6, "THREE_QUARTER", "POOR", "GOOD", "GOOD"),
  g("Cleric", 8, 2, "THREE_QUARTER", "GOOD", "POOR", "GOOD"),
  g("Druid", 8, 4, "THREE_QUARTER", "GOOD", "POOR", "GOOD"),
  g("Fighter", 10, 2, "FULL", "GOOD", "POOR", "POOR"),
  g("Monk", 8, 4, "THREE_QUARTER", "GOOD", "GOOD", "GOOD"),
  g("Paladin", 10, 2, "FULL", "GOOD", "POOR", "GOOD"),
  g("Ranger", 10, 6, "FULL", "GOOD", "GOOD", "POOR"),
  g("Rogue", 8, 8, "THREE_QUARTER", "POOR", "GOOD", "POOR"),
  g("Sorcerer", 6, 2, "HALF", "POOR", "POOR", "GOOD"),
  g("Wizard", 6, 2, "HALF", "POOR", "POOR", "GOOD"),
  g("Alchemist", 8, 4, "THREE_QUARTER", "GOOD", "GOOD", "POOR"),
  g("Inquisitor", 8, 6, "THREE_QUARTER", "GOOD", "POOR", "GOOD"),
  g("Magus", 8, 2, "THREE_QUARTER", "GOOD", "POOR", "GOOD"),
  g("Oracle", 8, 4, "THREE_QUARTER", "POOR", "POOR", "GOOD"),
  g("Summoner", 8, 2, "THREE_QUARTER", "POOR", "POOR", "GOOD"),
  g("Witch", 6, 2, "HALF", "POOR", "POOR", "GOOD"),
  g("Incanter (Spheres)", 8, 4, "THREE_QUARTER", "POOR", "POOR", "GOOD"),
  g("Mageknight (Spheres)", 10, 4, "FULL", "GOOD", "POOR", "GOOD"),
  g("Soul Weaver (Spheres)", 8, 4, "THREE_QUARTER", "POOR", "POOR", "GOOD"),
];

function g(
  name: string,
  hitDie: number,
  skillRanksPerLevel: number,
  babProgression: BabProgressionKey,
  fortProgression: SaveProgressionKey,
  refProgression: SaveProgressionKey,
  willProgression: SaveProgressionKey,
): ClassPreset {
  return {
    name,
    hitDie,
    skillRanksPerLevel,
    babProgression,
    fortProgression,
    refProgression,
    willProgression,
  };
}
