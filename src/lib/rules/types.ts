/** Shared rules types. These are plain TS types, independent of Prisma models. */

export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type AbilityKey = (typeof ABILITIES)[number];

export type AbilityScores = Record<AbilityKey, number>;

export const CREATURE_SIZES = [
  "FINE",
  "DIMINUTIVE",
  "TINY",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "HUGE",
  "GARGANTUAN",
  "COLOSSAL",
] as const;
export type CreatureSizeKey = (typeof CREATURE_SIZES)[number];

export type BabProgressionKey = "FULL" | "THREE_QUARTER" | "HALF";
export type SaveProgressionKey = "GOOD" | "POOR";

export interface ClassProgression {
  levels: number;
  babProgression: BabProgressionKey;
  fortProgression: SaveProgressionKey;
  refProgression: SaveProgressionKey;
  willProgression: SaveProgressionKey;
}

export interface ArmorContribution {
  acBonus: number;
  maxDexBonus: number | null;
  armorCheckPenalty: number;
}

export interface TypedModifiers {
  /** AC bonus types: natural, deflection, dodge, armor, shield, insight, ... */
  ac?: Record<string, number>;
  saves?: { fort?: number; ref?: number; will?: number };
  attack?: number;
  cmb?: number;
  cmd?: number;
  initiative?: number;
  hp?: number;
  speed?: number;
}

export interface DerivedInput {
  size: CreatureSizeKey;
  baseSpeed: number;
  /** Final ability scores, after racial/enhancement/inherent adjustments. */
  abilityScores: AbilityScores;
  classes: ClassProgression[];
  armor?: ArmorContribution;
  shield?: Pick<ArmorContribution, "acBonus" | "armorCheckPenalty">;
  modifiers?: TypedModifiers;
}

export interface DerivedStats {
  totalLevel: number;
  /** Effective ability scores, after racial/enhancement/inherent adjustments. */
  abilityScores: Record<AbilityKey, number>;
  abilityMods: Record<AbilityKey, number>;
  baseAttackBonus: number;
  /** Full-attack iterative bonuses, highest first, e.g. [11, 6, 1]. */
  attackSequence: number[];
  meleeAttack: number;
  rangedAttack: number;
  cmb: number;
  cmd: number;
  ac: number;
  touchAc: number;
  flatFootedAc: number;
  saves: { fort: number; ref: number; will: number };
  initiative: number;
  speed: number;
  maxDexApplied: number;
  armorCheckPenalty: number;
}
