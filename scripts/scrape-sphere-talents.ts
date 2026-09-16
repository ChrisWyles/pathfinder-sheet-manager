import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";

/**
 * Scrape every base martial (combat) sphere's talent list from
 * http://spheresofpower.wikidot.com/<slug> — the same 25 spheres already
 * named by the martial sphere-specific drawbacks (see scrape-traditions.ts).
 * Needed so the martial tradition builder's "a talent from your base
 * sphere" bonus pick can offer a real, curated list instead of free text.
 *
 * Each sphere page lists one or more non-legendary "<X> Talents" h1 sections
 * (a plain sphere has just one; some, like Warleader or Beastmastery, split
 * into several sub-categories) followed by a "Legendary Talents" section,
 * which is deliberately excluded — a bonus talent is never legendary.
 *
 *   npm run scrape:sphere-talents
 *   npm run scrape:sphere-talents -- --write-db
 *
 * Output: data/talents/sphere-talents.json
 * HTML cached under .cache/spheres/ (git-ignored).
 */

const BASE = "http://spheresofpower.wikidot.com";
const CACHE_DIR = ".cache/spheres";
const OUT_DIR = "data/talents";
const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;

// Matches the exact sphereName strings already used by the scraped
// sphere-specific martial drawbacks (see data/traditions/martial-drawbacks.json).
const BASE_MARTIAL_SPHERES = [
  "Alchemy",
  "Athletics",
  "Barrage",
  "Barroom",
  "Beastmastery",
  "Berserker",
  "Boxing",
  "Brute",
  "Dual Wielding",
  "Duelist",
  "Fencing",
  "Gladiator",
  "Guardian",
  "Lancer",
  "Leadership",
  "Open Hand",
  "Scoundrel",
  "Scout",
  "Shield",
  "Sniper",
  "Tech",
  "Tinker",
  "Trap",
  "Warleader",
  "Wrestling",
];

// Most sphere pages live at the plain kebab-case slug, but a few collide
// with an unrelated page of the same name (e.g. "/warleader" is a cavalier
// archetype, not the sphere) and need the "-sphere" suffix instead.
const SLUG_OVERRIDES: Record<string, string> = {
  Warleader: "warleader-sphere",
};

const slugFor = (name: string) =>
  SLUG_OVERRIDES[name] ??
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const REFRESH = has("refresh");
const WRITE_DB = has("write-db");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getHtml(slug: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cached = join(CACHE_DIR, `${slug}.html`);
  if (!REFRESH && existsSync(cached)) return readFile(cached, "utf8");
  const url = `${BASE}/${slug}`;
  process.stdout.write(`  fetch ${url} … `);
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const html = await res.text();
  await writeFile(cached, html);
  console.log(`${(html.length / 1024).toFixed(0)} KB`);
  await sleep(DELAY_MS);
  return html;
}

function clean(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips a "(stance)" tag and any bracketed source tag (e.g. "[LG]",
 * "[High. HB]") from a scraped heading down to a clean display name. */
function cleanTalentName(raw: string): string {
  return clean(raw.replace(/\[[^\]]+\]/g, "").replace(/\(stance\)/gi, ""));
}

interface SphereTalent {
  sphereName: string;
  name: string;
  description: string;
}

/**
 * Walk the page collecting every h4 (name) + trailing body text under any
 * section heading ending in "Talents". Most sphere pages use h1 for these
 * section headings, but several (Leadership, Tech, Tinker, …) use h2
 * instead — and even within one page "Legendary Talents" isn't always at
 * the same level as its siblings — so both are treated as equivalent
 * section-level headings. A sphere may split its talents across several
 * such sections (e.g. "Handle Animal Talents", "Ride Talents"); collection
 * stops for good the first time a "Legendary Talents" heading is reached —
 * those, and anything after them (including the page's later
 * self-transclusion), are excluded.
 */
function parseSpherePage(html: string, sphereName: string): SphereTalent[] {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find("script, style, .code").remove();

  const out: SphereTalent[] = [];
  const seenHeadings = new Set<string>();
  let collecting = false;
  let done = false;
  let current: { name: string } | null = null;
  const bodyBuf: string[] = [];

  const flush = () => {
    if (current) {
      out.push({
        sphereName,
        name: cleanTalentName(current.name),
        description: bodyBuf.join(" "),
      });
    }
    current = null;
    bodyBuf.length = 0;
  };

  content.find("h1, h2, h4, p, li").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;

    if (tag === "h1" || tag === "h2") {
      flush();
      if (done) {
        collecting = false;
        return;
      }
      if (/^legendary talents$/i.test(raw)) {
        done = true;
        collecting = false;
        return;
      }
      if (/talents$/i.test(raw) && !seenHeadings.has(raw)) {
        seenHeadings.add(raw);
        collecting = true;
        return;
      }
      collecting = false;
      return;
    }
    if (!collecting || done) return;

    if (tag === "h4") {
      flush();
      current = { name: raw };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

async function writeToDb(talents: SphereTalent[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const t of talents) {
      const source = `Spheres of Might wiki (${slugFor(t.sphereName)})`;
      await prisma.talent.upsert({
        where: { name_source: { name: t.name, source } },
        create: {
          name: t.name,
          sphereName: t.sphereName,
          talentTypes: [],
          description: t.description,
          source,
          isSrd: true,
        },
        update: {
          description: t.description,
        },
      });
    }
    console.log(`  db: ${talents.length} base martial sphere talents`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const all: SphereTalent[] = [];
  for (const sphereName of BASE_MARTIAL_SPHERES) {
    const slug = slugFor(sphereName);
    const html = await getHtml(slug);
    const talents = parseSpherePage(html, sphereName);
    console.log(`${sphereName}: ${talents.length} talents`);
    all.push(...talents);
  }
  console.log(
    `\nTotal: ${all.length} talents across ${BASE_MARTIAL_SPHERES.length} base martial spheres.`,
  );
  await writeFile(
    join(OUT_DIR, "sphere-talents.json"),
    JSON.stringify(all, null, 2) + "\n",
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(all);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
