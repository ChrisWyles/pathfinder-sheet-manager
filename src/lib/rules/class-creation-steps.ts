/**
 * Per-class creation steps.
 *
 * `buildStepPlan` produces the ordered list of choices a player must resolve to
 * build a character of a given class and level. It combines:
 *   1. core PF1e rules (a feat at odd levels, an ability boost every 4th level),
 *   2. auto-derived steps from the class's own data — the scraped Spheres
 *      `choicesByLevel` / feature flags, or the `PF1E_CLASS_CHOICES` table for
 *      the seeded core classes,
 *   3. group defaults (spherecasters pick a casting tradition, martial classes a
 *      martial tradition),
 *   4. the hand-authored `CLASS_CREATION_STEPS` registry for anything the data
 *      can't express.
 *
 * Adding a new class later means the scraper/seed populates its features and
 * (optionally) an entry here — the wizard itself never changes.
 */

import {
  type CreationChoiceStep,
  type StepKind,
  type StepTab,
  TAB_ORDER,
  kebab,
} from "./creation";
import { PF1E_CLASS_CHOICES } from "./pf1e-classes";

// ---------------------------------------------------------------------------
// Shapes of the data we read
// ---------------------------------------------------------------------------

export interface SphereAdvancementRow {
  level: number;
  special?: string[];
  columns?: Record<string, string>;
  choices?: string[];
}

export interface ArchetypeOption {
  name: string;
  summary: string;
}

export interface FavoredClassBonusEntry {
  race: string;
  bonus: string;
}

export interface SphereClassData {
  slug?: string;
  group?: string;
  talentColumns?: string[];
  advancement?: SphereAdvancementRow[];
  choicesByLevel?: { level: number; choices: string[] }[];
  abilityScoreIncreases?: number[];
  archetypes?: ArchetypeOption[];
  favoredClassBonuses?: FavoredClassBonusEntry[];
}

export type CasterTier = "FULL" | "THREE_QUARTER" | "HALF" | "OTHER" | "NONE";

/**
 * Derives a class's caster progression from its own scraped advancement
 * table — the "Caster Level" column's value at level 20 relative to 20 (a
 * full caster's CL equals class level; a non-caster has no such column).
 */
export function casterTier(classData: SphereClassData | null | undefined): CasterTier {
  const rows = classData?.advancement;
  if (!rows?.length) return "NONE";
  const last = rows[rows.length - 1];
  const key = Object.keys(last.columns ?? {}).find((k) =>
    /caster level/i.test(k),
  );
  if (!key) return "NONE";
  const raw = last.columns?.[key] ?? "";
  const m = raw.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 0;
  if (n >= 20) return "FULL";
  if (n >= 15) return "THREE_QUARTER";
  if (n >= 10) return "HALF";
  if (n > 0) return "OTHER";
  return "NONE";
}

export interface PlanFeature {
  name: string;
  level: number;
  isChoice?: boolean;
  description?: string;
}

