/**
 * Destruction sphere's base ability — the first entry in a per-sphere
 * "framework" (see CLAUDE session notes): a sphere grants one automatic,
 * free ability the moment it's taken, which its own talents then modify.
 * For Destruction that's Destructive Blast:
 *
 *   http://spheresofpower.wikidot.com/destruction
 *   "As a standard action, you may deliver a burst of blunt magical force
 *   as a melee touch attack or a ranged touch attack within close range...
 *   A basic destructive blast deals 1d6 bludgeoning damage for every odd
 *   caster level. You may spend 1 spell point when making a destructive
 *   blast to increase the damage dealt to one damage die per caster level
 *   (minimum 2d6). When augmenting a destructive blast with Destruction
 *   talents, you may only apply 1 (blast type) talent and 1 (blast shape)
 *   talent to each individual destructive blast."
 *
 * Both talent categories are already scraped into the Talent catalog with
 * `talentTypes` tagging them (`["blast type", "<damage type>"]` or
 * `["blast shape"]`) — this module just resolves the resulting dice/damage
 * type; the shape/type talents' own text (shown alongside, not parsed
 * here) covers whatever further mechanics they add, spell-point costs
 * included, since those vary too much per-talent to model generically.
 */

export interface DestructiveBlastTalentLike {
  talentTypes: string[];
}

export interface DestructiveBlastConfig {
  blastShapeTalentId: string | null;
  blastTypeTalentId: string | null;
  boosted: boolean;
}

export function emptyDestructiveBlastConfig(): DestructiveBlastConfig {
  return { blastShapeTalentId: null, blastTypeTalentId: null, boosted: false };
}

/** Parses CharacterAction.sphereConfig JSON for a Destructive Blast row,
 * defaulting anything missing/malformed rather than throwing. */
export function parseDestructiveBlastConfig(value: unknown): DestructiveBlastConfig {
  const empty = emptyDestructiveBlastConfig();
  if (!value || typeof value !== "object") return empty;
  const v = value as Partial<DestructiveBlastConfig>;
  return {
    blastShapeTalentId:
      typeof v.blastShapeTalentId === "string" ? v.blastShapeTalentId : null,
    blastTypeTalentId:
      typeof v.blastTypeTalentId === "string" ? v.blastTypeTalentId : null,
    boosted: v.boosted === true,
  };
}

/** Damage dice for a destructive blast at the given caster level — 1d6 per
 * odd level normally (minimum 1d6), or 1d6 per level (minimum 2d6) when
 * boosted for 1 spell point. */
export function destructiveBlastDice(
  casterLevel: number,
  boosted: boolean,
): { count: number; sides: 6 } {
  const level = Math.max(1, Math.floor(casterLevel));
  const count = boosted
    ? Math.max(2, level)
    : Math.max(1, Math.ceil(level / 2));
  return { count, sides: 6 };
}

/** The damage type dealt — bludgeoning unless a (blast type) talent is
 * chosen, in which case it's that talent's tagged damage type (the second
 * entry in its talentTypes, e.g. ["blast type", "fire"] -> "fire"). */
export function destructiveBlastDamageType(
  blastType: DestructiveBlastTalentLike | null,
): string {
  if (!blastType) return "bludgeoning";
  const type = blastType.talentTypes.find(
    (t) => t !== "blast type" && t !== "advanced",
  );
  return type ?? "bludgeoning";
}

/** Spell point cost this app can compute generically: 0 base, +1 if
 * boosted. Individual blast shapes/types can add their own further costs
 * (e.g. Mutable Blast, Chain Blast) — those vary too much to parse
 * reliably from their rules text, so they're surfaced as text for the
 * player to read rather than folded into this number. */
export function destructiveBlastBaseCost(boosted: boolean): number {
  return boosted ? 1 : 0;
}

/** Blast shapes that replace the normal touch attack roll with a saving
 * throw as their primary resolution — read by hand off each shape's own
 * rules text on http://spheresofpower.wikidot.com/destruction (e.g.
 * Sculpt Blast: "You do not need to make any attack roll for area
 * attacks, but creatures in the effect are allowed a Reflex saving
 * throw..."). Anything not listed here (including shapes this app hasn't
 * been taught about yet) defaults to the baseline touch attack, same as
 * an unmodified destructive blast. */
const BLAST_SHAPE_SAVE_TYPE: Record<string, "REFLEX" | "FORTITUDE" | "WILL"> = {
  "blast trap": "REFLEX",
  "energy aura": "REFLEX",
  "energy sphere": "REFLEX",
  "energy wall": "REFLEX",
  "explosive orb": "REFLEX",
  "knight's blast": "REFLEX",
  "knight’s blast": "REFLEX",
  "mutable blast": "REFLEX",
  "retributive blast": "REFLEX",
  "sculpt blast": "REFLEX",
};

/** Whether the chosen blast shape talent trades the attack roll for a
 * saving throw, and which save — null when it doesn't (the default touch
 * attack still applies). */
export function destructiveBlastSaveType(
  blastShapeName: string | null,
): "REFLEX" | "FORTITUDE" | "WILL" | null {
  if (!blastShapeName) return null;
  return BLAST_SHAPE_SAVE_TYPE[blastShapeName.trim().toLowerCase()] ?? null;
}

/** Standard Spheres of Power save DC: 10 + 1/2 caster level + casting
 * ability modifier. */
export function destructiveBlastSaveDC(
  casterLevel: number,
  castingAbilityMod: number,
): number {
  return 10 + Math.floor(Math.max(1, casterLevel) / 2) + castingAbilityMod;
}
