import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";

/**
 * Scrape sphere + talent data from the community Spheres of Power wiki.
 *
 *   npm run scrape:spheres                     # all spheres -> data/spheres/*.json
 *   npm run scrape:spheres -- --only destruction --refresh
 *   npm run scrape:spheres -- --write-db       # also upsert into the DB
 *   npm run scrape:spheres -- --include-3pp --include-hb
 *
 * Fetched HTML is cached under .cache/spheres/ (both git-ignored). Requests are
 * rate-limited and send a descriptive User-Agent. The wiki's robots.txt permits
 * this; the content is Open Game Content (see ATTRIBUTION.md). Product Identity
 * (setting names, adventure text, art) is not on these pages and is not scraped.
 *
 * The parse is deliberately conservative — sphere pages carry legacy "Old"
 * sections, homebrew ([… HB]) and third-party ([3PP]) talents, and archetype /
 * feat sections mixed in. We stop at the first legacy/feat/archetype heading and
 * skip HB / 3PP unless asked. Expect to hand-check the output.
 */

const BASE = "http://spheresofpower.wikidot.com";
const CACHE_DIR = ".cache/spheres";
const OUT_DIR = "data/spheres";
const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const opt = (f: string) => {
  const i = args.indexOf(`--${f}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ONLY = opt("only");
const TYPE = opt("type") as SphereType | undefined;
const REFRESH = has("refresh");
const WRITE_DB = has("write-db");
const INCLUDE_3PP = has("include-3pp");
const INCLUDE_HB = has("include-hb");
// Write only the Sphere catalog rows (name/type/description), skipping each
// sphere's talent list — for topping up Sphere rows (e.g. the Might/Guile
// types, needed so the wizard can resolve a talent's sphere type) without
// re-writing talents already covered by scrape-sphere-talents.ts /
// scrape-equipment-talents.ts under a different `source` tag, which would
// just duplicate them.
const SPHERES_ONLY = has("spheres-only");

type SphereType = "MAGIC" | "MIGHT" | "GUILE";
interface SphereMeta {
  slug: string;
  name: string;
  type: SphereType;
}

// From the wiki's own navigation. Variant/mascot pages (polished-dark, bear)
// and pure-index pages are intentionally omitted.
const SPHERES: SphereMeta[] = [
  // Spheres of Power (magic)
  ...m("MAGIC", [
    ["alteration", "Alteration"],
    ["blood", "Blood"],
    ["conjuration", "Conjuration"],
    ["creation", "Creation"],
    ["dark", "Dark"],
    ["death", "Death"],
    ["destruction", "Destruction"],
    ["divination", "Divination"],
    ["enhancement", "Enhancement"],
    ["fallen-fey", "Fallen Fey"],
    ["fate", "Fate"],
    ["illusion", "Illusion"],
    ["life", "Life"],
    ["light", "Light"],
    ["mana", "Mana"],
    ["mind", "Mind"],
    ["nature", "Nature"],
    ["protection", "Protection"],
    ["telekinesis", "Telekinesis"],
    ["time", "Time"],
    ["war", "War"],
    ["warp", "Warp"],
    ["weather", "Weather"],
    ["technomancy", "Technomancy"],
  ]),
  // Spheres of Might (martial)
  ...m("MIGHT", [
    ["alchemy", "Alchemy"],
    ["athletics", "Athletics"],
    ["barrage", "Barrage"],
    ["barroom", "Barroom"],
    ["beastmastery", "Beastmastery"],
    ["berserker", "Berserker"],
    ["boxing", "Boxing"],
    ["brute", "Brute"],
    ["dual-wielding", "Dual Wielding"],
    ["duelist", "Duelist"],
    ["equipment-sphere", "Equipment"],
    ["fencing", "Fencing"],
    ["gladiator", "Gladiator"],
    ["guardian", "Guardian"],
    ["lancer", "Lancer"],
    ["open-hand", "Open Hand"],
    ["scoundrel", "Scoundrel"],
    ["scout", "Scout"],
    ["shield", "Shield"],
    ["sniper", "Sniper"],
    ["trap", "Trap"],
    ["warleader-sphere", "Warleader"],
    ["wrestling", "Wrestling"],
  ]),
  // Spheres of Guile (skill)
  ...m("GUILE", [
    ["artifice", "Artifice"],
    ["bluster", "Bluster"],
    ["body-control", "Body Control"],
    ["communication", "Communication"],
    ["faction", "Faction"],
    ["herbalism", "Herbalism"],
    ["infiltration", "Infiltration"],
    ["investigation", "Investigation"],
    ["navigation", "Navigation"],
    ["performance", "Performance"],
    ["spellhacking", "Spellhacking"],
    ["study", "Study"],
    ["subterfuge", "Subterfuge"],
    ["survivalism", "Survivalism"],
    ["vocation", "Vocation"],
  ]),
];

function m(type: SphereType, rows: [string, string][]): SphereMeta[] {
  return rows.map(([slug, name]) => ({ slug, name, type }));
}

// --- fetch + cache -------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getHtml(slug: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cached = join(CACHE_DIR, `${slug}.html`);
  if (!REFRESH && existsSync(cached)) return readFile(cached, "utf8");

  const url = `${BASE}/${slug}`;
  process.stdout.write(`  fetch ${url} … `);
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const html = await res.text();
  await writeFile(cached, html);
  console.log(`${(html.length / 1024).toFixed(0)} KB`);
  await sleep(DELAY_MS);
  return html;
}

// --- parse -------------------------------------------------------------

interface ScrapedTalent {
  name: string;
  sphereName: string;
  talentTypes: string[];
  source: string;
  description: string;
  sourceUrl: string;
}
interface ScrapedSphere {
  slug: string;
  name: string;
  type: SphereType;
  description: string;
  source: string;
  url: string;
  talents: ScrapedTalent[];
}

const STOP_HEADING =
  /^(old\b|.*\bfeats?$|archetypes?\b|.*\barchetypes\b|wild magic|adaptation|descriptors?|.*\bdrawbacks?$|creating new|variant )/i;
const TALENT_SECTION = /\btalents?\b/i;
const NOT_TALENT_SECTION = /\bfeats?\b|\btalent types\b|\btype groups?\b/i;

function clean(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").replace(/[’]/g, "'").trim();
}

// Publisher/supplement abbreviations the wiki appends in brackets. Anything
// else in brackets (e.g. [range], [utility], [plan], [strike]) is a talent
// keyword, not a source.
const SUPPLEMENT_TAGS =
  /^(core|apoc|bap|drs|dbh|lg|sm—?|sm-|expanded|wtw|va|as|hd|instill)$/i;

function parseTalentName(raw: string): {
  name: string;
  parenTypes: string[];
  keywordTags: string[];
  supplementTag: string;
  homebrew: boolean;
  thirdParty: boolean;
} {
  let name = raw;
  const keywordTags: string[] = [];
  let supplementTag = "";
  let homebrew = false;
  let thirdParty = false;

  // Consume every trailing [ … ] group.
  let tagM: RegExpMatchArray | null;
  while ((tagM = name.match(/\[([^\]]+)\]\s*$/))) {
    const tag = tagM[1].trim();
    name = name.slice(0, tagM.index).trim();
    if (/\bHB\b/.test(tag)) homebrew = true;
    else if (/3pp/i.test(tag)) thirdParty = true;
    else if (SUPPLEMENT_TAGS.test(tag)) supplementTag = tag;
    else keywordTags.push(tag.toLowerCase());
  }

  const parenTypes: string[] = [];
  const parenM = name.match(/\(([^)]+)\)\s*$/);
  if (parenM) {
    parenM[1]
      .split(",")
      .map((t) => clean(t).toLowerCase())
      .filter(Boolean)
      .forEach((t) => parenTypes.push(t));
    name = name.slice(0, parenM.index).trim();
  }
  return {
    name: clean(name),
    parenTypes,
    keywordTags: keywordTags.reverse(),
    supplementTag,
    homebrew,
    thirdParty,
  };
}

function sectionType(sectionName: string): string[] {
  const s = sectionName.toLowerCase();
  const types: string[] = [];
  if (/\badvanced\b/.test(s)) types.push("advanced");
  if (/\bblast shape\b/.test(s)) types.push("blast shape");
  if (/\bblast type\b/.test(s)) types.push("blast type");
  return types;
}

function parseSphere(html: string, meta: SphereMeta): ScrapedSphere {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find(".code, script, style").remove();

  const sphere: ScrapedSphere = {
    ...meta,
    description: "",
    source: "Spheres of Power wiki",
    url: `${BASE}/${meta.slug}`,
    talents: [],
  };

  const intro: string[] = [];
  let section = "";
  let inTalents = false;
  let stopped = false;
  const seen = new Set<string>();

  content.find("h1, h2, h3, h4, p").each((_i, el) => {
    if (stopped) return;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const text = clean($(el).text());
    if (!text) return;

    if (tag === "p") {
      if (
        !inTalents &&
        sphere.talents.length === 0 &&
        intro.join(" ").length < 1200
      ) {
        intro.push(text);
      }
      return;
    }

    if (tag === "h4") {
      if (!inTalents) return;
      const parsed = parseTalentName(text);
      if (!parsed.name || seen.has(parsed.name.toLowerCase())) return;
      if (parsed.homebrew && !INCLUDE_HB) return;
      if (parsed.thirdParty && !INCLUDE_3PP) return;
      seen.add(parsed.name.toLowerCase());

      const body = $(el)
        .nextUntil("h1, h2, h3, h4")
        .toArray()
        .map((n) => clean($(n).text()))
        .filter(Boolean)
        .join("\n\n")
        .replace(/^Source:.*(?:\n\n|$)/i, "") // drop leading 3pp citation line
        .trim()
        .slice(0, 2500);

      const headingId = $(el).attr("id");
      sphere.talents.push({
        name: parsed.name,
        sphereName: meta.name,
        talentTypes: Array.from(
          new Set([
            ...parsed.parenTypes,
            ...parsed.keywordTags,
            ...sectionType(section),
          ]),
        ),
        source: parsed.supplementTag
          ? `Spheres of Power wiki [${parsed.supplementTag}]`
          : "Spheres of Power wiki",
        description: body,
        sourceUrl: headingId ? `${sphere.url}#${headingId}` : sphere.url,
      });
      return;
    }

    // h1 / h2 / h3 — section boundary
    if (STOP_HEADING.test(text)) {
      if (sphere.talents.length > 0) stopped = true;
      inTalents = false;
      return;
    }
    section = text;
    inTalents = TALENT_SECTION.test(text) && !NOT_TALENT_SECTION.test(text);
  });

  sphere.description = clean(intro.join(" ")).slice(0, 1500);
  return sphere;
}

