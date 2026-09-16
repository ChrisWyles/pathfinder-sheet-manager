"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@prisma/client";

import { requireSession } from "@/lib/auth-helpers";
import { isValidDiscordWebhookUrl } from "@/lib/discord/webhook";
import { prisma } from "@/lib/prisma";
import { abilityModifier } from "@/lib/rules/abilities";
import {
  buildStepPlan,
  type SphereClassData,
} from "@/lib/rules/class-creation-steps";
import {
  estimateStartingHp,
  featSlotCount,
  kebab,
  maxRanksPerSkill,
  pointBuyTotal,
  skillRanksBudget,
} from "@/lib/rules/creation";
import { summarizeCastingTradition } from "@/lib/rules/casting-tradition";
import { isHumanRace } from "@/lib/rules/races";
import { ABILITIES, type AbilityKey } from "@/lib/rules/types";

const SIZES = [
  "FINE",
  "DIMINUTIVE",
  "TINY",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "HUGE",
  "GARGANTUAN",
  "COLOSSAL",
] as const;

const abilitySchema = z.object({
  STR: z.number().int().min(1).max(60),
  DEX: z.number().int().min(1).max(60),
  CON: z.number().int().min(1).max(60),
  INT: z.number().int().min(1).max(60),
  WIS: z.number().int().min(1).max(60),
  CHA: z.number().int().min(1).max(60),
});

const racialAdjustmentsSchema = z
  .object({
    STR: z.number().int().min(-10).max(10),
    DEX: z.number().int().min(-10).max(10),
    CON: z.number().int().min(-10).max(10),
    INT: z.number().int().min(-10).max(10),
    WIS: z.number().int().min(-10).max(10),
    CHA: z.number().int().min(-10).max(10),
  })
  .partial()
  .default({});

const skillRankSchema = z.object({
  skillId: z.string().min(1),
  ranks: z.number().int().min(0).max(40),
  isClassSkill: z.boolean().default(false),
});

const featSchema = z.object({
  featId: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
  takenAtLevel: z.number().int().min(1).max(20).default(1),
});

const sphereSchema = z.object({
  sphereId: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
});

const talentSchema = z.object({
  talentId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  sphereName: z.string().max(120).default(""),
});

const customCastingTraditionSchema = z
  .object({
    drawbackIds: z.array(z.string().min(1)).max(60).default([]),
    boonIds: z.array(z.string().min(1)).max(60).default([]),
    sphereDrawbackIds: z.array(z.string().min(1)).max(60).default([]),
  })
  .nullable()
  .optional();

const customMartialTraditionSchema = z
  .object({
    disciplineTalentId: z.string().min(1).nullable().default(null),
    secondTalentId: z.string().min(1).nullable().default(null),
    baseSphere: z.string().max(80).nullable().default(null),
    bonusChoice: z.enum(["sphere", "talent", "equipment"]).nullable().default(null),
    bonusSphere: z.string().max(80).nullable().default(null),
    bonusTalentId: z.string().min(1).nullable().default(null),
    bonusEquipmentTalentId: z.string().min(1).nullable().default(null),
  })
  .nullable()
  .optional();

const equipmentSchema = z.object({
  itemId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(9999).default(1),
  costCp: z.number().int().min(0).max(9_999_999).default(0),
  weight: z.number().min(0).max(100000).default(0),
  equipped: z.boolean().default(false),
});

