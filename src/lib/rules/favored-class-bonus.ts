/**
 * Recognizes the common "+1/N of a(n) [Sphere] talent" favored-class-bonus
 * phrasing (e.g. "+1/5 of a Life sphere talent", "+1/6 of a new magical
 * talent", "+1/5 of a Destruction or Scoundrel sphere talent") and turns it
 * into a trackable rule: one bonus talent every N levels in the favored
 * class, optionally restricted to one of a set of named spheres.
 *
 * Deliberately narrow — the wide variety of other per-race bonuses (bonus
 * feats, skill bonuses, hit points, "+1/6 of a bestial trait", etc.) aren't
 * a single bonus talent and are shown as flavor text only, same as before.
 */

export interface FavoredClassBonusMechanic {
  /** Grant one bonus talent every this many levels in the favored class. */
  every: number;
  /** Named spheres the talent must come from ("X or Y sphere" keeps both); empty when the text doesn't name one (e.g. "a new magical talent"). */
  spheres: string[];
}

const TALENT_RE = /\+1\/(\d+)(?:th)?\s+of\s+an?\s+([^.]*?)\s+talent\b/i;

export function parseFavoredClassBonusMechanic(
  bonus: string,
): FavoredClassBonusMechanic | null {
  const m = bonus.match(TALENT_RE);
  if (!m) return null;
  const every = parseInt(m[1], 10);
  if (!every) return null;
  const desc = m[2].trim();
  const sphereMatch = desc.match(/^(.+?)\s+sphere$/i);
  const spheres = sphereMatch
    ? sphereMatch[1]
        .split(/\s*(?:,|\/|\bor\b)\s*/i)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return { every, spheres };
}

/** How many bonus talents a mechanic has granted by the given class level. */
export function favoredClassBonusTalentsEarned(
  mechanic: FavoredClassBonusMechanic,
  classLevels: number,
): number {
  if (mechanic.every <= 0) return 0;
  return Math.floor(Math.max(0, classLevels) / mechanic.every);
}