// --- db ----------------------------------------------------------------

async function writeToDb(spheres: ScrapedSphere[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const s of spheres) {
      const row = await prisma.sphere.upsert({
        where: { name_source: { name: s.name, source: s.source } },
        create: {
          name: s.name,
          type: s.type,
          description: s.description,
          source: s.source,
          isSrd: true,
          data: { slug: s.slug, url: s.url },
        },
        update: { description: s.description, type: s.type },
      });
      if (SPHERES_ONLY) {
        console.log(`  db: ${s.name} (sphere row only)`);
        continue;
      }
      for (const t of s.talents) {
        // Talent names repeat across spheres (e.g. "Extended Range"), so the
        // sphere name is folded into `source` to keep [name, source] unique.
        const talentSource = `${t.source} (${s.name})`;
        await prisma.talent.upsert({
          where: { name_source: { name: t.name, source: talentSource } },
          create: {
            name: t.name,
            sphereId: row.id,
            sphereName: t.sphereName,
            talentTypes: t.talentTypes,
            description: t.description,
            sourceUrl: t.sourceUrl,
            source: talentSource,
            isSrd: true,
          },
          update: {
            description: t.description,
            talentTypes: t.talentTypes,
            sphereId: row.id,
            sourceUrl: t.sourceUrl,
          },
        });
      }
      console.log(`  db: ${s.name} (+${s.talents.length} talents)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// --- main ------------------------------------------------------------

async function main() {
  let targets = ONLY ? SPHERES.filter((s) => s.slug === ONLY) : SPHERES;
  if (TYPE) targets = targets.filter((s) => s.type === TYPE);
  if (targets.length === 0) {
    console.error(`No sphere matches --only ${ONLY} --type ${TYPE}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const scraped: ScrapedSphere[] = [];
  let talentTotal = 0;

  for (const meta of targets) {
    const html = await getHtml(meta.slug);
    const sphere = parseSphere(html, meta);
    scraped.push(sphere);
    talentTotal += sphere.talents.length;
    await writeFile(
      join(OUT_DIR, `${meta.slug}.json`),
      JSON.stringify(sphere, null, 2) + "\n",
    );
    console.log(
      `  ${meta.name.padEnd(16)} ${String(sphere.talents.length).padStart(3)} talents  ${
        sphere.description ? "" : "(no intro!)"
      }`,
    );
  }

  console.log(
    `\n${scraped.length} spheres, ${talentTotal} talents -> ${OUT_DIR}/`,
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(scraped);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
