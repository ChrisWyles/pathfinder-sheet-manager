/**
 * The Spheres of Power casting-tradition economy — confirmed against
 * http://spheresofpower.wikidot.com/casting-traditions:
 *
 *   "Boons are 'purchased' through general drawbacks; a caster must possess
 *   2 general drawbacks for each boon gained. Any general drawbacks that
 *   have not been exchanged for a boon instead grant the caster bonus spell
 *   points, according to the table below."
 *
 * Some drawbacks (e.g. Addictive Casting) explicitly "count as 2 drawbacks"
 * toward this total. Sphere-specific drawbacks are a separate mechanic (tied
 * to picking up a sphere, granting a bonus talent in it) and aren't part of
 * this economy — see `scripts/scrape-traditions.ts` for both.
 *
 * The martial-traditions page has no analogous boon/spell-point system —
 * only sphere-specific drawbacks (one bonus combat talent each), so there is
 * no martial equivalent of the functions below.
 */

export interface Grant {
  type: "sphere" | "talent" | "feat";
  name: string;
}

/** Flat cost of one boon, in general-drawback "points". */
export const BOON_COST_IN_DRAWBACKS = 2;

/**
 * Bonus spell points from general drawbacks left unspent on boons, per the
 * source page's table. The table only lists 1-5 unspent drawbacks; beyond
 * that we hold at the 5-row formula (a tradition with more than 5 unspent
 * drawbacks is already far outside typical balance).
 */
export function bonusSpellPointsFromUnspentDrawbacks(
  unspentDrawbacks: number,
  casterLevel: number,
): number {
  const n = Math.max(0, Math.min(5, Math.floor(unspentDrawbacks)));
  const level = Math.max(1, Math.floor(casterLevel));
  switch (n) {
    case 0:
      return 0;
    case 1:
      return 1 + Math.floor(level / 6);
    case 2:
      return 1 + Math.floor(level / 3);
    case 3:
      return Math.ceil(level / 2);
    case 4:
      return 1 + Math.floor((level * 2) / 3);
    case 5:
    default:
      return level;
  }
}

/**
 * Prose description of how bonus spell points scale with caster level for a
 * given number of unspent general drawbacks, per the same source table as
 * `bonusSpellPointsFromUnspentDrawbacks` above:
 *   1: "+1, +1 per 6 levels in casting classes"
 *   2: "+1, +1 per 3 levels in casting classes"
 *   3: "+1 per odd level in a casting class (1, 3, 5, etc.)"
 *   4: "+1, +1 per 1.5 levels in a casting class (2, 3, 5, 6, etc.)"
 *   5: "+1 per level in a casting class"
 */
export function describeBonusSpellPointsProgression(unspentDrawbacks: number): string {
  const n = Math.max(0, Math.min(5, Math.floor(unspentDrawbacks)));
  switch (n) {
    case 0:
      return "No bonus spell points.";
    case 1:
      return "+1 spell point initially, plus an additional +1 every 6 levels.";
    case 2:
      return "+1 spell point initially, plus an additional +1 every 3 levels.";
    case 3:
      return "+1 spell point per odd caster level (1st, 3rd, 5th, …).";
    case 4:
      return "+1 spell point initially, plus an additional +1 every 1.5 levels (2nd, 3rd, 5th, 6th, …).";
    case 5:
    default:
      return "+1 spell point per caster level.";
  }
}

export interface TraditionCostInput {
  /** Each selected drawback's cost (1, or 2 for "counts as 2" drawbacks). */
  drawbackCosts: number[];
  boonCount: number;
  casterLevel: number;
}

export interface TraditionSummary {
  totalDrawbackCost: number;
  boonCost: number;
  unspent: number;
  bonusSpellPoints: number;
  bonusSpellPointsProgression: string;
}

export function summarizeCastingTradition({
  drawbackCosts,
  boonCount,
  casterLevel,
}: TraditionCostInput): TraditionSummary {
  const totalDrawbackCost = drawbackCosts.reduce((s, c) => s + c, 0);
  const boonCost = boonCount * BOON_COST_IN_DRAWBACKS;
  const unspent = Math.max(0, totalDrawbackCost - boonCost);
  return {
    totalDrawbackCost,
    boonCost,
    unspent,
    bonusSpellPoints: bonusSpellPointsFromUnspentDrawbacks(unspent, casterLevel),
    bonusSpellPointsProgression: describeBonusSpellPointsProgression(unspent),
  };
}

