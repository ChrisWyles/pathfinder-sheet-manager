import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";

/**
 * Scrape Spheres of Power feats from two kinds of pages:
 *
 *  1. The 29 category pages linked from http://spheresofpower.wikidot.com/feats
 *     (Combat, Racial, Drawback, Item Creation, Teamwork, Admixture, …) — each
 *     a flat list of feats, tagged with that page's category.
 *  2. Each of the 24 magic spheres' own "<Sphere> Sphere Feats" section
 *     (e.g. Destruction's own page) — tagged with that sphere's name.
 *
 * The two overlap (a sphere's associated category, e.g. Destruction's
 * Admixture feats, is fully re-listed on the sphere's own page right after
 * its exclusive list) — feats are merged by name rather than duplicated, so
 * a feat scraped from both ends up with every applicable tag on one row.
 *
 *   npm run scrape:feats
 *   npm run scrape:feats -- --write-db
 *
 * Output: data/feats/feats.json
 * HTML cached under .cache/feats/ (category pages) and .cache/spheres/
 * (sphere pages, shared with scrape-sphere-talents.ts) — both git-ignored.
 */

const BASE = "http://spheresofpower.wikidot.com";
const CATEGORY_CACHE_DIR = ".cache/feats";
const SPHERE_CACHE_DIR = ".cache/spheres";
const OUT_DIR = "data/feats";
const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;
const SOURCE = "Spheres of Power wiki (feats)";

const CATEGORY_SLUGS = [
  "admixture-feats",
  "anathema-feats",
  "aristeia-feats",
  "champion-feats",
  "chance-feats",
  "channeling-feats",
  "combat-feats",
  "companion-feats",
  "counterspell-feats",
  "damnation-feats",
  "drawback-feats",
  "extra-feats",
  "general-feats",
  "item-creation-feats",
  "metamagic-feats",
  "necrosis-feats",
  "plague-feats",
  "practitioner-feats",
  "protokinesis-feats",
  "proxy-feats",
  "purring-feats",
  "racial-feats",
  "ritual-feats",
  "skybourne-feats",
  "squadron-feats",
  "surreal-feats",
  "teamwork-feats",
  "theurge-feats",
  "wild-magic-feats",
];

/** The 24 magic spheres known to have their own "<Sphere> Sphere Feats"
 * section (matches the sphereName values already used by the scraped
 * casting sphere-specific drawbacks). */
const MAGIC_SPHERES = [
  "Alteration",
  "Blood",
  "Conjuration",
  "Creation",
  "Dark",
  "Death",
  "Destruction",
  "Divination",
  "Enhancement",
  "Fallen Fey",
  "Fate",
  "Illusion",
  "Life",
  "Light",
  "Mana",
  "Mind",
  "Nature",
  "Protection",
  "Technomancy",
  "Telekinesis",
  "Time",
  "War",
  "Warp",
  "Weather",
];

const slugFor = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Every magic sphere's feats section is headed "<Sphere> Sphere Feats"
// except this third-party one, which just uses a bare "Feats" heading.
const SECTION_HEADING_OVERRIDES: Record<string, string> = {
  Technomancy: "Feats",
};

