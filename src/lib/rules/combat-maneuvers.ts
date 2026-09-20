import maneuverFeatsData from "../../../data/rules/combat-maneuver-feats.json";
import maneuversData from "../../../data/rules/combat-maneuvers.json";

/**
 * The 10 official Pathfinder 1e combat maneuvers (Bull Rush through Trip)
 * plus Feint, scraped from d20pfsrd's Combat page (see
 * scripts/scrape-combat-maneuvers.ts). Small, fixed reference content, so
 * it's bundled as static JSON rather than a DB table.
 */
export interface CombatManeuver {
  name: string;
  slug: string;
  /** False only for Feint — it's a Bluff check, not a CMB attack roll. */
  isCmbBased: boolean;
  /** Rules text with "unless you have the Improved/Greater X feat" caveats
   * stripped out — see resolveManeuverFeat to add the real feat text back
   * in for a character that actually has it. */
  description: string;
  sourceUrl: string;
}

/** An "Improved X" / "Greater X" combat feat, scraped from its own
 * d20pfsrd page (see scripts/scrape-maneuver-feats.ts) — these aren't in
 * the app's Feat catalog, which only covers Spheres of Power content. */
export interface ManeuverFeat {
  name: string;
  prerequisite: string;
  benefit: string;
  normal: string;
  sourceUrl: string;
}

export const COMBAT_MANEUVERS_OVERVIEW: string = maneuversData.overview;
export const COMBAT_MANEUVERS: CombatManeuver[] = maneuversData.maneuvers;

const MANEUVER_FEATS: Record<
  string,
  { improved?: ManeuverFeat; greater?: ManeuverFeat }
> = maneuverFeatsData;

export interface ResolvedManeuverFeats {
  /** Highest tier held — Greater always requires Improved as a
   * prerequisite, so having it implies both apply at once. */
  tier: "improved" | "greater";
  /** [improved] or [improved, greater] — both texts matter for "greater",
   * since Greater's own benefit text is an additional bonus stacked on
   * top of (not a replacement for) Improved's. */
  feats: ManeuverFeat[];
}

/** Which tier (if any) of a maneuver's feat chain a character has, by
 * matching their taken-feat names (case/whitespace-insensitive) against
 * "Improved X" / "Greater X". */
export function resolveManeuverFeat(
  maneuverName: string,
  characterFeatNames: string[],
): ResolvedManeuverFeats | null {
  const tiers = MANEUVER_FEATS[maneuverName];
  if (!tiers) return null;

  const has = (name: string) =>
    characterFeatNames.some(
      (f) => f.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const hasGreater = !!tiers.greater && has(tiers.greater.name);
  const hasImproved = !!tiers.improved && has(tiers.improved.name);

  if (hasGreater) {
    return {
      tier: "greater",
      feats: [tiers.improved, tiers.greater].filter(
        (f): f is ManeuverFeat => !!f,
      ),
    };
  }
  if (hasImproved) {
    return { tier: "improved", feats: [tiers.improved!] };
  }
  return null;
}
