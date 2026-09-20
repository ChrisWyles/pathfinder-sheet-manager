import { signed } from "./roller";

/** BAB-reduction offset for each attack in a full-attack sequence — the
 * first attack is at full BAB, each subsequent one 5 lower, matching
 * `attackSequenceFromBab`'s iterative pattern. */
export function attackIterationOffsets(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    i === 0 ? 0 : -5 * i,
  );
}

/** Whether a natural d20 result threatens a critical hit — everything
 * from `critRange` (e.g. 19 for "19-20/x2") through 20 threatens; a null
 * critRange (no weapon data) falls back to "only a natural 20". */
export function isCriticalThreat(
  naturalRoll: number,
  critRange: number | null,
): boolean {
  return naturalRoll >= (critRange ?? 20);
}

/** Builds the dice notation for one damage roll: the weapon's damage dice
 * plus an ability modifier, or — on a confirmed threat — the whole roll
 * wrapped and multiplied by the weapon's critical multiplier. */
export function damageExpression(
  damage: string,
  abilityMod: number,
  isCrit: boolean,
  critMultiplier: number | null,
): string {
  const base = `${damage}${signed(abilityMod)}`;
  if (!isCrit) return base;
  return `(${base})*${critMultiplier ?? 2}`;
}
