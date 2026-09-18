import type { ReactNode } from "react";

import { BuildSummaryPanel } from "@/components/character/create-wizard/build-summary-panel";
import { WizardProvider } from "@/components/character/create-wizard/wizard-provider";
import { WizardFooter } from "@/components/character/create-wizard/wizard-footer";
import { WizardProgress } from "@/components/character/create-wizard/wizard-progress";
import type {
  FeatLite,
  ItemLite,
  SkillLite,
  SphereLite,
  TalentLite,
  TraditionBoonLite,
  TraditionDrawbackLite,
  WizardClass,
} from "@/components/character/create-wizard/wizard-provider";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { SphereClassData } from "@/lib/rules/class-creation-steps";
import { kebab } from "@/lib/rules/creation";
import type { AbilityKey } from "@/lib/rules/types";

const GROUP_LABEL: Record<string, string> = {
  spherecaster: "Spherecaster",
  practitioner: "Practitioner",
  champion: "Champion",
  operative: "Operative",
};

const GROUP_ORDER = [
  "Pathfinder 1e",
  "Spherecaster",
  "Practitioner",
  "Champion",
  "Operative",
  "Spheres of Power",
];

const clip = (s: string | null | undefined, n = 200) => {
  const t = (s ?? "").trim();
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
};

/** Keep only the fields the wizard's step planner needs on the client. */
function trimClassData(raw: unknown): SphereClassData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const advancement = Array.isArray(d.advancement)
    ? (d.advancement as Record<string, unknown>[]).map((r) => ({
        level: Number(r.level),
        columns: (r.columns ?? {}) as Record<string, string>,
      }))
    : undefined;
  return {
    slug: typeof d.slug === "string" ? d.slug : undefined,
    group: typeof d.group === "string" ? d.group : undefined,
    talentColumns: Array.isArray(d.talentColumns)
      ? (d.talentColumns as string[])
      : undefined,
    advancement,
    choicesByLevel: Array.isArray(d.choicesByLevel)
      ? (d.choicesByLevel as { level: number; choices: string[] }[])
      : undefined,
    abilityScoreIncreases: Array.isArray(d.abilityScoreIncreases)
      ? (d.abilityScoreIncreases as number[])
      : undefined,
    archetypes: Array.isArray(d.archetypes)
      ? (d.archetypes as { name: string; summary: string }[]).map((a) => ({
          name: a.name,
          summary: clip(a.summary, 300),
        }))
      : undefined,
    favoredClassBonuses: Array.isArray(d.favoredClassBonuses)
      ? (d.favoredClassBonuses as { race: string; bonus: string }[]).map(
          (f) => ({ race: f.race, bonus: clip(f.bonus, 300) }),
        )
      : undefined,
  };
}

