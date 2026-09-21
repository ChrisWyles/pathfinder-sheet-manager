import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as cheerio from "cheerio";

import { ALL_SPHERE_NAMES } from "./sphere-names";

/**
 * Scrape the "List of Sphere Specializations" section from the Incanter
 * class page — one entry per sphere describing what an incanter gets for
 * spending the "Sphere Specialization" specialization (always 3 points,
 * see scrape-sphere-classes.ts / CLASS_CREATION_STEPS) on that sphere.
 * Reuses the page HTML scrape-sphere-classes.ts already cached; run that
 * first (`npm run scrape:classes -- --only incanter`) if the cache is
 * missing.
 *
 * Only core spheres (an exact name match against ALL_SPHERE_NAMES) are
 * kept — this drops non-core entries like "Bear" (no recognized sphere of
 * that name) and 3rd-party ones such as the Legendary-Games-tagged
 * Technomancy write-up, along with every nested "Sub-Specialization"
 * (optional archetype-style variants — out of scope here).
 *
 *   npm run scrape:incanter-specializations
 *
 * Output: data/sphere-classes/incanter-sphere-specializations.json
 */

const CACHE_FILE = ".cache/spheres/_class_incanter.html";
const OUT_DIR = "data/sphere-classes";
const SPHERE_NAME_SET = new Set(ALL_SPHERE_NAMES);

function clean(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

interface SphereSpecialization {
  sphereName: string;
  description: string;
}

function parseSphereSpecializations(html: string): SphereSpecialization[] {
  const $ = cheerio.load(html);
  const content = $("#page-content").first();

  let inSection = false;
  let sectionDone = false;
  let current: { sphereName: string | null; body: string[] } | null = null;
  const out: SphereSpecialization[] = [];

  const flush = () => {
    if (current?.sphereName && SPHERE_NAME_SET.has(current.sphereName)) {
      out.push({
        sphereName: current.sphereName,
        description: current.body.join("\n\n"),
      });
    }
    current = null;
  };

  content.find("h1, h2, h3, h4, p, li").each((_i, el) => {
    if (sectionDone) return;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;

    if (tag === "h2") {
      if (/^list of sphere specializations$/i.test(raw)) {
        inSection = true;
        return;
      }
      if (inSection) {
        flush();
        sectionDone = true;
      }
      return;
    }
    if (tag === "h1") {
      if (inSection) {
        flush();
        sectionDone = true;
      }
      return;
    }
    if (!inSection) return;

    if (tag === "h3") {
      flush();
      current = { sphereName: raw, body: [] };
      return;
    }
    if (tag === "h4") {
      // A nested "Sub-Specialization" variant — flush the parent sphere's
      // body collected so far, then stop collecting until the next h3
      // (the sub-specialization's own text is out of scope here).
      flush();
      return;
    }
    if (current) current.body.push(raw);
  });
  flush();

  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let html: string;
  try {
    html = await readFile(CACHE_FILE, "utf8");
  } catch {
    throw new Error(
      `Missing cache ${CACHE_FILE} — run "npm run scrape:classes -- --only incanter" first.`,
    );
  }

  const specializations = parseSphereSpecializations(html);
  console.log(`Sphere specializations: ${specializations.length} core spheres.`);
  console.log(`  ${specializations.map((s) => s.sphereName).join(", ")}`);

  await writeFile(
    join(OUT_DIR, "incanter-sphere-specializations.json"),
    JSON.stringify(specializations, null, 2) + "\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
