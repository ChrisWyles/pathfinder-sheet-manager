import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import {
  parseDrawbackCost,
  parseGrants,
  parsePrerequisites,
  isRepeatable,
} from "../src/lib/rules/casting-tradition";
import { normalizePgUrl } from "../src/lib/pg-url";

const asJson = (v: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/**
 * Scrape the Spheres of Power casting- and martial-tradition building blocks:
 * general drawbacks + boons (casting), sphere-specific drawbacks by magic
 * sphere (casting) and by combat sphere (martial). The general-drawback/boon
 * economy (2 drawbacks per boon, bonus spell points for the rest) lives in
 * src/lib/rules/casting-tradition.ts, not here — sphere-specific drawbacks
 * are a separate mechanic (a bonus talent in that sphere) and aren't part
 * of it.
 *
 *   npm run scrape:traditions
 *   npm run scrape:traditions -- --write-db
 *
 * Output: data/traditions/{casting-drawbacks,casting-boons,casting-sphere-drawbacks,martial-drawbacks}.json
 * HTML cached under .cache/traditions/ (git-ignored).
 */

const BASE = "http://spheresofpower.wikidot.com";
const CACHE_DIR = ".cache/traditions";
const OUT_DIR = "data/traditions";
const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;

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

/** `parsePrerequisites` mixes "Requires" and "Incompatible with" notes; split
 * them so each lands in its own DB column. */
function splitPrereqs(text: string): {
  prerequisites: string[];
  incompatibleWith: string[];
} {
  const all = parsePrerequisites(text);
  return {
    prerequisites: all.filter((s) => s.startsWith("Requires")),
    incompatibleWith: all.filter((s) => s.startsWith("Incompatible")),
  };
}

function clean(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips a trailing bracketed source tag (e.g. "[LG]") from a sphere
 * heading, e.g. a 3rd-party magic sphere like "Technomancy [LG]". */
function cleanSphereHeading(raw: string): string {
  return clean(raw.replace(/\[[^\]]+\]\s*$/, ""));
}

// --- shapes ----------------------------------------------------------

interface CastingDrawback {
  name: string;
  description: string;
  costInDrawbacks: number;
  prerequisites: string[];
  incompatibleWith: string[];
}
interface CastingBoon {
  name: string;
  description: string;
  costInDrawbacks: number;
  prerequisites: string[];
  repeatable: boolean;
  grants: { type: "sphere" | "talent" | "feat"; name: string }[];
}
/** Shared shape for a sphere-specific drawback — one tied to acquiring a
 * particular sphere (magic, on the casting page; combat, on the martial
 * page), granting a bonus talent in that sphere rather than feeding the
 * general drawback/boon economy. */
interface SphereDrawback {
  name: string;
  sphereName: string;
  description: string;
  costInDrawbacks: number;
  prerequisites: string[];
  incompatibleWith: string[];
}

// --- generic "first h4-region under a named heading" walker -----------

/**
 * Walk the page in document order, collecting h4 (name) + trailing body text
 * as one entry, bounded to the first occurrence of `sectionRe` (matched
 * against a heading at `sectionTag`) and ending at the next heading of
 * `endsAtTags`. Wikidot pages transclude these sections again further down
 * the page, so only the first occurrence is captured.
 */
function collectEntries(
  $: cheerio.CheerioAPI,
  content: ReturnType<cheerio.CheerioAPI>,
  sectionTag: string,
  sectionRe: RegExp,
  endsAtTags: string[],
): { name: string; description: string }[] {
  const out: { name: string; description: string }[] = [];
  let inSection = false;
  let done = false;
  let current: { name: string; description: string } | null = null;
  const bodyBuf: string[] = [];
  const flush = () => {
    if (current) {
      // Regex extractors (cost/prereqs/grants) run against the *full* text
      // downstream — only the stored description is length-capped, so a
      // defining sentence late in a long entry (e.g. Addictive Casting's
      // "counts as 2 drawbacks") is never missed.
      current.description = bodyBuf.join(" ");
      out.push(current);
    }
    current = null;
    bodyBuf.length = 0;
  };

  content.find([sectionTag, ...endsAtTags, "h4", "p", "li"].join(",")).each(
    (_i, el) => {
      const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
      const raw = clean($(el).text());
      if (!raw) return;

      if (tag === sectionTag) {
        if (inSection) {
          flush();
          inSection = false;
          done = true;
          return;
        }
        if (!done && sectionRe.test(raw)) {
          inSection = true;
        }
        return;
      }
      if (inSection && endsAtTags.includes(tag)) {
        flush();
        inSection = false;
        done = true;
        return;
      }
      if (!inSection) return;

      if (tag === "h4") {
        flush();
        current = { name: raw, description: "" };
        return;
      }
      if (current) bodyBuf.push(raw);
    },
  );
  if (inSection) flush();
  return out;
}

// --- casting page -------------------------------------------------------

function parseCastingPage(html: string): {
  drawbacks: CastingDrawback[];
  boons: CastingBoon[];
} {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find("script, style, .code").remove();

  const clip = (s: string, n = 1500) =>
    s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;

  const rawDrawbacks = collectEntries(
    $,
    content,
    "h2",
    /^general drawbacks$/i,
    ["h1", "h2"],
  );
  const drawbacks: CastingDrawback[] = rawDrawbacks.map((d) => ({
    name: d.name,
    description: clip(d.description),
    costInDrawbacks: parseDrawbackCost(d.description),
    ...splitPrereqs(d.description),
  }));

  const rawBoons = collectEntries($, content, "h1", /^boons$/i, ["h1"]);
  const boons: CastingBoon[] = rawBoons.map((b) => ({
    name: b.name,
    description: clip(b.description),
    costInDrawbacks: 2,
    prerequisites: parsePrerequisites(b.description),
    repeatable: isRepeatable(b.description),
    grants: parseGrants(b.description),
  }));

  return { drawbacks, boons };
}

/**
 * The casting page's "Sphere-Specific Drawbacks" region: h2 (region start,
 * ends at the next h1), h3 = magic sphere name (or "Universal" for the one
 * that isn't sphere-bound), h4 = drawback. Structurally the same idea as
 * the martial page's region below, just one heading level lower.
 */
function parseCastingSphereDrawbacks(html: string): SphereDrawback[] {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find("script, style, .code").remove();

  const out: SphereDrawback[] = [];
  let inSection = false;
  let done = false;
  let currentSphere = "";
  let current: { name: string } | null = null;
  const bodyBuf: string[] = [];
  const clip = (s: string, n = 1500) =>
    s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;
  const flush = () => {
    if (current) {
      const full = bodyBuf.join(" ");
      out.push({
        name: current.name,
        sphereName: currentSphere,
        description: clip(full),
        costInDrawbacks: parseDrawbackCost(full),
        ...splitPrereqs(full),
      });
    }
    current = null;
    bodyBuf.length = 0;
  };

  content.find("h1, h2, h3, h4, p, li").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;

    if (tag === "h1") {
      if (inSection) {
        flush();
        inSection = false;
        done = true;
      }
      return;
    }
    if (tag === "h2") {
      flush();
      if (inSection) {
        // A differently-named h2 shouldn't appear inside the section, but
        // guard against it ending the scrape early regardless.
        inSection = false;
        done = true;
        return;
      }
      if (!done && /^sphere-specific drawbacks$/i.test(raw)) {
        inSection = true;
      }
      return;
    }
    if (!inSection) return;

    if (tag === "h3") {
      flush();
      currentSphere = cleanSphereHeading(raw);
      return;
    }
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

// --- martial page ---------------------------------------------------

function parseMartialPage(html: string): SphereDrawback[] {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find("script, style, .code").remove();

  const out: SphereDrawback[] = [];
  let inSection = false;
  let done = false;
  let currentSphere = "";
  let current: { name: string; description: string } | null = null;
  const bodyBuf: string[] = [];
  const clip = (s: string, n = 1500) =>
    s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;
  const flush = () => {
    if (current) {
      const full = bodyBuf.join(" ");
      out.push({
        name: current.name,
        sphereName: currentSphere,
        description: clip(full),
        costInDrawbacks: parseDrawbackCost(full),
        ...splitPrereqs(full),
      });
    }
    current = null;
    bodyBuf.length = 0;
  };

  content.find("h1, h2, h3, h4, p, li").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;

    if (tag === "h1") {
      flush();
      if (inSection) {
        inSection = false;
        done = true;
      } else if (!done && /^sphere-specific drawbacks$/i.test(raw)) {
        inSection = true;
      }
      return;
    }
    if (!inSection) return;

    if (tag === "h2") {
      flush();
      currentSphere = cleanSphereHeading(raw);
      return;
    }
    if (tag === "h3" || tag === "h4") {
      flush();
      current = { name: raw, description: "" };
      return;
    }
    if (current) bodyBuf.push(raw);
  });
  flush();

  return out;
}

