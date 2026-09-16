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

/**
 * One-line flavor for core PF1e classes, used as the wizard class-picker
 * preview when the library row has no `description` (the seed doesn't set one).
 */
export const CLASS_BLURBS: Record<string, string> = {
  Barbarian: "Ferocious warrior who channels rage into raw power and resilience.",
  Bard: "Jack-of-all-trades performer; inspires allies and casts arcane spells.",
  Cleric: "Divine spellcaster who channels a deity's power to heal, buff and smite.",
  Druid: "Nature priest with shapeshifting, an animal companion and primal magic.",
  Fighter: "Master of every weapon and armor; the most bonus feats of any class.",
  Monk: "Unarmed martial artist with flurries, fast movement and iron defenses.",
  Paladin: "Holy warrior with divine grace, lay on hands and smite evil.",
  Ranger: "Wilderness hunter with favored enemies, a companion and light spells.",
  Rogue: "Skill expert and skirmisher who deals sneak attack damage from advantage.",
  Sorcerer: "Innate arcane caster whose bloodline shapes spontaneous spellcasting.",
  Wizard: "Studied arcane caster; a broad prepared spell list and an arcane school.",
  Alchemist: "Bomb-throwing formula caster with mutagens and discoveries.",
  Inquisitor: "Divine hunter of heretics with judgments, teamwork feats and stealth.",
  Magus: "Blends arcane spells and swordplay through spellstrike and spell combat.",
  Oracle: "Spontaneous divine caster defined by a mystery and a curse.",
  Summoner: "Bonds with a customizable eidolon and casts a small spell list.",
  Witch: "Arcane hexer who draws spells from a patron through a familiar.",
};

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