const createSchema = z.object({
  // identity
  name: z.string().min(1).max(120),
  system: z.enum(["PATHFINDER_1E", "SPHERES_OF_POWER"]),
  race: z.string().max(60).default(""),
  alignment: z.string().max(20).default(""),
  deity: z.string().max(60).default(""),
  gender: z.string().max(40).default(""),
  age: z.number().int().min(0).max(100000).optional(),
  size: z.enum(SIZES).default("MEDIUM"),
  baseSpeed: z.number().int().min(0).max(240).default(30),

  // class chassis
  className: z.string().min(1).max(80),
  archetype: z.string().max(120).default(""),
  classLevel: z.number().int().min(1).max(20),
  gameClassId: z.string().min(1).optional(),
  // Flavor text from the class's scraped per-race favored class bonuses —
  // there is no mechanical favored-class-bonus concept in this app.
  favoredBonusNote: z.string().max(400).default(""),
  customCastingTradition: customCastingTraditionSchema,
  customMartialTradition: customMartialTraditionSchema,
  hitDie: z.number().int().min(4).max(12),
  skillRanksPerLevel: z.number().int().min(0).max(12),
  babProgression: z.enum(["FULL", "THREE_QUARTER", "HALF"]),
  fortProgression: z.enum(["GOOD", "POOR"]),
  refProgression: z.enum(["GOOD", "POOR"]),
  willProgression: z.enum(["GOOD", "POOR"]),

  // abilities
  abilities: abilitySchema,
  abilityMethod: z
    .enum(["manual", "standard-array", "point-buy", "roll"])
    .default("manual"),
  pointBuyBudget: z.number().int().min(0).max(60).optional(),
  racialAdjustments: racialAdjustmentsSchema,

  // per-class choices + collections
  choices: z.record(z.string(), z.array(z.string())).default({}),
  skillRanks: z.array(skillRankSchema).max(160).default([]),
  feats: z.array(featSchema).max(80).default([]),
  spheres: z.array(sphereSchema).max(160).default([]),
  talents: z.array(talentSchema).max(300).default([]),
  equipment: z.array(equipmentSchema).max(300).default([]),
  startingGoldCp: z.number().int().min(0).max(999_999_999).optional(),

  discordWebhookUrl: z.string().trim().optional().default(""),
});

export type CreateCharacterInput = z.input<typeof createSchema>;

