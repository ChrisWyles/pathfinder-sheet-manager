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
  /** Second (blast type) talent, applied via the Admixture talent — only
   * meaningful when `admixture` is true. */
  blastTypeTalentId2: string | null;
  /** Whether the Admixture talent's effect is active on this blast (the
   * card only offers this when the character has actually taken
   * Admixture). */
  admixture: boolean;
  /** Admixture's extra cost when the two blast types aren't in the same
   * group: true pays 1 extra spell point, false instead increases the
   * blast's casting time by one step (not modeled numerically — see the
   * card's note). Irrelevant when the two types share a group (free) or
   * admixture isn't active. */
  admixtureExtraSpellPoint: boolean;
  boosted: boolean;
}

export function emptyDestructiveBlastConfig(): DestructiveBlastConfig {
  return {
    blastShapeTalentId: null,
    blastTypeTalentId: null,
    blastTypeTalentId2: null,
    admixture: false,
    admixtureExtraSpellPoint: true,
    boosted: false,
  };
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
    blastTypeTalentId2:
      typeof v.blastTypeTalentId2 === "string" ? v.blastTypeTalentId2 : null,
    admixture: v.admixture === true,
    admixtureExtraSpellPoint:
      typeof v.admixtureExtraSpellPoint === "boolean"
        ? v.admixtureExtraSpellPoint
        : empty.admixtureExtraSpellPoint,
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

/**
 * Admixture (http://spheresofpower.wikidot.com/destruction#toc4): "You may
 * either increase the casting time of your destructive blast by one step
 * or spend an additional spell point to apply two (blast type) talents
 * instead of 1. The resultant blast does half of its damage of each type
 * and any additional effects of the blast types are applied normally. ...
 * Special: You do not increase the casting time or spend an additional
 * spell point when using the Admixture talent with two blast types from
 * the same blast type group."
 *
 * The RAW die-size-mismatch table (use the smaller of the two dice sizes)
 * and the "use the lower caster level of the two blast types" clause don't
 * apply in this app's model — every blast type here shares the sphere's
 * single base d6 die and the character's one caster level, so there's
 * nothing for either rule to adjust between. Only the half-damage split
 * and the same-group cost waiver are generically computable; each chosen
 * talent's own further text (e.g. Special effects) is surfaced to the
 * player, not parsed.
 */

/** A blast type talent's group for Admixture's cost waiver — the damage
 * type it's tagged with (e.g. two "acid" blast types share a group). */
export function destructiveBlastTypeGroup(
  blastType: DestructiveBlastTalentLike | null,
): string | null {
  if (!blastType) return null;
  return (
    blastType.talentTypes.find((t) => t !== "blast type" && t !== "advanced") ??
    null
  );
}

/** Splits a blast's total damage dice count as evenly as possible between
 * Admixture's two blast types ("half of its damage of each type"); an odd
 * die goes to the first type. */
export function destructiveBlastAdmixtureSplit(
  count: number,
): [first: number, second: number] {
  const first = Math.ceil(count / 2);
  return [first, count - first];
}

/** Admixture's extra cost: free when both blast types share a group,
 * otherwise 1 spell point if the player chose to pay it that way (the
 * "increase casting time by one step" alternative costs no spell points
 * and isn't tracked numerically here). */
export function destructiveBlastAdmixtureSpellPointCost(
  admixture: boolean,
  sameGroup: boolean,
  extraSpellPoint: boolean,
): number {
  if (!admixture || sameGroup) return 0;
  return extraSpellPoint ? 1 : 0;
}
