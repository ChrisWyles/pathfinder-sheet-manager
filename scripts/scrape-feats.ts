import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";
import { ALL_SPHERE_NAMES } from "./sphere-names";

/**
 * Scrape Spheres of Power feats from two kinds of pages:
 *
 *  1. The 29 category pages linked from http://spheresofpower.wikidot.com/feats
 *     (Combat, Racial, Drawback, Item Creation, Teamwork, Admixture, …) — each
 *     a flat list of feats, tagged with that page's category.
 *  2. Each of the 24 magic spheres' own "<Sphere> Sphere Feats" section
 *     (e.g. Destruction's own page) — a *supplementary* source of sphere
 *     tags (see below), not the primary one.
 *
 * The two overlap (a sphere's associated category, e.g. Destruction's
 * Admixture feats, is fully re-listed on the sphere's own page right after
 * its exclusive list) — feats are merged by name rather than duplicated, so
 * a feat scraped from both ends up with every applicable category tag.
 *
 * A feat's `sphereNames` is NOT simply "which sphere pages listed it",
 * though — cross-book feats (e.g. a Champion feat requiring both a magic
 * and a Might sphere, like Blood + Alchemy) are often never re-listed on
 * *any* sphere's own page at all, and a feat can be listed on a sphere's
 * page as a mere synergy note without that sphere being a real requirement
 * (see `resolveSphereNames`). So `sphereNames` is instead derived primarily
 * by scanning the feat's own Prerequisites text against every sphere name
 * across all three sphere types (Power/Might/Guile, `ALL_SPHERE_NAMES`),
 * falling back to page cross-listing only when that text names none.
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
  /** Each source `<p>`/`<li>` following the heading, kept separate (rather
   * than pre-joined) so `splitBody` can tell a self-contained "Prerequisites:
   * ..." paragraph from body prose — some pages never label the "Benefit:"
   * paragraph at all (e.g. Arcing Strike on /combat-feats), which used to
   * make the whole-blob regex swallow benefit text into `prerequisites`. */
  paragraphs: string[];
  /** Deep link to this entry's own heading on the page it was scraped from
   * (wikidot auto-assigns each heading a "#tocN" id), falling back to the
   * bare page URL if the heading somehow has none. */
  sourceUrl: string;
}

/** Walks a flat run of h3/h4 entries (name headings) + trailing body text,
 * within the given cheerio selection. */