export default async function NewCharacterLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();

  const [
    rows,
    skills,
    feats,
    spheres,
    talents,
    items,
    castingDrawbackRows,
    castingBoonRows,
    martialDrawbackRows,
  ] = await Promise.all([
    prisma.gameClass.findMany({
      orderBy: [{ system: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        system: true,
        description: true,
        hitDie: true,
        babProgression: true,
        fortProgression: true,
        refProgression: true,
        willProgression: true,
        skillRanksPerLevel: true,
        classSkills: true,
        data: true,
        features: {
          select: { name: true, level: true, description: true, data: true },
          orderBy: { level: "asc" },
        },
      },
    }),
    prisma.skill.findMany({ orderBy: { name: "asc" } }),
    prisma.feat.findMany({
      orderBy: { name: "asc" },
      // No cap: the feats library is now the full scraped Spheres of Power
      // list (1000+ rows) — a fixed cap would silently truncate it
      // alphabetically, same lesson learned the hard way with talents.
      select: {
        id: true,
        name: true,
        featTypes: true,
        sphereNames: true,
        prerequisites: true,
        benefit: true,
        sourceUrl: true,
      },
    }),
    prisma.sphere.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true, type: true, description: true },
    }),
    prisma.talent.findMany({
      orderBy: { name: "asc" },
      // No cap: the martial-tradition builder needs every talent for the
      // Equipment sphere and each of the 25 base martial spheres (1000+
      // rows total since those were scraped in full), not just a sample.
      select: {
        id: true,
        name: true,
        sphereName: true,
        description: true,
        talentTypes: true,
        sourceUrl: true,
      },
    }),
    prisma.item.findMany({
      where: { isSrd: true },
      orderBy: { name: "asc" },
      take: 2000,
      select: { id: true, name: true, type: true, costCp: true, weight: true },
    }),
    prisma.traditionDrawback.findMany({
      where: { kind: "CASTING" },
      orderBy: { name: "asc" },
    }),
    prisma.traditionBoon.findMany({ orderBy: { name: "asc" } }),
    prisma.traditionDrawback.findMany({
      where: { kind: "MARTIAL" },
      orderBy: [{ sphereName: "asc" }, { name: "asc" }],
    }),
  ]);

  const classes: WizardClass[] = rows
    .map((r): WizardClass => {
      const cd = trimClassData(r.data);
      const groupKey =
        r.system === "SPHERES_OF_POWER" ? (cd?.group ?? "spheres") : "pf1e";
      const group =
        r.system === "SPHERES_OF_POWER"
          ? (GROUP_LABEL[groupKey] ?? "Spheres of Power")
          : "Pathfinder 1e";
      return {
        id: r.id,
        name: r.name,
        slug: cd?.slug ?? kebab(r.name),
        system: r.system,
        description: r.description ?? "",
        group,
        groupKey,
        hitDie: r.hitDie,
        babProgression: r.babProgression,
        fortProgression: r.fortProgression,
        refProgression: r.refProgression,
        willProgression: r.willProgression,
        skillRanksPerLevel: r.skillRanksPerLevel,
        classSkills: r.classSkills,
        classData: cd,
        features: r.features.map((f) => {
          const bag =
            !!f.data && typeof f.data === "object"
              ? (f.data as { isChoice?: boolean; allLevels?: number[] })
              : undefined;
          return {
            name: f.name,
            level: f.level,
            description: clip(f.description, 240),
            allLevels:
              Array.isArray(bag?.allLevels) && bag.allLevels.length
                ? bag.allLevels
                : [f.level],
            isChoice: Boolean(bag?.isChoice),
          };
        }),
      };
    })
    .sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.group);
      const gb = GROUP_ORDER.indexOf(b.group);
      return ga !== gb ? ga - gb : a.name.localeCompare(b.name);
    });

  const skillList: SkillLite[] = skills.map((s) => ({
    id: s.id,
    name: s.name,
    keyAbility: s.keyAbility as AbilityKey,
    trainedOnly: s.trainedOnly,
    armorCheckPenalty: s.armorCheckPenalty,
    description: s.description,
  }));
  const featList: FeatLite[] = feats.map((f) => ({
    id: f.id,
    name: f.name,
    featTypes: f.featTypes,
    sphereNames: f.sphereNames,
    // Uncut (matches the scraper's own 300/1000-char caps) — the wizard
    // shows the full text in a hover tooltip, not just a cramped snippet.
    prerequisites: clip(f.prerequisites, 300),
    benefit: clip(f.benefit, 1000),
    sourceUrl: f.sourceUrl,
  }));
  const sphereList: SphereLite[] = spheres.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    description: clip(s.description, 1000),
  }));
  const talentList: TalentLite[] = talents.map((t) => ({
    id: t.id,
    name: t.name,
    sphereName: t.sphereName,
    description: clip(t.description, 1000),
    talentTypes: t.talentTypes,
    sourceUrl: t.sourceUrl,
  }));
  const itemList: ItemLite[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    costCp: i.costCp,
    weight: i.weight,
  }));
  const toDrawbackLite = (d: (typeof castingDrawbackRows)[number]): TraditionDrawbackLite => ({
    id: d.id,
    name: d.name,
    description: clip(d.description, 500),
    sphereName: d.sphereName,
    costInDrawbacks: d.costInDrawbacks,
    prerequisites: d.prerequisites,
    incompatibleWith: d.incompatibleWith,
  });
  const castingDrawbackList: TraditionDrawbackLite[] =
    castingDrawbackRows.map(toDrawbackLite);
  const martialDrawbackList: TraditionDrawbackLite[] =
    martialDrawbackRows.map(toDrawbackLite);
  const castingBoonList: TraditionBoonLite[] = castingBoonRows.map((b) => ({
    id: b.id,
    name: b.name,
    description: clip(b.description, 500),
    costInDrawbacks: b.costInDrawbacks,
    prerequisites: b.prerequisites,
    repeatable: b.repeatable,
    grants: Array.isArray(b.grants)
      ? (b.grants as { type: "sphere" | "talent" | "feat"; name: string }[])
      : [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New character</h1>
        <p className="text-muted-foreground">
          A guided build, one step per page. Each class adds its own steps;
          derived stats calculate automatically once you save.
        </p>
      </div>
      <WizardProvider
        classes={classes}
        skills={skillList}
        feats={featList}
        spheres={sphereList}
        talents={talentList}
        items={itemList}
        castingDrawbacks={castingDrawbackList}
        castingBoons={castingBoonList}
        martialDrawbacks={martialDrawbackList}
      >
        <WizardProgress />
        <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {children}
            <WizardFooter />
          </div>
          <div className="lg:sticky lg:top-4">
            <BuildSummaryPanel />
          </div>
        </div>
      </WizardProvider>
    </div>
  );
}