export interface StepPlanInput {
  className: string;
  classSlug: string;
  system: "PATHFINDER_1E" | "SPHERES_OF_POWER";
  group?: string | null;
  level: number;
  classData?: SphereClassData | null;
  features?: PlanFeature[];
  /** Derived from the chosen race — adds the Human bonus feat at 1st level. */
  isHuman?: boolean;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface RegistryStep {
  level: number;
  tab: StepTab;
  kind: StepKind;
  title: string;
  prompt: string;
  count?: number;
  options?: { value: string; label: string; description?: string }[];
}

export interface ClassStepOverride {
  /** Extra steps not derivable from the class data. */
  add?: RegistryStep[];
  /** Patch auto-derived steps whose `featureName` matches the key. */
  annotate?: Record<string, Partial<CreationChoiceStep>>;
  /** Scraper choice tokens to drop for this class. */
  ignoreTokens?: string[];
}

export const CLASS_CREATION_STEPS: Record<string, ClassStepOverride> = {
  Incanter: {
    ignoreTokens: ["specializations"],
    annotate: {
      "Incanter Specializations": {
        title: "Incanter specialization",
        prompt:
          "Spend bonus feats on specializations (max 5 specialization points).",
      },
    },
  },
  Elementalist: {
    add: [
      {
        level: 1,
        tab: "class-features",
        kind: "pick-option",
        title: "Elemental focus",
        prompt: "Choose your element (air, earth, fire, or water).",
        options: [
          { value: "air", label: "Air" },
          { value: "earth", label: "Earth" },
          { value: "fire", label: "Fire" },
          { value: "water", label: "Water" },
        ],
      },
    ],
  },
  Hedgewitch: {
    add: [
      {
        level: 1,
        tab: "class-features",
        kind: "pick-option",
        title: "Hedgewitch tradition",
        prompt: "Choose a hedgewitch tradition and its secrets.",
      },
    ],
  },
  Shifter: {
    add: [
      {
        level: 1,
        tab: "class-features",
        kind: "pick-option",
        title: "Blindside / shape training",
        prompt: "Choose your shifter aspect focus.",
      },
    ],
  },
  Fighter: {
    annotate: {
      "Bonus Feat": {
        prompt:
          "Choose a combat feat you meet the prerequisites for (Fighter bonus feat).",
      },
    },
  },
  Reaper: {
    // "Bloodletter" isn't a choice at all — it's a fixed grant (Duelist
    // sphere or one of its talents, the Bloody Slasher drawback, and Ooze
    // Ichor in place of Long Cuts) — so it's dropped from the auto-derived
    // choice list and replaced with an info step spelling out what to add.
    // "Cult" doesn't match its own feature ("Reaper Cult") by name, so the
    // scraper's per-level token never gets flagged as a choice at all —
    // hand-authored here instead, with the cult names as real options
    // (their individual level-by-level abilities aren't modeled — see the
    // class page for those).
    ignoreTokens: ["bloodletter"],
    add: [
      {
        level: 1,
        tab: "class-features",
        kind: "info",
        title: "Bloodletter",
        prompt:
          "Automatic: gain the Duelist sphere (or a talent from it, if you already have the sphere), the Bloody Slasher drawback, and the Ooze Ichor talent in place of Long Cuts. Add these yourself on the Spheres & Talents step.",
      },
      {
        level: 1,
        tab: "class-features",
        kind: "pick-option",
        title: "Reaper cult",
        prompt:
          "Choose a cult to focus your occult study on — each grants a themed chain of abilities at 1st, 5th, and every 4 levels after (see the class page for the full list per cult).",
        options: [
          { value: "Cult of the Blight", label: "Cult of the Blight" },
          { value: "Cult of the Chimera", label: "Cult of the Chimera" },
          { value: "Cult of the Fang", label: "Cult of the Fang" },
          {
            value: "Cult of the Great Old Ones",
            label: "Cult of the Great Old Ones",
          },
          { value: "Cult of the Haunt", label: "Cult of the Haunt" },
          { value: "Cult of the Primordial", label: "Cult of the Primordial" },
          { value: "Cult of the Raven", label: "Cult of the Raven" },
        ],
      },
    ],
    annotate: {
      "Favored Prey": {
        title: "Favored prey",
        prompt:
          "Choose a creature type from the ranger favored enemies table: Aberration, Animal, Construct, Dragon, Fey, Humanoid, Magical Beast, Monstrous Humanoid, Ooze, Outsider, Plant, Undead, or Vermin.",
        options: [
          "Aberration",
          "Animal",
          "Construct",
          "Dragon",
          "Fey",
          "Humanoid",
          "Magical Beast",
          "Monstrous Humanoid",
          "Ooze",
          "Outsider",
          "Plant",
          "Undead",
          "Vermin",
        ].map((v) => ({ value: v, label: v })),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Token classification
// ---------------------------------------------------------------------------

const cap = (s: string) =>
  s.trim().replace(/^\w/, (c) => c.toUpperCase()).replace(/\s+/g, " ");

const parseLeadingInt = (v: string | undefined): number | null => {
  if (!v) return null;
  const m = v.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
};

// ---------------------------------------------------------------------------
// Total-talents-by-level ("Magic Talents" / "Combat Talents" / "Combat &
// Magic Talents") columns
// ---------------------------------------------------------------------------

/**
 * A class's talent-progression columns show the *cumulative* number of
 * talents possessed by that level (like "Caster Level" does), not a
 * per-level delta — e.g. Elementalist's "Magic Talents" column reads
 * 0, 1, 2, 3, 3, 4… for levels 1-6. The one-time "every spherecaster starts
 * with 2 bonus magic talents" rule shows up as a "(+2)" (or "(+2 magic)" on
 * a combined column) annotation baked into the level-1 row.
 */
export type TalentColumnKind = "magic" | "combat" | "combined";

/** Classifies a class-table column name into which talent economy it feeds,
 * or null if it isn't a talent column at all (e.g. "Caster Level", or the
 * Spheres of Guile "Any"/"Utility" operative-talent columns, out of scope
 * here). */
export function classifyTalentColumnName(name: string): TalentColumnKind | null {
  const low = name.toLowerCase();
  if (/combat\s*(?:&|and)\s*magic|magic\s*(?:&|and)\s*combat|blended/.test(low))
    return "combined";
  if (/\bmagic\b/.test(low)) return "magic";
  if (/\bcombat\b|\bmartial\b/.test(low)) return "combat";
  // A bare "Talents" column (no "magic"/"combat" qualifier) only appears on
  // pure spherecasters (e.g. Fey Adept), so it means magic talents.
  if (low.trim() === "talents") return "magic";
  return null;
}

export type TalentStepBucket = "combat" | "magic" | "flex" | "other";

/**
 * Classifies a `pick-talent` step's *title* (e.g. "Combat talents", "Magic
 * talents", "Combat or magic talents") into a talent-slot bucket for the
 * wizard's "N of M" progress counters. Distinct from
 * `classifyTalentColumnName` above: a step title says "combat *or* magic"
 * for a flexible pool (spend the pick on either), not "combat *and*
 * magic" — so this treats "has both words" as its own "flex" bucket
 * instead of folding it into "combined".
 */
export function classifyTalentStepTitle(title: string): TalentStepBucket {
  const low = title.toLowerCase();
  const hasMagic = /\bmagic\b/.test(low);
  const hasCombat = /\bcombat\b|\bmartial\b/.test(low);
  if (hasMagic && hasCombat) return "flex";
  if (hasMagic) return "magic";
  if (hasCombat) return "combat";
  return "other";
}

/** Splits a cumulative-talents cell like "1 (+2 magic)" into the table's own
 * running total (`base`) and the one-time starting bonus (`bonus`, always
 * magic-only per the SoP "2 free magic talents at 1st level" rule). */
export function parseTalentColumnValue(raw: string | undefined): {
  base: number;
  bonus: number;
} {
  if (!raw) return { base: 0, bonus: 0 };
  const base = parseLeadingInt(raw) ?? 0;
  const bonusMatch = raw.match(/\(\s*\+(\d+)/);
  return { base, bonus: bonusMatch ? parseInt(bonusMatch[1], 10) : 0 };
}

function matchName(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/\s*\((?:ex|su|sp)\)\s*$/i, "").trim();
  const y = b.toLowerCase().replace(/\s*\((?:ex|su|sp)\)\s*$/i, "").trim();
  return x === y || x.startsWith(y + " ") || y.startsWith(x + " ");
}

interface TokenClass {
  kind: StepKind;
  tab: StepTab;
  count: number;
  title: string;
  prompt: string;
  featureName?: string;
}

function classifyToken(
  token: string,
  row: SphereAdvancementRow | undefined,
  talentColumns: string[] | undefined,
): TokenClass | null {
  const low = token.toLowerCase();

  if (/ability score increase/.test(low)) return null; // core step covers it

  if (/\bbonus feat\b|^feat$/.test(low)) {
    return {
      kind: "pick-feat",
      tab: "feats",
      count: 1,
      title: "Bonus feat",
      prompt: "Choose a bonus feat.",
      featureName: "Bonus Feat",
    };
  }

  if (/talent/.test(low)) {
    const combatCols = (talentColumns ?? []).some((c) => /combat|martial/i.test(c));
    const kindWord = /magic/.test(low)
      ? "Magic Talents"
      : /combat|martial/.test(low) || combatCols
        ? "Combat Talents"
        : "Talents";
    const fromCol =
      parseLeadingInt(row?.columns?.[kindWord]) ??
      parseLeadingInt(row?.columns?.["Talents"]);
    return {
      kind: "pick-talent",
      tab: "spheres",
      count: Math.max(1, fromCol ?? 1),
      title: cap(token),
      prompt: `Pick ${cap(token)} on the Spheres tab.`,
      featureName: cap(token),
    };
  }

  if (/special[ai]?[sz]ation/.test(low)) {
    return {
      kind: "pick-option",
      tab: "class-features",
      count: 1,
      title: "Class specialization",
      prompt: "Choose your class specialization(s).",
      featureName: cap(token),
    };
  }

  if (/tradition/.test(low)) {
    const martial = /martial|combat/.test(low);
    return {
      kind: "pick-option",
      tab: martial ? "martial-tradition" : "casting-tradition",
      count: 1,
      title: martial ? "Martial tradition" : "Casting tradition",
      prompt: martial
        ? "Choose a martial tradition and its bonus talents."
        : "Choose a casting tradition (abilities, drawbacks and boons).",
      featureName: cap(token),
    };
  }

  if (/\belement\b/.test(low)) {
    return {
      kind: "pick-option",
      tab: "class-features",
      count: 1,
      title: "Element",
      prompt: "Choose your element.",
      featureName: cap(token),
    };
  }

  if (/\bsphere(s)?\b/.test(low)) {
    return {
      kind: "pick-sphere",
      tab: "spheres",
      count: 1,
      title: cap(token),
      prompt: `Choose ${cap(token)}.`,
      featureName: cap(token),
    };
  }

  if (
    /drawback|proxy|discover|exploit|trick|secret|revelation|blessing|myster|bloodline|domain|package|archetype|\bpath\b|blas?ph|totem|aspect/.test(
      low,
    )
  ) {
    return {
      kind: "pick-option",
      tab: "class-features",
      count: 1,
      title: cap(token),
      prompt: `Choose ${cap(token)}.`,
      featureName: cap(token),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// buildStepPlan
// ---------------------------------------------------------------------------

const ABILITY_BOOST_LEVELS = [4, 8, 12, 16, 20];
const GLOBAL_IGNORE = ["casting", "spell pool", "spellpool"];

function bareName(name: string): string {
  return name.replace(/\s*\((?:spheres|3pp|hb)\)\s*$/i, "").trim();
}

export function buildStepPlan(input: StepPlanInput): CreationChoiceStep[] {
  const { className, classSlug, system, group, classData, features } = input;
  const L = Math.min(20, Math.max(1, Math.floor(input.level)));
  const override: ClassStepOverride =
    CLASS_CREATION_STEPS[bareName(className)] ?? {};
  const ignore = new Set(
    [...GLOBAL_IGNORE, ...(override.ignoreTokens ?? [])].map((t) =>
      t.toLowerCase(),
    ),
  );

  const steps: Omit<CreationChoiceStep, "id">[] = [];

  // 1. core: ability score increases every 4th level
  for (const lvl of ABILITY_BOOST_LEVELS) {
    if (lvl > L) break;
    steps.push({
      classLevel: lvl,
      tab: "class-features",
      kind: "ability-boost",
      count: 1,
      title: "Ability score increase",
      prompt: "Increase one ability score by 1 (every 4th level).",
    });
  }

  // 2. core: a general feat at 1st and every odd level
  for (let lvl = 1; lvl <= L; lvl += 2) {
    steps.push({
      classLevel: lvl,
      tab: "feats",
      kind: "pick-feat",
      count: 1,
      title: "Feat",
      prompt: "Choose a general feat.",
    });
  }

  // 2b. Human's bonus feat at 1st level (derived from the chosen race).
  if (input.isHuman) {
    steps.push({
      classLevel: 1,
      tab: "feats",
      kind: "pick-feat",
      count: 1,
      title: "Human bonus feat",
      prompt: "Choose a bonus feat (Human).",
    });
  }

  // 3. group defaults for Spheres classes — champions are hybrid casters and
  // combat practitioners, so they resolve both traditions.
  if (system === "SPHERES_OF_POWER") {
    if (group === "spherecaster" || group === "champion") {
      steps.push({
        classLevel: 1,
        tab: "casting-tradition",
        kind: "pick-option",
        count: 1,
        title: "Casting tradition",
        prompt: "Choose a casting tradition (abilities, drawbacks and boons).",
        featureName: "Casting",
      });
    }
    if (group === "practitioner" || group === "champion") {
      steps.push({
        classLevel: 1,
        tab: "martial-tradition",
        kind: "pick-option",
        count: 1,
        title: "Martial tradition",
        prompt: "Choose a martial tradition and its bonus talents.",
        featureName: "Martial Tradition",
      });
    }
  }

  // 4a. Spheres: per-level choice tokens
  if (system === "SPHERES_OF_POWER" && classData?.choicesByLevel) {
    for (const { level: lvl, choices } of classData.choicesByLevel) {
      if (lvl > L) continue;
      const row = classData.advancement?.find((r) => r.level === lvl);
      for (const raw of choices) {
        const token = raw.trim();
        if (!token || ignore.has(token.toLowerCase())) continue;
        const c = classifyToken(token, row, classData.talentColumns);
        if (c) {
          steps.push({
            classLevel: lvl,
            tab: c.tab,
            kind: c.kind,
            count: c.count,
            title: c.title,
            prompt: c.prompt,
            featureName: c.featureName,
          });
          continue;
        }
        // Unlike 4b below (whose feature-level `isChoice` flag is noisy and
        // deliberately stays silent on an unrecognized token), a per-level
        // token here was already vetted by the scraper as needing a
        // decision (CHOICE_TOKEN_RE / a known choice feature name) — e.g.
        // Reaper's "Favored Prey +2", which names no recognized keyword.
        // Falling back to a generic choice instead of dropping it silently
        // at least surfaces it; a class override can still refine it via
        // `annotate`. The "ability score increase" token is the one
        // deliberate exception — classifyToken nulls it out on purpose
        // because the core ability-boost step (section 1) already covers it.
        if (!/ability score increase/i.test(token)) {
          steps.push({
            classLevel: lvl,
            tab: "class-features",
            kind: "pick-option",
            count: 1,
            title: cap(token),
            prompt: `Choose ${cap(token)}.`,
            featureName: cap(token),
          });
        }
      }
    }
  }

  // 4b. Spheres: one-off choice features with no matching per-level token
  if (system === "SPHERES_OF_POWER") {
    for (const f of features ?? []) {
      if (!f.isChoice || f.level > L) continue;
      const dup = steps.some(
        (s) =>
          s.featureName &&
          matchName(s.featureName, f.name) &&
          s.classLevel === f.level,
      );
      if (dup) continue;
      if (ignore.has(f.name.toLowerCase())) continue;
      // Only surface features the classifier recognises as a genuine choice —
      // the scraped `isChoice` flag is noisy and also catches plain features.
      const c = classifyToken(f.name, undefined, classData?.talentColumns);
      if (!c) continue;
      steps.push({
        classLevel: f.level,
        tab: c.tab,
        kind: c.kind,
        count: c.count,
        title: c.title,
        prompt: c.prompt,
        featureName: f.name,
      });
    }
  }

  // 4c. Spheres: the class's own talent-progression column(s) — the
  // cumulative "Magic/Combat/Combat & Magic Talents" total by the current
  // level, including the one-time "2 free magic talents at 1st level"
  // starting bonus. Independent of any per-level choice token (most levels,
  // including 1st, don't literally say "talent" in their scraped feature
  // list), and of the classifyToken talent branch above (which only ever
  // fires for a handful of classes' *extra*, separately-named bonus-talent
  // features, e.g. Incanter's "bonus talent" or Dragoon's "Drake talent").
  if (system === "SPHERES_OF_POWER" && classData?.advancement) {
    const row = classData.advancement.find((r) => r.level === L);
    for (const [name, raw] of Object.entries(row?.columns ?? {})) {
      const kind = classifyTalentColumnName(name);
      if (!kind) continue;
      const { base, bonus } = parseTalentColumnValue(raw);
      if (kind === "combined") {
        if (base > 0) {
          steps.push({
            classLevel: 1,
            tab: "spheres",
            kind: "pick-talent",
            count: base,
            title: "Combat or magic talents",
            prompt: `Pick ${base} combat or magic talents on the Spheres tab.`,
            featureName: "Combat Or Magic Talents Total",
          });
        }
        if (bonus > 0) {
          steps.push({
            classLevel: 1,
            tab: "spheres",
            kind: "pick-talent",
            count: bonus,
            title: "Magic talents",
            prompt: `Pick ${bonus} magic talents on the Spheres tab (starting bonus).`,
            featureName: "Magic Talents Total",
          });
        }
      } else {
        const total = base + bonus;
        if (total > 0) {
          steps.push({
            classLevel: 1,
            tab: "spheres",
            kind: "pick-talent",
            count: total,
            title: kind === "magic" ? "Magic talents" : "Combat talents",
            prompt: `Pick ${total} ${kind} talents on the Spheres tab${bonus > 0 ? " (includes the starting bonus)" : ""}.`,
            featureName: kind === "magic" ? "Magic Talents Total" : "Combat Talents Total",
          });
        }
      }
    }
  }

  // 4d. PF1e core classes: the choice table × the class's feature rows
  if (system === "PATHFINDER_1E") {
    for (const meta of PF1E_CLASS_CHOICES[bareName(className)] ?? []) {
      const feat = (features ?? []).find((f) =>
        matchName(f.name, meta.featureName),
      );
      const levels = meta.levels ?? (feat ? [feat.level] : []);
      for (const lvl of levels) {
        if (lvl > L) continue;
        steps.push({
          classLevel: lvl,
          tab: meta.tab ?? "class-features",
          kind: meta.kind,
          count: meta.count ?? 1,
          title: meta.featureName,
          prompt:
            meta.prompt ?? feat?.description ?? `Resolve ${meta.featureName}.`,
          featureName: meta.featureName,
        });
      }
    }
  }

  // 5. registry additions
  for (const add of override.add ?? []) {
    if (add.level > L) continue;
    steps.push({
      classLevel: add.level,
      tab: add.tab,
      kind: add.kind,
      count: add.count ?? 1,
      title: add.title,
      prompt: add.prompt,
      options: add.options,
      fromRegistry: true,
    });
  }

  // 6. registry annotations
  if (override.annotate) {
    const entries = Object.entries(override.annotate);
    for (const s of steps) {
      if (!s.featureName) continue;
      const patch =
        override.annotate[s.featureName] ??
        entries.find(([k]) => matchName(k, s.featureName!))?.[1];
      if (patch) Object.assign(s, patch);
    }
  }

  // 7. collapse duplicate one-off options (e.g. a group-default tradition and a
  // scraped "tradition" token). Repeatable picks keep every instance.
  const DEDUPE_KINDS: StepKind[] = ["pick-option", "pick-sphere", "info"];
  const kept: typeof steps = [];
  const optionSeen = new Set<string>();
  for (const s of steps) {
    if (DEDUPE_KINDS.includes(s.kind)) {
      const key = `${s.classLevel}|${s.tab}|${s.title.toLowerCase()}`;
      if (optionSeen.has(key)) continue;
      optionSeen.add(key);
    }
    kept.push(s);
  }
  steps.length = 0;
  steps.push(...kept);

  // 8. sort, then assign stable unique ids
  steps.sort(
    (a, b) =>
      a.classLevel - b.classLevel ||
      TAB_ORDER.indexOf(a.tab) - TAB_ORDER.indexOf(b.tab) ||
      a.title.localeCompare(b.title),
  );

  const seen = new Map<string, number>();
  return steps.map((s) => {
    const base = `${classSlug}:l${s.classLevel}:${kebab(s.title)}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...s, id: n === 0 ? base : `${base}:${n + 1}` };
  });
}
