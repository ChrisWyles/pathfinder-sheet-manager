import "../load-env";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";

type CheerioSet = ReturnType<cheerio.CheerioAPI>;
const asJson = (v: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/**
 * Scrape the Spheres classes from the community wiki and lay out, per class and
 * per level: base attack / save progression, the class-specific columns
 * (caster level, magic/combat talents, …), the class features gained, and which
 * of those are player *choices*.
 *
 *   npm run scrape:classes
 *   npm run scrape:classes -- --only incanter --refresh
 *   npm run scrape:classes -- --write-db
 *
 * Also captures, per class, its Archetypes (name + summary) and Favored Class
 * Bonuses (per-race flavor text) — both live on the same page, just skipped by
 * the class-features/choices walk above.
 *
 * Output: data/sphere-classes/<slug>.json  (+ _index.json summary).
 * HTML cached under .cache/spheres/ (git-ignored). Rate-limited, descriptive UA.
 * Content is Open Game Content (see ATTRIBUTION.md); legacy "Old" sections,
 * feats and [HB]/[3PP] material are skipped.
 */

const BASE = "http://spheresofpower.wikidot.com";
const CACHE_DIR = ".cache/spheres";
const OUT_DIR = "data/sphere-classes";
const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const optVal = (f: string) => {
  const i = args.indexOf(`--${f}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ONLY = optVal("only");
const REFRESH = has("refresh");
const WRITE_DB = has("write-db");

type Group = "spherecaster" | "practitioner" | "champion" | "operative";

interface ClassMeta {
  slug: string;
  name: string;
  group: Group;
}

// From /using-spheres-of-power, /using-spheres-of-might,
// /using-champions-of-the-spheres. Slugs with a "-class" suffix disambiguate
// wiki page names.
const CLASSES: ClassMeta[] = [
  ...g("spherecaster", [
    ["armorist", "Armorist"],
    ["elementalist", "Elementalist"],
    ["eliciter", "Eliciter"],
    ["fey-adept", "Fey Adept"],
    ["hedgewitch", "Hedgewitch"],
    ["incanter", "Incanter"],
    ["mageknight", "Mageknight"],
    ["shifter", "Shifter"],
    ["soul-weaver", "Soul Weaver"],
    ["symbiat", "Symbiat"],
    ["thaumaturge", "Thaumaturge"],
    ["wraith", "Wraith"],
    ["bokor", "Bokor"],
    ["forest-lord", "Forest Lord"],
    ["magemage", "Magemage"],
    ["realmwalker", "Realmwalker"],
    ["tempestarii", "Tempestarii"],
    ["waking-sleeper", "Waking Sleeper"],
  ]),
  ...g("practitioner", [
    ["armiger", "Armiger"],
    ["blacksmith", "Blacksmith"],
    ["commander", "Commander"],
    ["conscript", "Conscript"],
    ["scholar", "Scholar"],
    ["sentinel", "Sentinel"],
    ["striker", "Striker"],
    ["technician", "Technician"],
    ["aeronaut-captain", "Aeronaut Captain"],
  ]),
  ...g("champion", [
    ["bravo", "Bravo"],
    ["crimson-dancer", "Crimson Dancer"],
    ["dissident", "Dissident"],
    ["dragoon-class", "Dragoon"],
    ["mountebank", "Mountebank"],
    ["necros", "Necros"],
    ["prodigy", "Prodigy"],
    ["reaper", "Reaper"],
    ["sage", "Sage"],
    ["theorist", "Theorist"],
    ["troubadour", "Troubadour"],
    ["warden-class", "Warden"],
  ]),
  // From /using-spheres-of-guile — Drop Dead Studios' skill-based companion
  // to Spheres of Power/Might.
  ...g("operative", [
    ["advisor", "Advisor"],
    ["agent", "Agent"],
    ["conduit", "Conduit"],
    ["courser", "Courser"],
    ["envoy", "Envoy"],
    ["genius", "Genius"],
    ["mastermind", "Mastermind"],
    ["professional", "Professional"],
  ]),
];

function g(group: Group, rows: [string, string][]): ClassMeta[] {
  return rows.map(([slug, name]) => ({ slug, name, group }));
}

// --- fetch + cache -----------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getHtml(slug: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cached = join(CACHE_DIR, `_class_${slug}.html`);
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

// --- helpers ---------------------------------------------------------

const ORDINAL: Record<string, number> = {};
[
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
  "13th",
  "14th",
  "15th",
  "16th",
  "17th",
  "18th",
  "19th",
  "20th",
].forEach((o, i) => (ORDINAL[o] = i + 1));

function clean(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a "Special" cell on commas that are not inside parentheses. */
function splitSpecial(cell: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of cell) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Normalise a feature/special name for cross-referencing. */
function normName(s: string): string {
  return clean(s)
    .toLowerCase()
    .replace(/\s*\((?:ex|su|sp|[^)]*)\)\s*$/i, "")
    .replace(/\s*\[[^\]]*\]\s*$/g, "")
    .replace(/[.:]+$/, "")
    .trim();
}

const CHOICE_RE =
  /\b(choose|select|pick|you may (?:choose|select|pick)|one of the following|any (?:one|two)|bonus (?:feat|talent|magic talent|combat talent))\b/i;
const CHOICE_TOKEN_RE =
  /\b(bonus (?:feat|talent|magic talent|combat talent)|magic talents?|combat talents?|martial talents?|talents?|special[iz]{2}ations?|discover(?:y|ies)|drawbacks?|exploits?|tricks?|secrets?|myster(?:y|ies)|revelations?|blessings?|spheres?|archetypes?|traditions?|packages?|domains?|bloodlines?|paths?|mysteries)\b/i;
// Applied to h1 boundaries only. `feats$` is plural on purpose so a feature
// heading like "Bonus Feat" is not mistaken for the "… Feats" section.
const STOP_FEATURE_HEADING =
  /^(archetypes?\b|favou?red class|.*\bfeats$|class equipment|advanced (?:talents|options)|alternate racial|sample build|old |legacy)/i;

// --- parse ----------------------------------------------------------

interface LevelRow {
  level: number;
  bab: string;
  fortSave: string;
  refSave: string;
  willSave: string;
  special: string[];
  columns: Record<string, string>;
  choices: string[];
}
interface Feature {
  name: string;
  type: "" | "Ex" | "Su" | "Sp";
  levels: number[];
  levelInferred: boolean;
  isChoice: boolean;
  description: string;
}
interface Archetype {
  name: string;
  summary: string;
}
interface FavoredClassBonus {
  race: string;
  bonus: string;
}
interface ClassData {
  slug: string;
  name: string;
  group: Group;
  url: string;
  source: string;
  hitDie: number | null;
  alignment: string;
  role: string;
  classSkills: string[];
  skillRanksPerLevel: number | null;
  babProgression: "FULL" | "THREE_QUARTER" | "HALF" | null;
  saveProgressions: {
    fort: "GOOD" | "POOR" | null;
    ref: "GOOD" | "POOR" | null;
    will: "GOOD" | "POOR" | null;
  };
  advancement: LevelRow[];
  talentColumns: string[];
  features: Feature[];
  archetypes: Archetype[];
  favoredClassBonuses: FavoredClassBonus[];
  abilityScoreIncreases: number[];
  choicesByLevel: { level: number; choices: string[] }[];
  notes: string[];
}

function textField(intro: string, label: string): string {
  const re = new RegExp(
    `${label}\\s*:?\\s*([^]*?)(?:\\.|\\n|Hit Die|Alignment|Role|Class Skills|Skill Ranks|Starting Wealth)`,
    "i",
  );
  const m = intro.match(re);
  return m ? clean(m[1]) : "";
}

function inferBab(first: string, last: string): ClassData["babProgression"] {
  const n = parseInt(last.replace(/[^\d/+-].*$/, "").replace("+", ""), 10);
  void first;
  if (n >= 20) return "FULL";
  if (n >= 14 && n <= 16) return "THREE_QUARTER";
  if (n >= 9 && n <= 11) return "HALF";
  return null;
}
function inferSave(l1: string): "GOOD" | "POOR" | null {
  const n = parseInt(l1.replace("+", ""), 10);
  if (Number.isNaN(n)) return null;
  return n >= 2 ? "GOOD" : "POOR";
}

/**
 * The first "Archetypes" h1 region: each h2 is an archetype name, the `<p>`
 * immediately after it (if any) its summary. Wikidot pages sometimes repeat
 * whole sections further down (transcluded nav/related-pages blocks), so only
 * the first occurrence is captured.
 */
function parseArchetypes(
  $: cheerio.CheerioAPI,
  content: CheerioSet,
): Archetype[] {
  const out: Archetype[] = [];
  let inSection = false;
  let done = false;
  let current: Archetype | null = null;
  const flush = () => {
    if (current && current.name) out.push(current);
    current = null;
  };
  content.find("h1, h2, p").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const raw = clean($(el).text());
    if (!raw) return;
    if (tag === "h1") {
      flush();
      if (inSection) {
        inSection = false;
        done = true;
      } else if (!done && /^archetypes?$/i.test(raw)) {
        inSection = true;
      }
      return;
    }
    if (!inSection) return;
    if (tag === "h2") {
      flush();
      current = { name: raw, summary: "" };
      return;
    }
    if (current && !current.summary) current.summary = raw.slice(0, 500);
  });
  flush();
  return out;
}

/** "Catfolk can also choose from the following:" -> "Catfolk"; any "of any
 * race" wording collapses to the universal "Any" bucket. */
function raceFromAnnouncement(raw: string): string | null {
  if (/\bany race\b/i.test(raw)) return "Any";
  const m = raw.match(
    /^([A-Za-z][A-Za-z' -]{1,24}?)\s+(?:can (?:also )?choose|may (?:also )?choose)\b/i,
  );
  return m ? clean(m[1]) : null;
}

/** A raw DOM node as seen through domhandler (what cheerio wraps) — loosely
 * typed here the same way the rest of this file casts `el.tagName`. */
interface RawNode {
  type?: string;
  tagName?: string;
  data?: string;
  nextSibling?: RawNode | null;
}

/**
 * Extracts one favored-class-bonus entry from a `<strong>Race:</strong>`
 * label: the race name (its own `<sup>` footnote markers, e.g.
 * "Aasimar<sup>ARG</sup>", are stripped), and the bonus text, which is
 * everything between this `<strong>` and the next one (or the end of its
 * parent) — the wiki sometimes packs many "Race: bonus" pairs into a single
 * shared `<p>`, separated only by `<br>` tags, rather than one per element.
 */
function entryFromStrongLabel(
  $: cheerio.CheerioAPI,
  strongEl: RawNode,
): FavoredClassBonus | null {
  const raceClone = $(strongEl as never).clone();
  raceClone.find("sup").remove();
  const label = clean(raceClone.text());
  if (!label.endsWith(":")) return null;
  const race = label.slice(0, -1).trim();
  if (!race) return null;

  let bonus = "";
  let node: RawNode | null | undefined = strongEl.nextSibling;
  while (node) {
    const tag = node.tagName?.toLowerCase();
    if (node.type === "tag" && tag === "strong") break;
    if (node.type === "text") bonus += node.data ?? "";
    else if (!(node.type === "tag" && tag === "br")) bonus += $(node as never).text();
    node = node.nextSibling;
  }
  bonus = clean(bonus).replace(/^:\s*/, "").trim();
  return bonus ? { race: clean(race), bonus: bonus.slice(0, 500) } : null;
}

/**
 * The first "Favored Class Bonuses" h1 region. The wiki always marks a race
 * label as `<strong>Race:</strong>`, but its cardinality per paragraph
 * varies — most classes give each race its own `<p>`/`<li>`, some (e.g.
 * Mountebank, Dragoon) pack the entire race list into one or two shared
 * `<p>` elements separated by `<br>` — so entries are read off every
 * `<strong>` tag in the section directly rather than off paragraph/list-item
 * boundaries. A handful of Guile classes instead use no bold labels at all:
 * a `<p>` announcing "<Race> can choose from the following:" followed by
 * unlabeled `<li>` items until the next announcement.
 */
function parseFavoredClassBonuses(
  $: cheerio.CheerioAPI,
  content: CheerioSet,
): FavoredClassBonus[] {
  const out: FavoredClassBonus[] = [];
  let inSection = false;
  let done = false;
  let raceContext: string | null = null;
  content.find("h1, p, li, strong").each((_i, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    if (tag === "h1") {
      const raw = clean($(el).text());
      if (inSection) {
        inSection = false;
        done = true;
      } else if (!done && /^favou?red class bonus(es)?$/i.test(raw)) {
        inSection = true;
        raceContext = null;
      }
      return;
    }
    if (!inSection) return;

    if (tag === "strong") {
      const entry = entryFromStrongLabel($, el as unknown as RawNode);
      if (entry) out.push(entry);
      return;
    }

    // Only reachable for text with no bold race label at all — the
    // "announcement + unlabeled li" convention.
    if ($(el).find("strong").length > 0) return;
    const raw = clean($(el).text());
    if (!raw) return;
    if (tag === "p") {
      const announced = raceFromAnnouncement(raw);
      if (announced) raceContext = announced;
      return;
    }
    if (tag === "li" && raceContext) {
      out.push({ race: raceContext, bonus: raw.slice(0, 500) });
    }
  });
  return out;
}

function parseClass(html: string, meta: ClassMeta): ClassData {
  const $ = cheerio.load(html);
  const content = $("#page-content");
  content.find("script, style, .code").remove();

  const data: ClassData = {
    ...meta,
    url: `${BASE}/${meta.slug}`,
    source: "Spheres of Power wiki",
    hitDie: null,
    alignment: "",
    role: "",
    classSkills: [],
    skillRanksPerLevel: null,
    babProgression: null,
    saveProgressions: { fort: null, ref: null, will: null },
    advancement: [],
    talentColumns: [],
    features: [],
    archetypes: [],
    favoredClassBonuses: [],
    abilityScoreIncreases: [4, 8, 12, 16, 20],
    choicesByLevel: [],
    notes: [],
  };

  // ---- intro fields ----
  const introText = clean(content.text()).slice(0, 6000);
  const hd = introText.match(/Hit Die:\s*d(\d+)/i);
  if (hd) data.hitDie = Number(hd[1]);
  data.alignment = textField(introText, "Alignment");
  data.role = textField(introText, "Role").slice(0, 400);
  const skillRanks = introText.match(/Skill Ranks per Level:\s*(\d+)/i);
  if (skillRanks) data.skillRanksPerLevel = Number(skillRanks[1]);
  const classSkills = introText.match(
    /Class Skills:\s*(?:The [^.]*?are\s*)?([^.]+?)\.\s*(?:Skill Ranks|$)/i,
  );
  if (classSkills) {
    data.classSkills = classSkills[1]
      .split(/,|\band\b/)
      .map((s) => clean(s).replace(/\s*\([^)]*\)$/, ""))
      .filter((s) => s && s.length < 40);
  }

  // ---- advancement table ----
  // Some pages use a two-tier header (row 0 spans groups, row 1 has the real
  // column names); prestige-style classes only have 10 levels.
  const rowCells = (tr: unknown) =>
    $(tr as never)
      .find("th, td")
      .map((_j, c) => clean($(c).text()))
      .get();
  const isAdvHeader = (cells: string[]) => {
    const low = cells.map((c) => c.toLowerCase());
    return (
      low.some((h) => /^(class )?level$/.test(h)) &&
      low.some((h) => /special/.test(h)) &&
      low.some((h) => /attack bonus|^bab$/.test(h))
    );
  };

  let advTable: CheerioSet | null = null;
  let headerRowIdx = 0;
  content.find("table").each((_i, tbl) => {
    if (advTable) return;
    const rows = $(tbl).find("tr");
    if (rows.length < 11) return;
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      if (isAdvHeader(rowCells(rows.get(i)))) {
        advTable = $(tbl);
        headerRowIdx = i;
        return;
      }
    }
  });

  if (advTable) {
    const table = advTable as CheerioSet;
    const rows = table.find("tr");
    const header = rowCells(rows.get(headerRowIdx));
    const KNOWN: Record<string, keyof LevelRow> = {
      "class level": "level" as keyof LevelRow,
      level: "level" as keyof LevelRow,
      "base attack bonus": "bab",
      bab: "bab",
      "fort save": "fortSave",
      "fortitude save": "fortSave",
      "ref save": "refSave",
      "reflex save": "refSave",
      "will save": "willSave",
      special: "special",
    };
    const extraCols: string[] = [];
    header.forEach((h) => {
      if (!KNOWN[h.toLowerCase()]) extraCols.push(h);
    });
    data.talentColumns = extraCols;
    const levelColIdx = header.findIndex((h) =>
      /^(class )?level$/i.test(h.trim()),
    );

    rows.slice(headerRowIdx + 1).each((_r, tr) => {
      const cells = rowCells(tr);
      const rawLevel = (cells[levelColIdx >= 0 ? levelColIdx : 0] ?? "")
        .toLowerCase()
        .replace(/[^\dstnrdh]/g, "");
      const level =
        ORDINAL[rawLevel] ??
        (/^\d{1,2}$/.test(rawLevel) ? Number(rawLevel) : undefined);
      if (!level || level < 1 || level > 20) return;
      const row: LevelRow = {
        level,
        bab: "",
        fortSave: "",
        refSave: "",
        willSave: "",
        special: [],
        columns: {},
        choices: [],
      };
      header.forEach((h, idx) => {
        const key = KNOWN[h.toLowerCase()];
        if (key === ("level" as keyof LevelRow)) return;
        const val = cells[idx] ?? "";
        if (key === "special") row.special = splitSpecial(val);
        else if (key) (row as unknown as Record<string, string>)[key] = val;
        else row.columns[h] = val;
      });
      data.advancement.push(row);
    });

    if (data.advancement.length) {
      const a = data.advancement;
      const last = a[a.length - 1];
      data.babProgression = inferBab(a[0].bab, last.bab);
      data.saveProgressions = {
        fort: inferSave(a[0].fortSave),
        ref: inferSave(a[0].refSave),
        will: inferSave(a[0].willSave),
      };
    }
  }

  // ---- class features ----
  // Wikidot nests sections in collapsible divs, so a sibling walk (.nextUntil)
  // misses content. Walk every heading/paragraph in document order and toggle
  // an "in the class-features region" flag on the h1 boundaries.
  let inFeatures = false;
  let featuresLocked = false; // set once the first features region ends
  let seenFeatures = false;
  let current: Feature | null = null;
  const bodyBuf: string[] = [];
  const seenNames = new Set<string>();
  const flush = () => {
    if (current && !seenNames.has(current.name.toLowerCase())) {
      seenNames.add(current.name.toLowerCase());
      current.description = bodyBuf.join("\n\n").slice(0, 2200);
      current.isChoice =
        CHOICE_RE.test(current.name) ||
        CHOICE_RE.test(current.description.slice(0, 700));
      data.features.push(current);
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
      if (inFeatures) {
        inFeatures = false;
        featuresLocked = true; // that was the (first) features region
      }
      if (
        !featuresLocked &&
        /class (features|abilities)/i.test(raw) &&
        !STOP_FEATURE_HEADING.test(raw)
      ) {
        inFeatures = true;
        seenFeatures = true;
      }
      return;
    }
    if (!inFeatures) return;

    if (tag === "h2") {
      flush();
      // Within a class-features h1 region every h2 is a feature; the only
      // in-region divider we bail on is the "List of …" appendix.
      if (/^list of\b/i.test(raw)) {
        inFeatures = false;
        featuresLocked = true;
        return;
      }
      const typeM = raw.match(/\((Ex|Su|Sp)\)\s*$/i);
      const type = (
        typeM ? typeM[1][0].toUpperCase() + typeM[1].slice(1).toLowerCase() : ""
      ) as Feature["type"];
      current = {
        name: clean(
          raw
            .replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "")
            .replace(/\s*\[[^\]]*\]\s*$/g, ""),
        ),
        type,
        levels: [],
        levelInferred: false,
        isChoice: false,
        description: "",
      };
      return;
    }
    // h3/h4/p/li inside a feature are its sub-content (option lists, tables …).
    if (current && bodyBuf.join(" ").length < 2200) {
      bodyBuf.push(tag === "h3" || tag === "h4" ? `• ${raw}` : raw);
    }
  });
  flush();

  data.archetypes = parseArchetypes($, content);
  data.favoredClassBonuses = parseFavoredClassBonuses($, content);

  if (!seenFeatures)
    data.notes.push("no 'Class Features/Abilities' heading found");
  if (data.advancement.length === 0)
    data.notes.push(
      "no 20-level advancement table on the page — likely an archetype or prestige-style class that modifies a base class",
    );
  else if (data.advancement.length < 20)
    data.notes.push(
      `${data.advancement.length}-level class (prestige/advanced) — advances an existing class`,
    );

  // ---- cross-reference features <-> levels via the Special column ----
  for (const f of data.features) {
    const fn = normName(f.name);
    if (!fn) continue;
    for (const row of data.advancement) {
      for (const tok of row.special) {
        const tn = normName(tok);
        if (tn === fn || tn.startsWith(fn + " ") || fn.startsWith(tn + " ")) {
          if (!f.levels.includes(row.level)) f.levels.push(row.level);
        }
      }
    }
    f.levels.sort((a, b) => a - b);
    // Baseline features (proficiencies, casting, spell pool, …) are rarely
    // listed in the Special column. Assume level 1 and flag it.
    if (f.levels.length === 0) {
      f.levels = [1];
      f.levelInferred = true;
    }
  }
  const choiceFeatureNames = new Set(
    data.features.filter((f) => f.isChoice).map((f) => normName(f.name)),
  );

  // ---- per-level choices ----
  for (const row of data.advancement) {
    const choices: string[] = [];
    for (const tok of row.special) {
      const tn = normName(tok);
      const isChoice =
        CHOICE_TOKEN_RE.test(tok) ||
        choiceFeatureNames.has(tn) ||
        [...choiceFeatureNames].some(
          (c) => tn.startsWith(c + " ") || c.startsWith(tn + " "),
        );
      if (isChoice) choices.push(tok);
    }
    if (row.level % 4 === 0)
      choices.push("ability score increase (+1, core PF1e)");
    row.choices = choices;
    if (choices.length) data.choicesByLevel.push({ level: row.level, choices });
  }

  return data;
}

// --- db ------------------------------------------------------------

async function writeToDb(classes: ClassData[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const c of classes) {
      const source = `Spheres of Power wiki (${c.group})`;
      const classJson = asJson({
        slug: c.slug,
        url: c.url,
        group: c.group,
        talentColumns: c.talentColumns,
        advancement: c.advancement,
        choicesByLevel: c.choicesByLevel,
        abilityScoreIncreases: c.abilityScoreIncreases,
        archetypes: c.archetypes,
        favoredClassBonuses: c.favoredClassBonuses,
      });
      const gameClass = await prisma.gameClass.upsert({
        where: {
          system_name_source: {
            system: "SPHERES_OF_POWER",
            name: c.name,
            source,
          },
        },
        create: {
          system: "SPHERES_OF_POWER",
          name: c.name,
          hitDie: c.hitDie ?? 8,
          babProgression: c.babProgression ?? "THREE_QUARTER",
          fortProgression: c.saveProgressions.fort ?? "POOR",
          refProgression: c.saveProgressions.ref ?? "POOR",
          willProgression: c.saveProgressions.will ?? "POOR",
          skillRanksPerLevel: c.skillRanksPerLevel ?? 2,
          classSkills: c.classSkills,
          description: c.role,
          source,
          isSrd: true,
          data: classJson,
        },
        update: {
          hitDie: c.hitDie ?? 8,
          babProgression: c.babProgression ?? "THREE_QUARTER",
          skillRanksPerLevel: c.skillRanksPerLevel ?? 2,
          classSkills: c.classSkills,
          description: c.role,
          data: classJson,
        },
      });
      await prisma.classFeature.deleteMany({
        where: { classId: gameClass.id },
      });
      const rows = c.features.flatMap((f) =>
        (f.levels.length ? f.levels : [0]).map((level) => ({
          classId: gameClass.id,
          name: f.type ? `${f.name} (${f.type})` : f.name,
          level,
          description: f.description,
          data: asJson({ isChoice: f.isChoice, allLevels: f.levels }),
        })),
      );
      if (rows.length) await prisma.classFeature.createMany({ data: rows });
      console.log(
        `  db: ${c.name.padEnd(18)} ${c.features.length} features, ${rows.length} feature-rows`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

// --- main ---------------------------------------------------------

async function main() {
  const targets = ONLY ? CLASSES.filter((c) => c.slug === ONLY) : CLASSES;
  if (!targets.length) {
    console.error(`No class matches --only ${ONLY}`);
    process.exitCode = 1;
    return;
  }
  await mkdir(OUT_DIR, { recursive: true });

  const all: ClassData[] = [];
  for (const meta of targets) {
    const html = await getHtml(meta.slug);
    const data = parseClass(html, meta);
    all.push(data);
    await writeFile(
      join(OUT_DIR, `${meta.slug}.json`),
      JSON.stringify(data, null, 2) + "\n",
    );
    const lvls = data.advancement.length;
    const flag =
      lvls === 0
        ? "  ⚠ NO advancement table"
        : lvls < 20
          ? `  (${lvls}-level class)`
          : "";
    console.log(
      `  ${meta.name.padEnd(18)} HD ${data.hitDie ?? "?"}  ${lvls} levels  ${
        data.features.length
      } features  ${data.archetypes.length} archetypes  ${
        data.favoredClassBonuses.length
      } FCBs${flag}`,
    );
  }

  const index = all.map((c) => ({
    slug: c.slug,
    name: c.name,
    group: c.group,
    hitDie: c.hitDie,
    babProgression: c.babProgression,
    levels: c.advancement.length,
    features: c.features.length,
    talentColumns: c.talentColumns,
  }));
  await writeFile(
    join(OUT_DIR, "_index.json"),
    JSON.stringify(index, null, 2) + "\n",
  );

  const noTable = all.filter((c) => c.advancement.length === 0);
  const shortTable = all.filter(
    (c) => c.advancement.length > 0 && c.advancement.length < 20,
  );
  console.log(
    `\n${all.length} classes -> ${OUT_DIR}/` +
      (shortTable.length
        ? `\n  ${shortTable.length}-/10-level classes: ${shortTable
            .map((c) => `${c.slug}(${c.advancement.length})`)
            .join(", ")}`
        : "") +
      (noTable.length
        ? `\n  ⚠ no advancement table: ${noTable.map((c) => c.slug).join(", ")}`
        : ""),
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
