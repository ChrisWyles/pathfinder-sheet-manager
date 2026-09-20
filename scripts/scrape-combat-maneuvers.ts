import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as cheerio from "cheerio";

import { cleanText, getHtmlCached } from "./pfsrd-html";

/**
 * Scrape the "Combat Maneuvers" section (Bull Rush through Trip) plus Feint
 * from https://www.d20pfsrd.com/GAMEMASTERING/COMBAT/#TOC-Combat-Maneuvers
 *
 * This is small, fixed reference content (11 entries, effectively static)
 * rather than a per-character catalog, so unlike the weapon/armor/feat
 * scrapers it writes straight to a bundled JSON data file — no DB table.
 *
 *   npm run scrape:combat-maneuvers
 *
 * Output: data/rules/combat-maneuvers.json
 * HTML cached under .cache/pfsrd/ (git-ignored).
 */

const URL = "https://www.d20pfsrd.com/GAMEMASTERING/COMBAT/";
const OUT_DIR = "data/rules";

const args = process.argv.slice(2);
const REFRESH = args.includes("--refresh");

// The 10 official PF1e combat maneuvers, in the order the page lists them,
// plus Feint — not technically a combat maneuver (it's a Bluff check, not a
// CMB roll — the page says as much), but the user wants it alongside them.
const MANEUVER_NAMES = [
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
  "Feint",
] as const;
const NAME_SET = new Set<string>(MANEUVER_NAMES);

// Feint is a Bluff check (see its scraped description) — every other entry
// rolls an attack using CMB.
const CMB_BASED = new Set<string>(MANEUVER_NAMES.filter((n) => n !== "Feint"));

interface CombatManeuver {
  name: string;
  slug: string;
  isCmbBased: boolean;
  description: string;
  sourceUrl: string;
}

// Matches "Improved Bull Rush", "Greater Trip", "Improved Grapple", etc. —
// every one of these sentences either names a specific feat or (Grapple's
// case) reads "Improved Grapple ... or a similar ability" without ever
// saying the word "feat", so this anchors on the feat-name shape instead.
const FEAT_REFERENCE_RE = /\b(?:Improved|Greater)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/;
const HEADING_RE = /^\*\*.*\*\*$/;

/** Drops wiki FAQ/editorial preamble that sometimes precedes the official
 * rules text under a heading, marked by a standalone "[Source]" paragraph —
 * everything up to and including it is discarded, keeping only what
 * follows. A leading "Source: XYZ" citation line (no brackets) is just
 * dropped outright rather than used as a cut point. Also strips any
 * sentence that references a specific "Improved X"/"Greater X" feat — the
 * app re-inserts the real feat text per-character when the player has it
 * (see src/lib/rules/combat-maneuvers.ts) rather than showing this
 * generic "unless you have the feat" caveat to everyone. */
function cleanParagraphs(paragraphs: string[]): string[] {
  const sourceMarkerIndex = paragraphs.findIndex(
    (p) => p.trim().toLowerCase() === "[source]",
  );
  const afterSource =
    sourceMarkerIndex === -1
      ? paragraphs
      : paragraphs.slice(sourceMarkerIndex + 1);
  const noCitations = afterSource.filter((p) => !/^source:/i.test(p.trim()));

  const stripped = noCitations.map((p) => {
    if (HEADING_RE.test(p.trim())) return p;
    const sentences = p.split(/(?<=\.)\s+(?=[A-Z])/);
    return sentences
      .filter((s) => !FEAT_REFERENCE_RE.test(s))
      .join(" ")
      .trim();
  });

  // Drop empty paragraphs, and any heading left with nothing under it once
  // its only sentence was a feat reference (e.g. Feint's "Feinting as a
  // Move Action" subheading, whose sole sentence names Improved Feint).
  const out: string[] = [];
  for (let i = 0; i < stripped.length; i++) {
    const text = stripped[i];
    if (HEADING_RE.test(text.trim())) {
      const next = stripped[i + 1];
      if (!next || !next.trim()) {
        i++; // skip this heading and its now-empty body together
        continue;
      }
      out.push(text);
      continue;
    }
    if (text.trim()) out.push(text);
  }
  return out;
}

function parseCombatPage(html: string): {
  overview: string;
  maneuvers: CombatManeuver[];
} {
  const $ = cheerio.load(html);
  const content = $("#page-content, .page-content, article").first();

  type Phase = "before" | "in" | "done";
  let phase: Phase = "before";
  let current: string | null = null;
  const byName = new Map<string, string[]>();
  const overview: string[] = [];

  content.find("h1,h2,h3,h4,h5,h6,p,li").each((_i, el) => {
    if (phase === "done") return;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const text = cleanText($(el).text());
    if (!text) return;

    if (tag === "h3") {
      if (/^combat maneuvers$/i.test(text)) {
        phase = "in";
        current = null;
        return;
      }
      if (phase === "in") {
        if (NAME_SET.has(text)) {
          current = text;
          if (!byName.has(text)) byName.set(text, []);
        } else {
          // Any other h3 while inside the section marks the end — whether
          // it's the 3PP appendix or an unrelated section further down.
          phase = "done";
        }
      }
      return;
    }

    if (phase !== "in") return;

    if (tag === "h4" || tag === "h5" || tag === "h6") {
      if (NAME_SET.has(text)) {
        current = text;
        if (!byName.has(text)) byName.set(text, []);
        return;
      }
      // A sub-heading within the current maneuver (e.g. "Pin") or, before
      // any maneuver has started, within the general CMB/CMD overview.
      const bolded = `**${text}**`;
      if (current) byName.get(current)!.push(bolded);
      else overview.push(bolded);
      return;
    }

    if (tag === "p" || tag === "li") {
      if (current) byName.get(current)!.push(text);
      else overview.push(text);
    }
  });

  const maneuvers = MANEUVER_NAMES.map((name) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    isCmbBased: CMB_BASED.has(name),
    description: cleanParagraphs(byName.get(name) ?? []).join("\n\n"),
    sourceUrl: `${URL}#TOC-${name.replace(/\s+/g, "-")}`,
  }));

  return { overview: overview.join("\n\n"), maneuvers };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const html = await getHtmlCached(URL, "combat", REFRESH);
  const { overview, maneuvers } = parseCombatPage(html);

  const missing = maneuvers.filter((m) => !m.description);
  if (missing.length > 0) {
    console.warn(
      `Warning: no body text captured for: ${missing.map((m) => m.name).join(", ")}`,
    );
  }
  console.log(`Combat maneuvers: ${maneuvers.length} entries.`);

  await writeFile(
    join(OUT_DIR, "combat-maneuvers.json"),
    JSON.stringify({ overview, maneuvers }, null, 2) + "\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