// --- db ------------------------------------------------------------

async function writeToDb(
  drawbacks: CastingDrawback[],
  boons: CastingBoon[],
  castingSphereDrawbacks: SphereDrawback[],
  martial: SphereDrawback[],
) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    const source = "Spheres of Power wiki (casting-traditions)";
    for (const d of drawbacks) {
      await prisma.traditionDrawback.upsert({
        where: {
          kind_name_sphereName: { kind: "CASTING", name: d.name, sphereName: "" },
        },
        create: {
          kind: "CASTING",
          name: d.name,
          description: d.description,
          costInDrawbacks: d.costInDrawbacks,
          prerequisites: d.prerequisites,
          incompatibleWith: d.incompatibleWith,
          source,
          isSrd: true,
        },
        update: {
          description: d.description,
          costInDrawbacks: d.costInDrawbacks,
          prerequisites: d.prerequisites,
          incompatibleWith: d.incompatibleWith,
        },
      });
    }
    for (const b of boons) {
      await prisma.traditionBoon.upsert({
        where: { name: b.name },
        create: {
          name: b.name,
          description: b.description,
          costInDrawbacks: b.costInDrawbacks,
          prerequisites: b.prerequisites,
          repeatable: b.repeatable,
          grants: asJson(b.grants),
          source,
          isSrd: true,
        },
        update: {
          description: b.description,
          costInDrawbacks: b.costInDrawbacks,
          prerequisites: b.prerequisites,
          repeatable: b.repeatable,
          grants: asJson(b.grants),
        },
      });
    }
    for (const d of castingSphereDrawbacks) {
      await prisma.traditionDrawback.upsert({
        where: {
          kind_name_sphereName: {
            kind: "CASTING",
            name: d.name,
            sphereName: d.sphereName,
          },
        },
        create: {
          kind: "CASTING",
          name: d.name,
          sphereName: d.sphereName,
          description: d.description,
          costInDrawbacks: d.costInDrawbacks,
          prerequisites: d.prerequisites,
          incompatibleWith: d.incompatibleWith,
          source,
          isSrd: true,
        },
        update: {
          description: d.description,
          costInDrawbacks: d.costInDrawbacks,
          prerequisites: d.prerequisites,
          incompatibleWith: d.incompatibleWith,
        },
      });
    }
    const martialSource = "Spheres of Power wiki (martial-traditions)";
    for (const d of martial) {
      await prisma.traditionDrawback.upsert({
        where: {
          kind_name_sphereName: {
            kind: "MARTIAL",
            name: d.name,
            sphereName: d.sphereName,
          },
        },
        create: {
          kind: "MARTIAL",
          name: d.name,
          sphereName: d.sphereName,
          description: d.description,
          costInDrawbacks: d.costInDrawbacks,
          prerequisites: d.prerequisites,
          incompatibleWith: d.incompatibleWith,
          source: martialSource,
          isSrd: true,
        },
        update: {
          description: d.description,
          costInDrawbacks: d.costInDrawbacks,
          prerequisites: d.prerequisites,
          incompatibleWith: d.incompatibleWith,
        },
      });
    }
    console.log(
      `  db: ${drawbacks.length} casting drawbacks, ${boons.length} boons, ${castingSphereDrawbacks.length} casting sphere-specific drawbacks, ${martial.length} martial drawbacks`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// --- main ---------------------------------------------------------

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const castingHtml = await getHtml("casting-traditions");
  const { drawbacks, boons } = parseCastingPage(castingHtml);
  console.log(
    `Casting traditions: ${drawbacks.length} general drawbacks, ${boons.length} boons`,
  );
  await writeFile(
    join(OUT_DIR, "casting-drawbacks.json"),
    JSON.stringify(drawbacks, null, 2) + "\n",
  );
  await writeFile(
    join(OUT_DIR, "casting-boons.json"),
    JSON.stringify(boons, null, 2) + "\n",
  );

  const castingSphereDrawbacks = parseCastingSphereDrawbacks(castingHtml);
  const castingBySphere = new Map<string, number>();
  for (const d of castingSphereDrawbacks) {
    castingBySphere.set(d.sphereName, (castingBySphere.get(d.sphereName) ?? 0) + 1);
  }
  console.log(
    `Casting traditions: ${castingSphereDrawbacks.length} sphere-specific drawbacks across ${castingBySphere.size} magic spheres`,
  );
  await writeFile(
    join(OUT_DIR, "casting-sphere-drawbacks.json"),
    JSON.stringify(castingSphereDrawbacks, null, 2) + "\n",
  );

  const martialHtml = await getHtml("martial-traditions");
  const martial = parseMartialPage(martialHtml);
  const bySphere = new Map<string, number>();
  for (const d of martial) bySphere.set(d.sphereName, (bySphere.get(d.sphereName) ?? 0) + 1);
  console.log(
    `Martial traditions: ${martial.length} sphere-specific drawbacks across ${bySphere.size} combat spheres`,
  );
  await writeFile(
    join(OUT_DIR, "martial-drawbacks.json"),
    JSON.stringify(martial, null, 2) + "\n",
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(drawbacks, boons, castingSphereDrawbacks, martial);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
