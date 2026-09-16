/**
 * Curated Pathfinder 1e races for the creation wizard's race picker. There is
 * no Race table in the schema — `Character.race` is free text — so these
 * presets only pre-fill existing fields (size, speed, the racial
 * ability-adjustment bag, and — via `isHumanRace` — the Human skill/feat
 * bonus). A "Custom" entry in the UI keeps a fully free-text/editable escape
 * hatch.
 *
 * Most races have a fixed ability adjustment, applied automatically and shown
 * read-only. A few (`hasChoiceAdjustment`) grant "+2 to one ability of your
 * choice" instead — the wizard renders a picker for those rather than a
 * numeric grid.
 */

import type { AbilityKey, CreatureSizeKey } from "./types";

export interface RacePreset {
  name: string;
  size: CreatureSizeKey;
  speed: number;
  abilityAdjustments: Partial<Record<AbilityKey, number>>;
  /** True when the player picks which ability the race's bonus applies to. */
  hasChoiceAdjustment?: boolean;
  /** One or two sentences of flavor text. */
  description: string;
  /** Bullet list of the race's granted traits/abilities. */
  traits: string[];
}

export const CORE_RACES: RacePreset[] = [
  {
    name: "Human",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: {},
    hasChoiceAdjustment: true,
    description:
      "Adaptable and ambitious, humans are the most populous and diverse people in most settings, equally at home as scholars, soldiers, or scoundrels.",
    traits: [
      "+2 to one ability score of your choice",
      "One bonus feat at 1st level",
      "One extra skill rank at every level",
      "Medium size, normal speed",
    ],
  },
  {
    name: "Dwarf",
    size: "MEDIUM",
    speed: 20,
    abilityAdjustments: { CON: 2, WIS: 2, CHA: -2 },
    description:
      "Stout and hardy, dwarves are famed miners and grudge-holders who feel most at home underground.",
    traits: [
      "+2 Constitution, +2 Wisdom, −2 Charisma",
      "Darkvision 60 ft.",
      "Slow and steady — speed is never reduced by armor or carried load",
      "+2 on saves vs. poison, spells, and spell-like abilities",
      "+4 dodge bonus to AC against giants",
      "+1 attack rolls against orcs and goblinoids",
      "Stonecunning — +2 Perception near unusual stonework",
    ],
  },
  {
    name: "Elf",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: { DEX: 2, INT: 2, CON: -2 },
    description:
      "Graceful and long-lived, elves favor magic and artistry over the fleeting concerns of shorter-lived races.",
    traits: [
      "+2 Dexterity, +2 Intelligence, −2 Constitution",
      "Low-light vision",
      "+2 vs. enchantment spells and effects; immune to magic sleep effects",
      "+2 caster level checks to overcome spell resistance",
      "Weapon familiarity with elven curve blades, longbows, longswords, rapiers, and shortbows",
      "+2 Perception",
    ],
  },
  {
    name: "Gnome",
    size: "SMALL",
    speed: 20,
    abilityAdjustments: { CON: 2, CHA: 2, STR: -2 },
    description:
      "Small, curious, and often eccentric, gnomes love novelty and are quick with minor magic.",
    traits: [
      "+2 Constitution, +2 Charisma, −2 Strength",
      "Small size (+1 AC, +1 attack, +4 Stealth, −1 CMB/CMD)",
      "Low-light vision",
      "+4 dodge bonus to AC against giants",
      "+2 vs. illusion spells and effects",
      "Gnome magic — Charisma-based spell-like abilities",
      "+1 attack rolls against reptilian and goblinoid humanoids",
      "+2 Perception, +2 Craft (alchemy)",
    ],
  },
  {
    name: "Half-Elf",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: {},
    hasChoiceAdjustment: true,
    description:
      "Walking between two worlds, half-elves blend human ambition with elven grace, at home fully in neither.",
    traits: [
      "+2 to one ability score of your choice",
      "Low-light vision",
      "+2 vs. enchantment spells and effects; immune to magic sleep effects",
      "Adaptability — Skill Focus as a bonus feat",
      "Multitalented — counts as both human and elf for effects related to race",
      "+1 Perception",
    ],
  },
  {
    name: "Half-Orc",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: {},
    hasChoiceAdjustment: true,
    description:
      "Straddling human and orc heritage, half-orcs are often stronger than they look and tougher than they're given credit for.",
    traits: [
      "+2 to one ability score of your choice",
      "Darkvision 60 ft.",
      "Orc Ferocity — fight on for one more round at 0 hp, 1/day",
      "+2 Intimidate",
      "Orc weapon familiarity",
    ],
  },
  {
    name: "Halfling",
    size: "SMALL",
    speed: 20,
    abilityAdjustments: { DEX: 2, CHA: 2, STR: -2 },
    description:
      "Small, lucky, and irrepressibly cheerful, halflings thrive on the fringes of larger societies.",
    traits: [
      "+2 Dexterity, +2 Charisma, −2 Strength",
      "Small size (+1 AC, +1 attack, +4 Stealth, −1 CMB/CMD)",
      "+1 racial bonus on all saving throws",
      "+2 vs. fear (stacks with the fearless trait where applicable)",
      "Sure-footed — +2 Acrobatics, +2 Climb",
      "Halfling weapon familiarity",
      "+2 Perception",
    ],
  },
  {
    name: "Aasimar",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: { WIS: 2, CHA: 2 },
    description:
      "Touched by a celestial ancestor, aasimars carry a faint aura of the divine wherever they go.",
    traits: [
      "+2 Wisdom, +2 Charisma",
      "Darkvision 60 ft.",
      "Resistance to acid 5, cold 5, and electricity 5",
      "Daylight spell-like ability, 1/day",
      "+2 Diplomacy, +2 Perception",
    ],
  },
  {
    name: "Tiefling",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: { DEX: 2, INT: 2, CHA: -2 },
    description:
      "Marked by an infernal forebear, tieflings are often distrusted at a glance despite their own intentions.",
    traits: [
      "+2 Dexterity, +2 Intelligence, −2 Charisma",
      "Darkvision 60 ft.",
      "Resistance to cold 5, electricity 5, and fire 5",
      "Darkness spell-like ability, 1/day",
      "+2 Bluff, +2 Stealth",
    ],
  },
  {
    name: "Orc",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: { STR: 4, INT: -2, WIS: -2, CHA: -2 },
    description:
      "Full-blooded orcs are savage, powerfully built, and quick to violence — a stark contrast to their half-orc kin.",
    traits: [
      "+4 Strength, −2 Intelligence, −2 Wisdom, −2 Charisma",
      "Darkvision 60 ft.",
      "Light sensitivity — −1 on attacks, saves, and checks in bright light",
      "Ferocity — fight on for one more round at 0 hp, 1/day",
      "Orc weapon familiarity",
    ],
  },
];

