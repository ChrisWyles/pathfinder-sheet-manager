/**
 * The Spheres of Power/Might talent economy: gaining a new sphere costs one
 * talent of the matching type (a magic talent for a magic sphere, a combat
 * talent for a martial sphere) — the same as picking a talent from within
 * that sphere. E.g. with 2 magic talents, picking the Destruction sphere
 * and one blast-type talent from it spends both.
 *
 * Spend order matters: specific-type slots (combat/magic) are spent before
 * flex (combat-or-magic) slots, so a build that's short on, say, magic
 * slots only dips into flex for the shortfall rather than every magic item
 * eating into flex, distorting how much flex is actually left.
 */

export type SpendBucket = "combat" | "magic";

export interface SpendTotals {
  combat: number;
  magic: number;
  flex: number;
}

export interface SpendResult {
  /** How many of each bucket's own slots were used, capped at that bucket's total. */
  specificUsed: Record<SpendBucket, number>;
  /** How many flex slots absorbed the overflow once a bucket's own slots ran out. */
  flexUsed: number;
  /** Items that couldn't be paid for even after flex ran out. */
  overBudget: number;
}

export function allocateTalentSpend(
  items: SpendBucket[],
  totals: SpendTotals,
): SpendResult {
  const cost: Record<SpendBucket, number> = { combat: 0, magic: 0 };
  for (const b of items) cost[b]++;

  const specificUsed: Record<SpendBucket, number> = {
    combat: Math.min(cost.combat, totals.combat),
    magic: Math.min(cost.magic, totals.magic),
  };
  const overflow =
    Math.max(0, cost.combat - totals.combat) +
    Math.max(0, cost.magic - totals.magic);
  const flexUsed = Math.min(overflow, totals.flex);
  const overBudget = Math.max(0, overflow - totals.flex);

  return { specificUsed, flexUsed, overBudget };
}
