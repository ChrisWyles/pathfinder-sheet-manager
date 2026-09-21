/**
 * Character-creation rules: ability-score generation, skill-rank and feat
 * budgets, starting wealth, and the per-class "step plan" types consumed by the
 * creation wizard. Pure and unit-tested — no React, no Prisma.
 */

import { abilityModifier } from "./abilities";
import { ABILITIES, type AbilityKey } from "./types";

// ---------------------------------------------------------------------------
// Ability scores
// ---------------------------------------------------------------------------

export type AbilityMethod =
  | "manual"
  | "standard-array"
  | "point-buy"
  | "roll";

/** Official Pathfinder purchase cost for a pre-racial ability score (7–18). */
export const POINT_BUY_COST: Record<number, number> = {
  7: -4,
  8: -2,
  9: -1,
  10: 0,
  11: 1,
  12: 2,
  13: 3,
  14: 5,
  15: 7,
  16: 10,
  17: 13,
  18: 17,
};

export const POINT_BUY_MIN = 7;
export const POINT_BUY_MAX = 18;

export const POINT_BUY_BUDGETS = [
  { value: 10, label: "Low fantasy (10)" },
  { value: 15, label: "Standard fantasy (15)" },
  { value: 20, label: "High fantasy (20)" },
  { value: 25, label: "Epic fantasy (25)" },
] as const;

