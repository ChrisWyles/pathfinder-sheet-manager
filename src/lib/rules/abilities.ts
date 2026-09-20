import {
  ABILITIES,
  type AbilityKey,
  type AbilityScores,
  type StatBreakdownLine,
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

/** Parses a Character's freeform `abilityModifiers` JSON into the typed
 * per-bucket adjustment shape `applyAbilityAdjustments` expects. */
export function parseAbilityAdjustments(
  value: unknown,
): Record<string, Partial<Record<AbilityKey, number>>> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, Partial<Record<AbilityKey, number>>>;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Named terms behind one ability's effective score — Base plus one line
 * per adjustment bucket (racial, enhancement, ...) that affects it. */
export function abilityBreakdown(
  key: AbilityKey,
  base: number,
  adjustments: Record<string, Partial<Record<AbilityKey, number>>> | null,
): StatBreakdownLine[] {
  const lines: StatBreakdownLine[] = [{ label: "Base", value: base }];
  if (!adjustments) return lines;
  for (const [bucket, byAbility] of Object.entries(adjustments)) {
    const delta = byAbility?.[key];
    if (typeof delta === "number" && delta !== 0) {
      lines.push({ label: capitalize(bucket), value: delta });
    }
  }
  return lines;
}

export function sumAcModifiers(
  modifiers: TypedModifiers | undefined,
  ...types: string[]
): number {
  if (!modifiers?.ac) return 0;
  return types.reduce((total, type) => total + (modifiers.ac?.[type] ?? 0), 0);
}