/** "General Feats" -> "General"; "Item Creation Feats" -> "Item Creation". */
const categoryLabel = (slug: string) =>
  slug
    .replace(/-feats$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const REFRESH = has("refresh");
const WRITE_DB = has("write-db");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getHtml(cacheDir: string, slug: string): Promise<string> {
  await mkdir(cacheDir, { recursive: true });
  const cached = join(cacheDir, `${slug}.html`);
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

interface ParsedHeading {
  name: string;
  featTypes: string[];
  sourceTag: string;
}

/**
 * "Improved Assistance (Champion, Combat) [S&P]" -> name "Improved
 * Assistance", featTypes ["Champion", "Combat"], sourceTag "S&P". Peels
 * trailing "(...)" groups off one at a time as long as they look like a
 * comma-separated list of Title Case words — which stops at the first
 * prose aside instead (e.g. "Capture Spell (replaces Scribe Scroll) (Item
 * Creation)" keeps "(replaces Scribe Scroll)" as part of the name, but still
 * pulls "Item Creation" out as a type).
 */
function parseFeatHeading(raw: string): ParsedHeading {
  let s = clean(raw);
  const bracketMatch = s.match(/\s*\[([^\]]*)\]\s*$/);
  const sourceTag = bracketMatch ? bracketMatch[1].trim() : "";
  if (bracketMatch) s = s.slice(0, bracketMatch.index).trim();

  const featTypes: string[] = [];
  let m: RegExpMatchArray | null;
  while ((m = s.match(/\s*\(([^)]*)\)\s*$/))) {
    const pieces = m[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const looksLikeTypes =
      pieces.length > 0 &&
      pieces.every((p) => /^[A-Z][A-Za-z]*(?:\s[A-Z][A-Za-z]*)*$/.test(p));
    if (!looksLikeTypes) break;
    featTypes.unshift(...pieces);
    s = s.slice(0, m.index).trim();
  }
  return { name: s, featTypes, sourceTag };
}

interface RawFeatEntry {
  name: string;
  featTypes: string[];
  description: string;
}

/** Walks a flat run of h3/h4 entries (name headings) + trailing body text,
 * within the given cheerio selection. */
function collectFeatEntries(
  $: cheerio.CheerioAPI,
  region: ReturnType<cheerio.CheerioAPI>,
): RawFeatEntry[] {
  const out: RawFeatEntry[] = [];
  let current: { heading: ParsedHeading } | null = null;
  const bodyBuf: string[] = [];

  const flush = () => {
    if (current) {
      out.push({
        name: current.heading.name,
        featTypes: current.heading.featTypes,
        description: bodyBuf.join(" "),
      });
    }
    current = null;
    bodyBuf.length = 0;
  };

  region.find("h3, h4, p, li").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;

    if (tag === "h3" || tag === "h4") {
      flush();
      current = { heading: parseFeatHeading(raw) };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

/** A category page (e.g. /combat-feats) is one flat list covering the whole
 * page — no section boundary needed, no legacy "Old" content to skip. */
function parseCategoryPage($doc: cheerio.CheerioAPI): RawFeatEntry[] {
  const content = $doc("#page-content");
  content.find("script, style, .code").remove();
  return collectFeatEntries($doc, content);
}

/** A magic sphere's own page: the first "<Sphere> Sphere Feats" h1 region,
 * ending at the next h1 (which is always a full re-listing of the
 * associated category page — skip it; that's scraped directly instead). */
function parseSpherePage($doc: cheerio.CheerioAPI, sphereName: string): RawFeatEntry[] {
  const content = $doc("#page-content");
  content.find("script, style, .code").remove();

  const headingText = SECTION_HEADING_OVERRIDES[sphereName] ?? `${sphereName} Sphere Feats`;
  const sectionRe = new RegExp(`^${headingText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  let inSection = false;
  let done = false;
  let current: { heading: ParsedHeading } | null = null;
  const bodyBuf: string[] = [];
  const out: RawFeatEntry[] = [];

  const flush = () => {
    if (current) {
      out.push({
        name: current.heading.name,
        featTypes: current.heading.featTypes,
        description: bodyBuf.join(" "),
      });
    }
    current = null;
    bodyBuf.length = 0;
  };

  content.find("h1, h3, h4, p, li").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($doc(el).text());
    if (!raw) return;

    if (tag === "h1") {
      flush();
      if (inSection) {
        inSection = false;
        done = true;
      } else if (!done && sectionRe.test(raw)) {
        inSection = true;
      }
      return;
    }
    if (!inSection) return;

    if (tag === "h3" || tag === "h4") {
      flush();
      current = { heading: parseFeatHeading(raw) };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

/** Splits a feat's body text into (Prerequisite(s): / Benefit:) if labeled,
 * else leaves it all as the description. */
function splitBody(full: string): {
  prerequisites: string;
  benefit: string;
  description: string;
} {
  const prereqMatch = full.match(
    /Prerequisites?:\s*(.*?)(?=\s*Benefits?:|$)/i,
  );
  const benefitMatch = full.match(/Benefits?:\s*(.*)$/i);
  const clip = (s: string, n = 1000) =>
    s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;
  return {
    prerequisites: clip(prereqMatch ? prereqMatch[1].trim() : "", 300),
    benefit: clip(benefitMatch ? benefitMatch[1].trim() : full),
    description: clip(full),
  };
}

interface FeatRecord {
  name: string;
  featTypes: Set<string>;
  sphereName: string;
  prerequisites: string;
  benefit: string;
  description: string;
}

function mergeEntry(
  byName: Map<string, FeatRecord>,
  entry: RawFeatEntry,
  extraTag: string,
  sphereName: string | null,
) {
  const key = entry.name.toLowerCase();
  const { prerequisites, benefit, description } = splitBody(entry.description);
  const existing = byName.get(key);
  if (existing) {
    for (const t of entry.featTypes) existing.featTypes.add(t);
    if (extraTag) existing.featTypes.add(extraTag);
    if (sphereName) existing.sphereName = sphereName;
    if (!existing.benefit && benefit) existing.benefit = benefit;
    if (!existing.prerequisites && prerequisites) existing.prerequisites = prerequisites;
    if (!existing.description && description) existing.description = description;
    return;
  }
  const featTypes = new Set(entry.featTypes);
  if (extraTag) featTypes.add(extraTag);
  byName.set(key, {
    name: entry.name,
    featTypes,
    sphereName: sphereName ?? "",
    prerequisites,
    benefit,
    description,
  });
}

async function writeToDb(feats: FeatRecord[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const f of feats) {
      const featTypes = [...f.featTypes];
      await prisma.feat.upsert({
        where: { name_source: { name: f.name, source: SOURCE } },
        create: {
          name: f.name,
          featTypes,
          sphereName: f.sphereName,
          prerequisites: f.prerequisites,
          benefit: f.benefit,
          description: f.description,
          source: SOURCE,
          isSrd: true,
        },
        update: {
          featTypes,
          sphereName: f.sphereName,
          prerequisites: f.prerequisites,
          benefit: f.benefit,
          description: f.description,
        },
      });
    }
    console.log(`  db: ${feats.length} feats`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const byName = new Map<string, FeatRecord>();

  for (const slug of CATEGORY_SLUGS) {
    const html = await getHtml(CATEGORY_CACHE_DIR, slug);
    const $doc = cheerio.load(html);
    const entries = parseCategoryPage($doc);
    const category = categoryLabel(slug);
    for (const e of entries) mergeEntry(byName, e, category, null);
    console.log(`${category}: ${entries.length} feats`);
  }

  for (const sphereName of MAGIC_SPHERES) {
    const slug = slugFor(sphereName);
    const html = await getHtml(SPHERE_CACHE_DIR, slug);
    const $doc = cheerio.load(html);
    const entries = parseSpherePage($doc, sphereName);
    for (const e of entries) mergeEntry(byName, e, "", sphereName);
    console.log(`${sphereName} sphere: ${entries.length} feats`);
  }

  const feats = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log(
    `\nTotal: ${feats.length} distinct feats (${feats.filter((f) => f.sphereName).length} sphere-tagged).`,
  );

  await writeFile(
    join(OUT_DIR, "feats.json"),
    JSON.stringify(
      feats.map((f) => ({ ...f, featTypes: [...f.featTypes] })),
      null,
      2,
    ) + "\n",
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(feats);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
