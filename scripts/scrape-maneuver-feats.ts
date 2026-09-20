import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as cheerio from "cheerio";

import { cleanText, getHtmlCached } from "./pfsrd-html";

/**
 * Scrape the "Improved X" / "Greater X" combat feat for each of the 10
 * combat maneuvers, plus "Improved Feint", from d20pfsrd's individual feat
 * pages (e.g. https://www.d20pfsrd.com/feats/combat-feats/improved-trip-combat/).
 *
 * These aren't in the app's Feat catalog at all — that catalog was scraped
 * from the Spheres of Power wiki (see scrape-feats.ts) and doesn't cover
 * core Pathfinder combat feats. Like scrape-combat-maneuvers.ts, this is
 * small fixed reference content, so it writes straight to a bundled JSON
 * file rather than the DB.
 *
 *   npm run scrape:maneuver-feats
 *
 * Output: data/rules/combat-maneuver-feats.json
 * HTML cached under .cache/pfsrd/ (git-ignored).
 */

const BASE = "https://www.d20pfsrd.com/feats/combat-feats";
const OUT_DIR = "data/rules";

const args = process.argv.slice(2);
const REFRESH = args.includes("--refresh");

const MANEUVERS = [
  "Bull Rush",
  "Dirty Trick",
  "Disarm",
  "Drag",
  "Grapple",
  "Overrun",
  "Reposition",
  "Steal",
  "Sunder",
  "Trip",
] as const;

interface ManeuverFeat {
  name: string;
  prerequisite: string;
  benefit: string;
  normal: string;
  sourceUrl: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

async function fetchFeat(name: string): Promise<ManeuverFeat | null> {
  const slug = `${slugify(name)}-combat`;
  const url = `${BASE}/${slug}/`;
  let html: string;
  try {
    html = await getHtmlCached(url, slug, REFRESH);
  } catch (err) {
    console.log(`  (skipping ${name} — ${(err as Error).message})`);
    return null;
  }

  const $ = cheerio.load(html);
  const content = $("#page-content, .page-content, article").first();
  const paragraphs = content
    .find("p")
    .map((_i, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean);

  const find = (label: string) => {
    const p = paragraphs.find((t) => new RegExp(`^${label}:`, "i").test(t));
    return p ? p.replace(new RegExp(`^${label}:\\s*`, "i"), "") : "";
  };

  return {
    name,
    prerequisite: find("Prerequisites?"),
    benefit: find("Benefit"),
    normal: find("Normal"),
    sourceUrl: url,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const out: Record<string, { improved?: ManeuverFeat; greater?: ManeuverFeat }> =
    {};

  for (const maneuver of MANEUVERS) {
    console.log(maneuver);
    const improved = await fetchFeat(`Improved ${maneuver}`);
    const greater = await fetchFeat(`Greater ${maneuver}`);
    out[maneuver] = {
      ...(improved ? { improved } : {}),
      ...(greater ? { greater } : {}),
    };
  }

  console.log("Feint");
  const improvedFeint = await fetchFeat("Improved Feint");
  out.Feint = improvedFeint ? { improved: improvedFeint } : {};

  const missingBenefit = Object.entries(out).flatMap(([maneuver, tiers]) =>
    Object.values(tiers)
      .filter((f): f is ManeuverFeat => !!f && !f.benefit)
      .map((f) => `${maneuver}/${f.name}`),
  );
  if (missingBenefit.length > 0) {
    console.warn(`Warning: no Benefit text captured for: ${missingBenefit.join(", ")}`);
  }

  await writeFile(
    join(OUT_DIR, "combat-maneuver-feats.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  console.log(`Wrote feats for ${Object.keys(out).length} maneuvers.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