function collectFeatEntries(
  $: cheerio.CheerioAPI,
  region: ReturnType<cheerio.CheerioAPI>,
  pageUrl: string,
): RawFeatEntry[] {
  const out: RawFeatEntry[] = [];
  let current: { heading: ParsedHeading; sourceUrl: string } | null = null;
  const bodyBuf: string[] = [];

  const flush = () => {
    if (current) {
      out.push({
        name: current.heading.name,
        featTypes: current.heading.featTypes,
        paragraphs: [...bodyBuf],
        sourceUrl: current.sourceUrl,
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
      const id = $(el).attr("id");
      current = {
        heading: parseFeatHeading(raw),
        sourceUrl: id ? `${pageUrl}#${id}` : pageUrl,
      };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

/** A category page (e.g. /combat-feats) is one flat list covering the whole
 * page — no section boundary needed, no legacy "Old" content to skip. */
function parseCategoryPage(
  $doc: cheerio.CheerioAPI,
  pageUrl: string,
): RawFeatEntry[] {
  const content = $doc("#page-content");
  content.find("script, style, .code").remove();
  return collectFeatEntries($doc, content, pageUrl);
}

/** A magic sphere's own page: the first "<Sphere> Sphere Feats" h1 region,
 * ending at the next h1 (which is always a full re-listing of the
 * associated category page — skip it; that's scraped directly instead). */
function parseSpherePage(
  $doc: cheerio.CheerioAPI,
  sphereName: string,
  pageUrl: string,
): RawFeatEntry[] {
  const content = $doc("#page-content");
  content.find("script, style, .code").remove();

  const headingText = SECTION_HEADING_OVERRIDES[sphereName] ?? `${sphereName} Sphere Feats`;
  const sectionRe = new RegExp(`^${headingText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  let inSection = false;
  let done = false;
  let current: { heading: ParsedHeading; sourceUrl: string } | null = null;
  const bodyBuf: string[] = [];
  const out: RawFeatEntry[] = [];

  const flush = () => {
    if (current) {
      out.push({
        name: current.heading.name,
        featTypes: current.heading.featTypes,
        paragraphs: [...bodyBuf],
        sourceUrl: current.sourceUrl,
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
      const id = $doc(el).attr("id");
      current = {
        heading: parseFeatHeading(raw),
        sourceUrl: id ? `${pageUrl}#${id}` : pageUrl,
      };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

/**
 * Splits a feat's paragraphs into (Prerequisite(s): / Benefit:). A
 * "Prerequisites:" label, when present, is always self-contained in its own
 * paragraph in this source (bounded by any "Benefits?:" label within that
 * *same* paragraph, for the rarer case where prereqs and benefit share one
 * `<p>`) — but it isn't always the *first* paragraph (e.g. a leading
 * "Source: ..." attribution line), so every paragraph is searched rather
 * than assuming index 0. This also sidesteps scanning the whole joined blob
 * for a "Benefits?:" label that may not exist at all on this page's copy of
 * the entry (some pages never label the benefit paragraph).
 */
function splitBody(paragraphs: string[]): {
  prerequisites: string;
  benefit: string;
  description: string;
  /** Whether an explicit "Benefit(s):" paragraph was actually found — a
   * page whose entry is missing that paragraph entirely (seen on
   * Destruction's copy of Imbue With Nature, which cuts off after
   * Prerequisites while Nature's copy has the full text) produces a
   * "benefit" that's really just a duplicate of the prerequisites clause;
   * this flag lets `mergeEntry` prefer a later, more complete source over
   * an earlier incomplete one instead of the usual first-wins rule. */
  hasBenefitLabel: boolean;
} {
  const clip = (s: string, n = 1000) =>
    s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;

  let prerequisites = "";
  let rest = paragraphs;
  const pIdx = paragraphs.findIndex((p) => /^Prerequisites?:/i.test(p));
  if (pIdx !== -1) {
    const prereqMatch = paragraphs[pIdx].match(
      /^Prerequisites?:\s*(.*?)(?=\s*Benefits?:|$)/i,
    )!;
    prerequisites = clip(prereqMatch[1].trim(), 300);
    const afterLabel = paragraphs[pIdx].slice(
      prereqMatch.index! + prereqMatch[0].length,
    );
    rest = [
      ...paragraphs.slice(0, pIdx),
      afterLabel,
      ...paragraphs.slice(pIdx + 1),
    ];
  }

  // A "Benefits?:" label, when present, may not be the very next paragraph
  // either (e.g. a "Source: ..." attribution line between Prerequisites and
  // Benefit) — search for it and drop anything before it, rather than only
  // checking rest[0] and letting unrelated lead-in text leak into benefit.
  const bIdx = rest.findIndex((p) => /^Benefits?:/i.test(p));
  if (bIdx !== -1) {
    const benefitMatch = rest[bIdx].match(/^Benefits?:\s*(.*)$/i)!;
    rest = [benefitMatch[1], ...rest.slice(bIdx + 1)];
  }

  const full = paragraphs.join(" ").trim();
  const benefit = clip(rest.join(" ").trim() || full);
  return {
    prerequisites,
    benefit,
    description: clip(full),
    hasBenefitLabel: bIdx !== -1,
  };
}

interface FeatRecord {
  name: string;
  featTypes: Set<string>;
  /** Every magic sphere whose own page lists this feat — a feat can
   * genuinely require (or be gated behind an "X or Y sphere" choice of)
   * more than one, so this is a set, not a single "winning" sphere. */
  sphereNames: Set<string>;
  prerequisites: string;
  benefit: string;
  description: string;
  hasBenefitLabel: boolean;
  /** A sphere page's listing is more specific/useful as a deep link than a
   * category page's, so it wins whenever the feat is also merged from one
   * (sphere pages are scraped after category pages in `main`, so this is
   * simply "last sphere-page merge wins" — unlike `sphereNames`, there's no
   * correctness concern here: any page that genuinely lists the feat is a
   * valid place to read about it). */
  sourceUrl: string;
}

function mergeEntry(
  byName: Map<string, FeatRecord>,
  entry: RawFeatEntry,
  extraTag: string,
  sphereName: string | null,
) {
  const key = entry.name.toLowerCase();
  const parsed = splitBody(entry.paragraphs);
  const existing = byName.get(key);
  if (existing) {
    for (const t of entry.featTypes) existing.featTypes.add(t);
    if (extraTag) existing.featTypes.add(extraTag);
    if (sphereName) {
      existing.sphereNames.add(sphereName);
      existing.sourceUrl = entry.sourceUrl;
    }
    if (parsed.hasBenefitLabel && !existing.hasBenefitLabel) {
      // A more complete source showed up after an incomplete one — prefer it.
      existing.prerequisites = parsed.prerequisites || existing.prerequisites;
      existing.benefit = parsed.benefit;
      existing.description = parsed.description;
      existing.hasBenefitLabel = true;
    } else {
      if (!existing.benefit && parsed.benefit) existing.benefit = parsed.benefit;
      if (!existing.prerequisites && parsed.prerequisites)
        existing.prerequisites = parsed.prerequisites;
      if (!existing.description && parsed.description)
        existing.description = parsed.description;
    }
    return;
  }
  const featTypes = new Set(entry.featTypes);
  if (extraTag) featTypes.add(extraTag);
  byName.set(key, {
    name: entry.name,
    featTypes,
    sphereNames: sphereName ? new Set([sphereName]) : new Set(),
    prerequisites: parsed.prerequisites,
    benefit: parsed.benefit,
    description: parsed.description,
    hasBenefitLabel: parsed.hasBenefitLabel,
    sourceUrl: entry.sourceUrl,
  });
}

/**
 * Whether `sphereName` is actually named as a requirement in `text` (a
 * feat's Prerequisites clause) — not just present as a word somewhere.
 * Matches "Blood sphere", "Death or Fate sphere", "Fate sphere; Death
 * sphere or Life sphere" and similar comma/or/and-joined lists by requiring
 * the literal word "sphere" to eventually follow, with only other
 * Title-Case words and list connectives in between — e.g. "Shield
 * Proficiency" alone never matches the Shield sphere, since no "sphere"
 * follows it.
 */
function sphereMentioned(text: string, sphereName: string): boolean {
  const esc = sphereName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameWord = `[A-Z][\\w'-]*(?:\\s[A-Z][\\w'-]*)*`;
  const re = new RegExp(
    `\\b${esc}\\b(?:\\s*\\([^)]*\\))?(?:\\s*(?:,|\\bor\\b|\\band\\b)\\s*${nameWord})*\\s+sphere\\b`,
    "i",
  );
  return re.test(text);
}

/**
 * A feat's true sphere(s) come primarily from its own Prerequisites text
 * (checked against every sphere across Power/Might/Guile, not just the 24
 * magic spheres whose own pages get scraped) — page cross-listing alone is
 * both incomplete (a cross-book feat like a Champion feat requiring Blood +
 * Alchemy is never re-listed on either sphere's own page) and sometimes
 * wrong (Arcing Strike, a Destruction feat, is also listed on Divination's
 * page purely as a synergy note — Divination is never a requirement).
 * Page-listed spheres are used only as a fallback, for the rarer feat whose
 * Prerequisites text doesn't spell any sphere name out at all.
 */
function resolveSphereNames(f: FeatRecord): string[] {
  const mentioned = ALL_SPHERE_NAMES.filter((s) =>
    sphereMentioned(f.prerequisites, s),
  );
  return (mentioned.length > 0 ? mentioned : [...f.sphereNames]).sort();
}

interface ResolvedFeat {
  name: string;
  featTypes: string[];
  sphereNames: string[];
  prerequisites: string;
  benefit: string;
  description: string;
  sourceUrl: string;
}

async function writeToDb(feats: ResolvedFeat[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const f of feats) {
      await prisma.feat.upsert({
        where: { name_source: { name: f.name, source: SOURCE } },
        create: {
          name: f.name,
          featTypes: f.featTypes,
          sphereNames: f.sphereNames,
          prerequisites: f.prerequisites,
          benefit: f.benefit,
          description: f.description,
          sourceUrl: f.sourceUrl,
          source: SOURCE,
          isSrd: true,
        },
        update: {
          featTypes: f.featTypes,
          sphereNames: f.sphereNames,
          prerequisites: f.prerequisites,
          benefit: f.benefit,
          description: f.description,
          sourceUrl: f.sourceUrl,
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
    const entries = parseCategoryPage($doc, `${BASE}/${slug}`);
    const category = categoryLabel(slug);
    for (const e of entries) mergeEntry(byName, e, category, null);
    console.log(`${category}: ${entries.length} feats`);
  }

  for (const sphereName of MAGIC_SPHERES) {
    const slug = slugFor(sphereName);
    const html = await getHtml(SPHERE_CACHE_DIR, slug);
    const $doc = cheerio.load(html);
    const entries = parseSpherePage($doc, sphereName, `${BASE}/${slug}`);
    for (const e of entries) mergeEntry(byName, e, "", sphereName);
    console.log(`${sphereName} sphere: ${entries.length} feats`);
  }

  const feats: ResolvedFeat[] = [...byName.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => ({
      name: f.name,
      featTypes: [...f.featTypes],
      sphereNames: resolveSphereNames(f),
      prerequisites: f.prerequisites,
      benefit: f.benefit,
      description: f.description,
      sourceUrl: f.sourceUrl,
    }));
  console.log(
    `\nTotal: ${feats.length} distinct feats (${feats.filter((f) => f.sphereNames.length > 0).length} sphere-tagged, ${feats.filter((f) => f.sphereNames.length > 1).length} multi-sphere).`,
  );

  await writeFile(
    join(OUT_DIR, "feats.json"),
    JSON.stringify(feats, null, 2) + "\n",
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
