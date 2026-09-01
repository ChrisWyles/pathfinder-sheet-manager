import {
  ABILITIES,
  type AbilityKey,
  type AbilityScores,
  type TypedModifiers,
} from "./types";

/** Pathfinder ability modifier: floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function abilityModifiers(
  scores: AbilityScores,
): Record<AbilityKey, number> {
  return Object.fromEntries(
    ABILITIES.map((key) => [key, abilityModifier(scores[key])]),
  ) as Record<AbilityKey, number>;
}

/**
 * Apply typed ability adjustments (racial, enhancement, inherent, ...) stored on
 * a character to its base scores. Adjustments are summed per ability.
 */
export function applyAbilityAdjustments(
  base: AbilityScores,
  adjustments: Record<string, Partial<Record<AbilityKey, number>>> | null,
): AbilityScores {
  const result = { ...base };
  if (!adjustments) return result;
  for (const byAbility of Object.values(adjustments)) {
    for (const key of ABILITIES) {
      const delta = byAbility?.[key];
      if (typeof delta === "number") result[key] += delta;
    }
  }
  return result;
}

export function sumAcModifiers(
  modifiers: TypedModifiers | undefined,
  ...types: string[]
): number {
  if (!modifiers?.ac) return 0;
  return types.reduce((total, type) => total + (modifiers.ac?.[type] ?? 0), 0);
}
