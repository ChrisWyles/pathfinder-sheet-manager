import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";

/**
 * Scrape the Equipment sphere's talent lists from
 * http://spheresofpower.wikidot.com/equipment-sphere.
 *
 * The page has exactly three top-level (h1) talent sections, in order:
 * "Equipment Talents" (standard), "Discipline Talents" (marked "(discipline)"
 * in their own heading text — these plus a handful of Armor/Shield Training
 * choices are what a martial tradition's first Equipment pick is meant to
 * be), and "Legendary Talents" (deliberately NOT scraped — a martial
 * tradition never grants one of these).
 *
 *   npm run scrape:equipment-talents
 *   npm run scrape:equipment-talents -- --write-db
 *
 * Output: data/talents/equipment-talents.json
 * HTML cached under .cache/spheres/ (git-ignored).
 */

const BASE = "http://spheresofpower.wikidot.com";
const CACHE_DIR = ".cache/spheres";
const OUT_DIR = "data/talents";
const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;
const SOURCE = "Spheres of Might wiki (equipment-sphere)";

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

interface EquipmentTalent {
  name: string;
  isDiscipline: boolean;
  description: string;
}

/** Strips the "(discipline)" tag and any bracketed source tag (e.g. "[LG]",
 * "[High. HB]") from a scraped heading down to a clean display name. */
function cleanTalentName(raw: string): string {
  return clean(
    raw
      .replace(/\(discipline\)/gi, "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\(stance\)/gi, ""),
  );
}

/**
 * Walk the page in document order collecting h4 (name) + trailing body text,
 * scoped to the first "Equipment Talents" h1 region and the first
 * "Discipline Talents" h1 region that immediately follows it. Stops at
 * "Legendary Talents" (or any other h1) — those are deliberately excluded.
 */
function parseEquipmentSpherePage(html: string): EquipmentTalent[] {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find("script, style, .code").remove();

  const out: EquipmentTalent[] = [];
  let section: "none" | "equipment" | "discipline" = "none";
  let seenEquipment = false;
  let seenDiscipline = false;
  let done = false;
  let current: { name: string; isDiscipline: boolean } | null = null;
  const bodyBuf: string[] = [];

  const flush = () => {
    if (current) {
      out.push({
        name: cleanTalentName(current.name),
        isDiscipline: current.isDiscipline,
        description: bodyBuf.join(" "),
      });
    }
    current = null;
    bodyBuf.length = 0;
  };

  content.find("h1, h4, p, li").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;

    if (tag === "h1") {
      flush();
      if (!seenEquipment && /^equipment talents$/i.test(raw)) {
        section = "equipment";
        seenEquipment = true;
        return;
      }
      if (seenEquipment && !seenDiscipline && /^discipline talents$/i.test(raw)) {
        section = "discipline";
        seenDiscipline = true;
        return;
      }
      // Anything else (notably "Legendary Talents") ends the scrape.
      if (seenDiscipline) done = true;
      section = "none";
      return;
    }
    if (done || section === "none") return;

    if (tag === "h4") {
      flush();
      current = { name: raw, isDiscipline: section === "discipline" };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

async function writeToDb(talents: EquipmentTalent[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const t of talents) {
      await prisma.talent.upsert({
        where: { name_source: { name: t.name, source: SOURCE } },
        create: {
          name: t.name,
          sphereName: "Equipment",
          talentTypes: t.isDiscipline ? ["discipline"] : [],
          description: t.description,
          source: SOURCE,
          isSrd: true,
        },
        update: {
          talentTypes: t.isDiscipline ? ["discipline"] : [],
          description: t.description,
        },
      });
    }
    console.log(`  db: ${talents.length} Equipment sphere talents`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const html = await getHtml("equipment-sphere");
  const talents = parseEquipmentSpherePage(html);
  const disciplineCount = talents.filter((t) => t.isDiscipline).length;
  console.log(
    `Equipment sphere: ${talents.length} talents (${disciplineCount} discipline, ${talents.length - disciplineCount} standard); legendary talents skipped.`,
  );
  await writeFile(
    join(OUT_DIR, "equipment-talents.json"),
    JSON.stringify(talents, null, 2) + "\n",
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(talents);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