/**
 * Extract "requires the X drawback/boon" and "incompatible with the Y
 * drawback/boon" sentences embedded in a drawback/boon's rules text.
 * Informational only — like feat prerequisites elsewhere in this app, these
 * are shown, not enforced.
 */
export function parsePrerequisites(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };

  // The captured name excludes "sphere" so a "must possess the X sphere"
  // clause (handled separately below) can't be swallowed up to a *later*
  // "drawback"/"boon" word elsewhere in the same sentence.
  const reqRe =
    /must (?:already )?(?:possess|have) the ((?:(?!\bsphere\b|\bdrawback\b|\bboon\b).)+?) (drawback|boon)/gi;
  for (const m of text.matchAll(reqRe)) {
    push(`Requires ${m[1].trim()} (${m[2].toLowerCase()})`);
  }

  // A handful of boons are gated behind already possessing a specific magic
  // sphere (distinct from a drawback/boon prerequisite above).
  const sphereReqRe =
    /must (?:already )?(?:possess|have) the ([A-Z][\w' -]*?) sphere\b/gi;
  for (const m of text.matchAll(sphereReqRe)) {
    push(`Requires ${m[1].trim()} sphere`);
  }

  const incompatRe =
    /(?:cannot|can\s*not|can't|may not) (?:take|select|choose) (?:this (?:drawback|boon)|the [A-Z][\w' -]*? (?:drawback|boon)) if you (?:took|have|possess|already possess) (?:the )?([A-Z][\w' -]*?) (drawback|boon)/gi;
  for (const m of text.matchAll(incompatRe)) {
    push(`Incompatible with ${m[1].trim()} (${m[2].toLowerCase()})`);
  }

  return out;
}

/** Pulls the sphere name out of a "Requires X sphere" prerequisite string. */
export function requiredSphereFromPrereq(prereq: string): string | null {
  const m = prereq.match(/^Requires (.+) sphere$/i);
  return m ? m[1].trim() : null;
}

export function isRepeatable(text: string): boolean {
  return /(?:may|can) (?:take this (?:boon|drawback)|be taken) [^.]*?multiple times/i.test(
    text,
  );
}

/** "This counts as 2 drawbacks when determining boons and bonus spell points." */
export function parseDrawbackCost(text: string): number {
  const m = text.match(/counts as (\d+) drawbacks?/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

/**
 * Best-effort extraction of concrete mechanical grants (sphere/talent/feat)
 * from a boon's rules text. Deliberately narrow — most boons are passive
 * numeric bonuses with nothing to extract. When text describes an
 * either/or grant (e.g. "gain the Conjuration sphere, or the Extra
 * Companion talent if you already possess it"), both candidates are
 * returned; the caller decides which applies to the current character
 * rather than this function guessing.
 */
export function parseGrants(text: string): Grant[] {
  const grants: Grant[] = [];
  const seen = new Set<string>();
  const add = (type: Grant["type"], name: string) => {
    const key = `${type}:${name.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      grants.push({ type, name: name.trim() });
    }
  };

  // A determiner ("the"/"a") directly before a Capitalized Name and
  // "sphere"/"talent" is specific enough in this domain to treat as a grant,
  // even when it's the second half of an "X, or the Y talent" alternative.
  for (const m of text.matchAll(
    /\b(?:the|a) ([A-Z][\w']*(?:\s[A-Z][\w']*)*) sphere\b/g,
  )) {
    add("sphere", m[1]);
  }
  for (const m of text.matchAll(
    /\b(?:the|a) ([A-Z][\w']*(?:\s[A-Z][\w']*)*) talent\b/g,
  )) {
    add("talent", m[1]);
  }
  if (/gain(?:s)? a \(drawback\) feat/i.test(text)) {
    add("feat", "(Drawback) Feat — choose one");
  }

  return grants;
}