export function isHumanRace(name: string): boolean {
  return name.trim().toLowerCase() === "human";
}

/** The sizes actually present in `CORE_RACES` — the only ones a size filter can match. */
export const RACE_SIZES: CreatureSizeKey[] = [
  ...new Set(CORE_RACES.map((r) => r.size)),
];

export interface RaceFacetFilter {
  bonus: AbilityKey[];
  malus: AbilityKey[];
  sizes: CreatureSizeKey[];
}

/**
 * Does this race satisfy a set of facet filters?
 *
 * Within one facet, checked boxes OR together (Bonus: DEX or INT matches
 * either); the three facets AND together, and an empty facet never
 * constrains. A race with no fixed adjustment (a "+2 to one ability of your
 * choice" race) can never satisfy a non-empty bonus/malus facet — it has no
 * guaranteed one.
 */
export function raceMatchesFacets(
  race: RacePreset,
  { bonus, malus, sizes }: RaceFacetFilter,
): boolean {
  if (bonus.length && !bonus.some((k) => (race.abilityAdjustments[k] ?? 0) > 0))
    return false;
  if (malus.length && !malus.some((k) => (race.abilityAdjustments[k] ?? 0) < 0))
    return false;
  if (sizes.length && !sizes.includes(race.size)) return false;
  return true;
}