const asJson = (v: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface MartialTraditionSummary {
  equipmentSphere: "Equipment";
  disciplineTalent: string | null;
  secondTalent: string | null;
  baseSphere: string | null;
  bonus:
    | { type: "sphere"; name: string }
    | { type: "talent"; name: string; fromSphere: string | null }
    | { type: "equipment"; name: string }
    | null;
}

function finalScores(
  base: Record<AbilityKey, number>,
  racial: Partial<Record<AbilityKey, number>>,
): Record<AbilityKey, number> {
  const out = { ...base };
  for (const key of ABILITIES) out[key] += racial[key] ?? 0;
  return out;
}

export async function createCharacter(input: CreateCharacterInput) {
  const session = await requireSession();
  const data = createSchema.parse(input);
  const level = data.classLevel;
  // Calculated from the chosen race, not a client-supplied flag.
  const isHuman = isHumanRace(data.race);

  if (
    data.discordWebhookUrl &&
    !isValidDiscordWebhookUrl(data.discordWebhookUrl)
  ) {
    return { error: "That doesn't look like a Discord webhook URL." };
  }

  // Resolve the class chassis. A library class is authoritative over the
  // client-supplied numbers; the fallback covers the no-DB preset path.
  let chassis = {
    name: data.className,
    hitDie: data.hitDie,
    skillRanksPerLevel: data.skillRanksPerLevel,
    babProgression: data.babProgression,
    fortProgression: data.fortProgression,
    refProgression: data.refProgression,
    willProgression: data.willProgression,
  };
  let gameClassId: string | null = null;
  let classData: SphereClassData | null = null;
  let group: string | null = null;
  let planFeatures: { name: string; level: number; isChoice?: boolean }[] = [];

  if (data.gameClassId) {
    const gc = await prisma.gameClass.findUnique({
      where: { id: data.gameClassId },
      include: { features: { select: { name: true, level: true, data: true } } },
    });
    if (gc) {
      gameClassId = gc.id;
      chassis = {
        name: data.className || gc.name,
        hitDie: gc.hitDie,
        skillRanksPerLevel: gc.skillRanksPerLevel,
        babProgression: gc.babProgression,
        fortProgression: gc.fortProgression,
        refProgression: gc.refProgression,
        willProgression: gc.willProgression,
      };
      classData = (gc.data ?? null) as SphereClassData | null;
      group = classData?.group ?? null;
      planFeatures = gc.features.map((f) => ({
        name: f.name,
        level: f.level,
        isChoice:
          !!f.data && typeof f.data === "object"
            ? Boolean((f.data as { isChoice?: boolean }).isChoice)
            : undefined,
      }));
    }
  }

  const base = data.abilities;
  const final = finalScores(base, data.racialAdjustments);
  const intMod = abilityModifier(final.INT);
  const conMod = abilityModifier(final.CON);

  // --- validation ---------------------------------------------------------
  if (data.abilityMethod === "point-buy" && data.pointBuyBudget != null) {
    const spent = pointBuyTotal(base);
    if (spent > data.pointBuyBudget) {
      return {
        error: `Point buy is over budget: ${spent} spent of ${data.pointBuyBudget}.`,
      };
    }
  }

  const skillBudget = skillRanksBudget({
    classRanksPerLevel: chassis.skillRanksPerLevel,
    intMod,
    level,
    human: isHuman,
  });
  const spentRanks = data.skillRanks.reduce((s, r) => s + r.ranks, 0);
  if (spentRanks > skillBudget) {
    return {
      error: `Too many skill ranks: ${spentRanks} allocated of ${skillBudget}.`,
    };
  }
  const maxRank = maxRanksPerSkill(level);
  if (data.skillRanks.some((r) => r.ranks > maxRank)) {
    return { error: `A skill exceeds the ${maxRank}-rank cap for level ${level}.` };
  }

  const plan = buildStepPlan({
    className: chassis.name,
    classSlug: classData?.slug ?? kebab(chassis.name),
    system: data.system,
    group,
    level,
    classData,
    features: planFeatures,
    isHuman,
  });
  const plannedFeatPicks = plan
    .filter((s) => s.kind === "pick-feat")
    .reduce((s, step) => s + step.count, 0);
  const featAllowance =
    plannedFeatPicks + featSlotCount({ level, human: isHuman }) + 2;
  if (data.feats.length > featAllowance) {
    return {
      error: `Too many feats selected (${data.feats.length}); this build allows about ${featAllowance}.`,
    };
  }

  // --- derived ----------------------------------------------------------
  const average = Math.ceil((chassis.hitDie + 1) / 2);
  const hpRolls = Array.from({ length: level }, (_, i) =>
    i === 0 ? chassis.hitDie : average,
  );
  const maxHp = estimateStartingHp(chassis.hitDie, level, conMod);

  const racialUsed = Object.fromEntries(
    ABILITIES.map((k) => [k, data.racialAdjustments[k] ?? 0]).filter(
      ([, v]) => v !== 0,
    ),
  );
  const abilityModifiers =
    Object.keys(racialUsed).length > 0 ? { racial: racialUsed } : {};

  // Re-resolve the player's custom-tradition picks against the DB — the
  // authoritative source for cost/prerequisite data, not the client's copy.
  let customCastingSummary: {
    drawbacks: string[];
    boons: string[];
    bonusSpellPoints: number;
    sphereDrawbacks: { name: string; sphereName: string }[];
  } | null = null;
  if (
    data.customCastingTradition &&
    (data.customCastingTradition.drawbackIds.length > 0 ||
      data.customCastingTradition.boonIds.length > 0 ||
      data.customCastingTradition.sphereDrawbackIds.length > 0)
  ) {
    const [drawbackRows, boonRows, sphereDrawbackRows] = await Promise.all([
      prisma.traditionDrawback.findMany({
        where: {
          id: { in: data.customCastingTradition.drawbackIds },
          kind: "CASTING",
        },
      }),
      prisma.traditionBoon.findMany({
        where: { id: { in: data.customCastingTradition.boonIds } },
      }),
      prisma.traditionDrawback.findMany({
        where: {
          id: { in: data.customCastingTradition.sphereDrawbackIds },
          kind: "CASTING",
          NOT: { sphereName: "" },
        },
      }),
    ]);
    const summary = summarizeCastingTradition({
      drawbackCosts: drawbackRows.map((d) => d.costInDrawbacks),
      boonCount: boonRows.length,
      casterLevel: level,
    });
    customCastingSummary = {
      drawbacks: drawbackRows.map((d) => d.name),
      boons: boonRows.map((b) => b.name),
      bonusSpellPoints: summary.bonusSpellPoints,
      sphereDrawbacks: sphereDrawbackRows.map((d) => ({
        name: d.name,
        sphereName: d.sphereName,
      })),
    };
  }

  // Martial traditions follow the "Creating New Martial Traditions"
  // guideline: an automatic Equipment sphere, an Equipment discipline
  // talent, a second (any) Equipment talent, a base sphere, and one
  // thematic bonus. Re-resolve every talent id against the DB — never trust
  // the client's copy of a talent's name or its discipline flag.
  let customMartialSummary: MartialTraditionSummary | null = null;
  if (data.customMartialTradition) {
    const m = data.customMartialTradition;
    const talentIds = [
      m.disciplineTalentId,
      m.secondTalentId,
      m.bonusChoice === "equipment" ? m.bonusEquipmentTalentId : null,
      m.bonusChoice === "talent" ? m.bonusTalentId : null,
    ].filter((id): id is string => !!id);
    const talentRows = talentIds.length
      ? await prisma.talent.findMany({ where: { id: { in: talentIds } } })
      : [];

    const discipline = talentRows.find(
      (t) => t.id === m.disciplineTalentId && t.talentTypes.includes("discipline"),
    );
    const second = talentRows.find((t) => t.id === m.secondTalentId);
    const bonusEquipmentTalent = talentRows.find(
      (t) =>
        t.id === m.bonusEquipmentTalentId && !t.talentTypes.includes("discipline"),
    );
    // The bonus talent must actually belong to the chosen base sphere.
    const bonusSphereTalent = talentRows.find(
      (t) => t.id === m.bonusTalentId && t.sphereName === m.baseSphere,
    );

    let bonus: MartialTraditionSummary["bonus"] = null;
    if (m.bonusChoice === "sphere" && m.bonusSphere) {
      bonus = { type: "sphere", name: m.bonusSphere };
    } else if (m.bonusChoice === "talent" && bonusSphereTalent) {
      bonus = {
        type: "talent",
        name: bonusSphereTalent.name,
        fromSphere: m.baseSphere,
      };
    } else if (m.bonusChoice === "equipment" && bonusEquipmentTalent) {
      bonus = { type: "equipment", name: bonusEquipmentTalent.name };
    }

    customMartialSummary = {
      equipmentSphere: "Equipment",
      disciplineTalent: discipline?.name ?? null,
      secondTalent: second?.name ?? null,
      baseSphere: m.baseSphere,
      bonus,
    };
  }

  let spellPoints: number | null = null;
  if (data.system === "SPHERES_OF_POWER" && group === "spherecaster") {
    const castMod = Math.max(
      abilityModifier(final.INT),
      abilityModifier(final.WIS),
      abilityModifier(final.CHA),
    );
    spellPoints =
      Math.max(1, level + castMod) +
      (customCastingSummary?.bonusSpellPoints ?? 0);
  }

  // Dedupe skill ranks by skill (last write wins), drop zeros.
  const skillBySkillId = new Map<string, (typeof data.skillRanks)[number]>();
  for (const r of data.skillRanks) {
    if (r.ranks > 0) skillBySkillId.set(r.skillId, r);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          userId: session.user.id,
          name: data.name,
          system: data.system,
          race: data.race,
          alignment: data.alignment,
          deity: data.deity,
          gender: data.gender,
          age: data.age ?? null,
          size: data.size,
          baseSpeed: data.baseSpeed,
          strength: base.STR,
          dexterity: base.DEX,
          constitution: base.CON,
          intelligence: base.INT,
          wisdom: base.WIS,
          charisma: base.CHA,
          abilityModifiers,
          maxHp,
          currentHp: maxHp,
          hpRolls,
          spellPoints,
          maxSpellPoints: spellPoints,
          discordWebhookUrl: data.discordWebhookUrl || null,
          data: {
            creation: {
              method: data.abilityMethod,
              pointBuyBudget: data.pointBuyBudget ?? null,
              isHuman,
              startingGoldCp: data.startingGoldCp ?? null,
              choices: data.choices,
            },
          },
          classes: {
            create: {
              name: chassis.name,
              gameClassId,
              archetype: data.archetype,
              levels: level,
              hitDie: chassis.hitDie,
              skillRanksPerLevel: chassis.skillRanksPerLevel,
              babProgression: chassis.babProgression,
              fortProgression: chassis.fortProgression,
              refProgression: chassis.refProgression,
              willProgression: chassis.willProgression,
              isFavoredClass: true,
              data: {
                creationChoices: data.choices,
                favoredBonusNote: data.favoredBonusNote || null,
                customCastingTradition: customCastingSummary,
                customMartialTradition: customMartialSummary
                  ? asJson(customMartialSummary)
                  : null,
              },
            },
          },
        },
      });

      const cid = character.id;

      if (skillBySkillId.size > 0) {
        await tx.characterSkillRank.createMany({
          data: [...skillBySkillId.values()].map((r) => ({
            characterId: cid,
            skillId: r.skillId,
            ranks: r.ranks,
            isClassSkill: r.isClassSkill,
          })),
        });
      }

      if (data.feats.length > 0) {
        await tx.characterFeat.createMany({
          data: data.feats.map((f) => ({
            characterId: cid,
            featId: f.featId ?? null,
            name: f.name,
            takenAtLevel: f.takenAtLevel,
          })),
        });
      }

      if (data.spheres.length > 0) {
        await tx.characterSphere.createMany({
          data: data.spheres.map((s) => ({
            characterId: cid,
            sphereId: s.sphereId ?? null,
            name: s.name,
          })),
        });
      }

      if (data.talents.length > 0) {
        await tx.characterTalent.createMany({
          data: data.talents.map((t) => ({
            characterId: cid,
            talentId: t.talentId ?? null,
            name: t.name,
            sphereName: t.sphereName,
          })),
        });
      }

      if (data.equipment.length > 0) {
        await tx.inventoryItem.createMany({
          data: data.equipment.map((e) => ({
            characterId: cid,
            itemId: e.itemId ?? null,
            name: e.name,
            quantity: e.quantity,
            costCp: e.costCp,
            weight: e.weight,
            equipped: e.equipped,
          })),
        });
      }

      return character;
    });

    revalidatePath("/dashboard");
    redirect(`/characters/${created.id}`);
  } catch (err) {
    // `redirect` throws a control-flow signal — let it propagate.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("createCharacter failed", err);
    return { error: "Could not create the character. Please try again." };
  }
}

const webhookSchema = z.object({
  characterId: z.string().min(1),
  url: z.string().trim(),
});

export async function updateDiscordWebhook(
  input: z.infer<typeof webhookSchema>,
) {
  const session = await requireSession();
  const { characterId, url } = webhookSchema.parse(input);

  if (url && !isValidDiscordWebhookUrl(url)) {
    return { error: "That doesn't look like a Discord webhook URL." };
  }

  const { count } = await prisma.character.updateMany({
    where: { id: characterId, userId: session.user.id },
    data: { discordWebhookUrl: url || null },
  });
  if (count === 0) return { error: "Character not found." };

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

export async function deleteCharacter(characterId: string) {
  const session = await requireSession();
  await prisma.character.deleteMany({
    where: { id: characterId, userId: session.user.id },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