export const STANDARD_ARRAY: Record<AbilityKey, number> = {
  STR: 15,
  DEX: 14,
  CON: 13,
  INT: 12,
  WIS: 10,
  CHA: 8,
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Point-buy cost of one score, clamped to the purchasable 7–18 band. */
export function pointBuyCostForScore(score: number): number {
  return POINT_BUY_COST[clamp(Math.round(score), POINT_BUY_MIN, POINT_BUY_MAX)];
}

export function pointBuyTotal(scores: Record<AbilityKey, number>): number {
  return ABILITIES.reduce(
    (sum, key) => sum + pointBuyCostForScore(scores[key]),
    0,
  );
}

/** One 4d6-drop-lowest score. `rng` returns a float in [0, 1). */
export function roll4d6DropLowest(rng: () => number = Math.random): number {
  const dice = Array.from({ length: 4 }, () => Math.floor(rng() * 6) + 1).sort(
    (a, b) => a - b,
  );
  return dice[1] + dice[2] + dice[3];
}

/** Six 4d6-drop-lowest values, highest first. */
export function rollAbilitySet(rng: () => number = Math.random): number[] {
  return Array.from({ length: 6 }, () => roll4d6DropLowest(rng)).sort(
    (a, b) => b - a,
  );
}

// ---------------------------------------------------------------------------
// Skill ranks
// ---------------------------------------------------------------------------

export interface SkillBudgetInput {
  /** The class's skill ranks per level (before Int). */
  classRanksPerLevel: number;
  intMod: number;
  level: number;
  human?: boolean;
  /** Number of level-ups whose favored-class bonus was spent on a skill rank. */
  favoredRanks?: number;
}

/** Total skill ranks available at character creation. */
export function skillRanksBudget({
  classRanksPerLevel,
  intMod,
  level,
  human = false,
  favoredRanks = 0,
}: SkillBudgetInput): number {
  const perLevel =
    Math.max(1, classRanksPerLevel + intMod) + (human ? 1 : 0);
  return perLevel * Math.max(1, level) + Math.max(0, favoredRanks);
}

/** Max ranks in a single skill = total Hit Dice = character level. */
export function maxRanksPerSkill(level: number): number {
  return Math.max(1, level);
}

/**
 * Expand a class's `classSkills` list (which may contain grouped entries like
 * "Knowledge (all)") into a lowercase lookup set matched against `Skill.name`.
 */
export function classSkillSet(
  classSkills: string[],
  allSkillNames: string[],
): Set<string> {
  const set = new Set<string>();
  const lowerAll = allSkillNames.map((n) => n.toLowerCase());
  for (const raw of classSkills) {
    const entry = raw.trim();
    const lower = entry.toLowerCase();
    const groupMatch = lower.match(/^(knowledge|craft|perform|profession)\b/);
    if (groupMatch && /\ball\b|\(all\)/.test(lower)) {
      const prefix = groupMatch[1];
      lowerAll.forEach((n) => {
        if (n.startsWith(prefix)) set.add(n);
      });
      continue;
    }
    // Exact match, else prefix match ("Knowledge (arcana)" style).
    if (lowerAll.includes(lower)) {
      set.add(lower);
    } else {
      lowerAll.forEach((n) => {
        if (n === lower || n.startsWith(lower + " ") || lower.startsWith(n)) {
          set.add(n);
        }
      });
    }
  }
  return set;
}

// ---------------------------------------------------------------------------
// Feats
// ---------------------------------------------------------------------------

export interface FeatSlotInput {
  level: number;
  human?: boolean;
  /** Reserved: fighter/wizard bonus feats are surfaced through the step plan. */
  isFighter?: boolean;
}

/** General feat slots: one at 1st and every odd level, +1 for humans. */
export function featSlotCount({ level, human = false }: FeatSlotInput): number {
  const lvl = Math.max(1, level);
  return Math.floor((lvl + 1) / 2) + (human ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Starting wealth
// ---------------------------------------------------------------------------

interface WealthEntry {
  dice: string;
  avg: number;
}

const wealth = (dice: string, avg: number): WealthEntry => ({ dice, avg });

/** Average starting gold (gp) by core class — d20pfsrd character-creation guide. */
export const STARTING_WEALTH_BY_CLASS: Record<string, WealthEntry> = {
  Barbarian: wealth("3d6 × 10", 105),
  Bard: wealth("3d6 × 10", 105),
  Cleric: wealth("4d6 × 10", 140),
  Druid: wealth("2d6 × 10", 70),
  Fighter: wealth("5d6 × 10", 175),
  Monk: wealth("1d6 × 10", 35),
  Paladin: wealth("5d6 × 10", 175),
  Ranger: wealth("5d6 × 10", 175),
  Rogue: wealth("4d6 × 10", 140),
  Sorcerer: wealth("2d6 × 10", 70),
  Wizard: wealth("2d6 × 10", 70),
  Alchemist: wealth("3d6 × 10", 105),
  Cavalier: wealth("5d6 × 10", 175),
  Gunslinger: wealth("5d6 × 10", 175),
  Inquisitor: wealth("4d6 × 10", 140),
  Magus: wealth("4d6 × 10", 140),
  Oracle: wealth("3d6 × 10", 105),
  Summoner: wealth("2d6 × 10", 70),
  Witch: wealth("3d6 × 10", 105),
};

const WEALTH_BY_GROUP: Record<string, WealthEntry> = {
  spherecaster: wealth("2d6 × 10", 70),
  practitioner: wealth("5d6 × 10", 175),
  champion: wealth("4d6 × 10", 140),
};

const WEALTH_FALLBACK = wealth("3d6 × 10", 105);

/** Starting wealth for a class name, falling back to its Spheres group. */
export function startingWealth(
  className: string,
  group?: string | null,
): WealthEntry {
  const bare = className.replace(/\s*\((?:spheres|3pp|hb)\)\s*$/i, "").trim();
  return (
    STARTING_WEALTH_BY_CLASS[bare] ??
    (group ? WEALTH_BY_GROUP[group] : undefined) ??
    WEALTH_FALLBACK
  );
}

// ---------------------------------------------------------------------------
// Hit points
// ---------------------------------------------------------------------------

/**
 * Starting max HP: full hit die at 1st level, class average each level after,
 * plus the Constitution modifier per level. Minimum 1.
 */
export function estimateStartingHp(
  hitDie: number,
  level: number,
  conMod: number,
): number {
  const lvl = Math.max(1, level);
  const average = Math.ceil((hitDie + 1) / 2);
  const fromDice = hitDie + (lvl - 1) * average;
  return Math.max(1, fromDice + lvl * conMod);
}

// ---------------------------------------------------------------------------
// Per-class step plan
// ---------------------------------------------------------------------------

export type StepTab =
  | "identity"
  | "abilities"
  | "race"
  | "class-features"
  | "casting-tradition"
  | "martial-tradition"
  | "skills"
  | "feats"
  | "spheres"
  | "equipment"
  | "review";

export const TAB_ORDER: StepTab[] = [
  "identity",
  "abilities",
  "race",
  "class-features",
  "casting-tradition",
  "martial-tradition",
  "skills",
  "feats",
  "spheres",
  "equipment",
  "review",
];

export type StepKind =
  | "pick-feat"
  | "pick-talent"
  | "pick-sphere"
  | "pick-option"
  /** Multi-select from options that each cost points against a shared
   * budget — same visual language as the custom casting-tradition builder
   * (a running total, over-budget warning) but generic to any point-buy
   * choice. See `budget` below and `StepOption.cost`. */
  | "pick-weighted"
  | "ability-boost"
  | "info";

export interface StepOption {
  value: string;
  label: string;
  description?: string;
  /** Point cost against the step's `budget` — only meaningful for
   * "pick-weighted" steps. */
  cost?: number;
}

export interface CreationChoiceStep {
  /** Stable, unique within a plan. */
  id: string;
  /** The class level at which this choice is gained. */
  classLevel: number;
  tab: StepTab;
  kind: StepKind;
  title: string;
  prompt: string;
  /** How many selections to make (default 1). */
  count: number;
  options?: StepOption[];
  /** Point budget for a "pick-weighted" step — the sum of selected
   * options' `cost` is checked against this. */
  budget?: number;
  /** Links back to a `ClassFeature.name` where applicable. */
  featureName?: string;
  fromRegistry?: boolean;
}

export function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Group a step plan by wizard tab, in canonical tab order. */
export function stepsByTab(
  steps: CreationChoiceStep[],
): Map<StepTab, CreationChoiceStep[]> {
  const map = new Map<StepTab, CreationChoiceStep[]>();
  for (const tab of TAB_ORDER) {
    const inTab = steps.filter((s) => s.tab === tab);
    if (inTab.length) map.set(tab, inTab);
  }
  return map;
}

export { abilityModifier };
