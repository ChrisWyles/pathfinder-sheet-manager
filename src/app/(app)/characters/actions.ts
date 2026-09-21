"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ActionSpeed,
  ArmorCategory,
  ItemType,
  WeaponCategory,
  type Prisma,
} from "@prisma/client";

import { requireSession } from "@/lib/auth-helpers";
import { isValidDiscordWebhookUrl, sendToWebhook } from "@/lib/discord/webhook";
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
import { readEffects } from "@/lib/rules/inventory-item";
import { isHumanRace } from "@/lib/rules/races";
import { sphereGrantedAbility } from "@/lib/rules/sphere-abilities";
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
  // The ability governing spell points/casting (Spheres of Power: chosen
  // from Int/Wis/Cha at creation). Undefined when the class fixes one or
  // the player hasn't picked yet — spellPoints then falls back to the
  // best of the three, same as before this was tracked.
  castingAbility: z.enum(["INT", "WIS", "CHA"]).optional(),
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
    // Prefer the player's chosen casting ability; fall back to the best of
    // the three mental abilities when none was chosen (old characters, or
    // a class that hadn't prompted for one yet).
    const castMod = data.castingAbility
      ? abilityModifier(final[data.castingAbility])
      : Math.max(
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
          castingAbility: data.castingAbility ?? null,
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

        // Each sphere that grants a free base ability (see
        // src/lib/rules/sphere-abilities.ts) gets it added to the Actions
        // section automatically — e.g. taking Destruction grants
        // Destructive Blast.
        const grantedActions = data.spheres
          .map((s) => sphereGrantedAbility(s.name))
          .filter((a): a is NonNullable<typeof a> => !!a)
          .map((a) => ({
            characterId: cid,
            name: a.actionName,
            description: a.description,
            // The actual range scales with caster level and is computed
            // at render time (see src/lib/rules/sphere-range.ts) from the
            // registry's rangeKind — nothing static to store here.
            sphereName: a.sphereName,
          }));
        if (grantedActions.length > 0) {
          await tx.characterAction.createMany({ data: grantedActions });
        }
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

const resourcesSchema = z.object({
  characterId: z.string().min(1),
  currentHp: z.number().int().min(-999).max(9999).optional(),
  tempHp: z.number().int().min(0).max(9999).optional(),
  spellPoints: z.number().int().min(0).max(9999).nullable().optional(),
});

/** Updates the character's trackable-in-play resource pools (current/temp HP,
 * and spell points for spherecasters) — everything else on the sheet is
 * either computed or edited through level-up. Each field is independently
 * optional so a focused widget (e.g. a Combat-tab spell points box) can
 * update just one without needing the others' current values on hand. */
export async function updateResources(input: z.infer<typeof resourcesSchema>) {
  const session = await requireSession();
  const { characterId, currentHp, tempHp, spellPoints } =
    resourcesSchema.parse(input);

  const { count } = await prisma.character.updateMany({
    where: { id: characterId, userId: session.user.id },
    data: {
      ...(currentHp !== undefined ? { currentHp } : {}),
      ...(tempHp !== undefined ? { tempHp } : {}),
      ...(spellPoints !== undefined ? { spellPoints } : {}),
    },
  });
  if (count === 0) return { error: "Character not found." };

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const damageReductionSchema = z.object({
  characterId: z.string().min(1),
  damageReduction: z.string().trim().max(60),
});

export async function updateDamageReduction(
  input: z.infer<typeof damageReductionSchema>,
) {
  const session = await requireSession();
  const { characterId, damageReduction } = damageReductionSchema.parse(input);

  const { count } = await prisma.character.updateMany({
    where: { id: characterId, userId: session.user.id },
    data: { damageReduction },
  });
  if (count === 0) return { error: "Character not found." };

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const martialFocusSchema = z.object({
  characterId: z.string().min(1),
  martialFocus: z.boolean(),
});

export async function updateMartialFocus(
  input: z.infer<typeof martialFocusSchema>,
) {
  const session = await requireSession();
  const { characterId, martialFocus } = martialFocusSchema.parse(input);

  const { count } = await prisma.character.updateMany({
    where: { id: characterId, userId: session.user.id },
    data: { martialFocus },
  });
  if (count === 0) return { error: "Character not found." };

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const discordFieldSchema = z.object({
  name: z.string().min(1).max(80),
  value: z.string().min(1).max(400),
});
const postInfoSchema = z.object({
  characterId: z.string().min(1),
  title: z.string().min(1).max(80),
  fields: z.array(discordFieldSchema).min(1).max(10),
});

/** Posts a labeled block of sheet fields (e.g. the Hit Points section, as
 * currently shown) to the character's Discord webhook — distinct from a
 * dice roll, this is just "share this info," so it skips RollLog entirely. */
export async function postInfoToDiscord(input: z.infer<typeof postInfoSchema>) {
  const session = await requireSession();
  const { characterId, title, fields } = postInfoSchema.parse(input);

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
    select: { name: true, discordWebhookUrl: true },
  });
  if (!character) return { error: "Character not found." };
  if (!character.discordWebhookUrl) {
    return { error: "No Discord webhook configured for this character." };
  }

  const send = await sendToWebhook(character.discordWebhookUrl, {
    username: character.name,
    embeds: [
      {
        title,
        fields: fields.map((f) => ({ name: f.name, value: f.value, inline: true })),
        color: 0x5865f2,
        footer: { text: "Pathfinder Sheet Manager" },
        timestamp: new Date().toISOString(),
      },
    ],
  });
  if (!send.ok) return { error: send.error ?? "Discord delivery failed." };
  return { ok: true };
}

const GRIP_VALUES = ["one-hand", "two-hand", "ranged"] as const;
const ARMOR_BUCKET_VALUES = ["LIGHT", "MEDIUM", "HEAVY", "SHIELD"] as const;
const CONSUMABLE_BUCKET_VALUES = ["CONSUMABLE", "NON_CONSUMABLE"] as const;

// d20pfsrd's weapon-table subcategory text (scraped into Item.data.subcategory)
// that each grip bucket covers — light melee weapons count as one-handed.
const GRIP_SUBCATEGORIES: Record<(typeof GRIP_VALUES)[number], string[]> = {
  "one-hand": ["Light Melee Weapons", "One-Handed Melee Weapons"],
  "two-hand": ["Two-Handed Melee Weapons"],
  ranged: ["Ranged Weapons"],
};

const CONSUMABLE_ITEM_TYPES: ItemType[] = ["CONSUMABLE", "POTION", "SCROLL"];
const NON_CONSUMABLE_ITEM_TYPES: ItemType[] = [
  "GEAR",
  "TOOL",
  "WONDROUS",
  "RING",
  "ROD",
  "STAFF",
  "WAND",
  "TREASURE",
  "OTHER",
];

const itemSearchSchema = z.object({
  query: z.string().trim().max(80).default(""),
  types: z.array(z.nativeEnum(ItemType)).min(1),
  weaponCategories: z.array(z.nativeEnum(WeaponCategory)).max(4).default([]),
  grips: z.array(z.enum(GRIP_VALUES)).max(3).default([]),
  armorBuckets: z.array(z.enum(ARMOR_BUCKET_VALUES)).max(4).default([]),
  consumableBuckets: z.array(z.enum(CONSUMABLE_BUCKET_VALUES)).max(2).default([]),
});

/** Searches the shared item catalog, scoped to the given type(s) plus
 * optional tab-specific filters — used by the equipment tab's "Add" picker
 * so each sub-tab only offers items of its own kind (weapons, armor/
 * shields, or everything else) narrowed further by proficiency/grip,
 * armor weight class, or consumable-ness. */
export async function searchItems(input: z.input<typeof itemSearchSchema>) {
  await requireSession();
  const { query, types, weaponCategories, grips, armorBuckets, consumableBuckets } =
    itemSearchSchema.parse(input);

  const and: Prisma.ItemWhereInput[] = [
    { type: { in: types } },
    ...(query ? [{ name: { contains: query, mode: "insensitive" as const } }] : []),
  ];

  if (weaponCategories.length > 0) {
    and.push({ weaponCategory: { in: weaponCategories } });
  }

  if (grips.length > 0) {
    const subcategories = new Set(grips.flatMap((g) => GRIP_SUBCATEGORIES[g]));
    and.push({
      OR: [...subcategories].map((s) => ({
        data: { path: ["subcategory"], equals: s },
      })),
    });
  }

  if (armorBuckets.length > 0) {
    and.push({
      OR: armorBuckets.map((b) =>
        b === "SHIELD"
          ? { type: "SHIELD" as const }
          : { type: "ARMOR" as const, armorCategory: b },
      ),
    });
  }

  if (consumableBuckets.length > 0) {
    const itemTypes = new Set(
      consumableBuckets.flatMap((b) =>
        b === "CONSUMABLE" ? CONSUMABLE_ITEM_TYPES : NON_CONSUMABLE_ITEM_TYPES,
      ),
    );
    and.push({ type: { in: [...itemTypes] } });
  }

  return prisma.item.findMany({
    where: { AND: and },
    orderBy: { name: "asc" },
    take: 50,
  });
}

const addInventoryItemSchema = z.object({
  characterId: z.string().min(1),
  itemId: z.string().min(1),
});

export async function addInventoryItem(
  input: z.infer<typeof addInventoryItemSchema>,
) {
  const session = await requireSession();
  const { characterId, itemId } = addInventoryItemSchema.parse(input);

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
    select: { id: true },
  });
  if (!character) return { error: "Character not found." };

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found." };

  await prisma.inventoryItem.create({
    data: {
      characterId,
      itemId: item.id,
      name: item.name,
      weight: item.weight,
      costCp: item.costCp,
    },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const updateInventoryItemFlagsSchema = z.object({
  characterId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  equipped: z.boolean().optional(),
  masterwork: z.boolean().optional(),
});

export async function updateInventoryItemFlags(
  input: z.infer<typeof updateInventoryItemFlagsSchema>,
) {
  const session = await requireSession();
  const { characterId, inventoryItemId, equipped, masterwork } =
    updateInventoryItemFlagsSchema.parse(input);

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
    select: { id: true },
  });
  if (!character) return { error: "Character not found." };

  const { count } = await prisma.inventoryItem.updateMany({
    where: { id: inventoryItemId, characterId },
    data: {
      ...(equipped !== undefined ? { equipped } : {}),
      ...(masterwork !== undefined ? { masterwork } : {}),
    },
  });
  if (count === 0) return { error: "Item not found." };

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const removeInventoryItemSchema = z.object({
  characterId: z.string().min(1),
  inventoryItemId: z.string().min(1),
});

export async function removeInventoryItem(
  input: z.infer<typeof removeInventoryItemSchema>,
) {
  const session = await requireSession();
  const { characterId, inventoryItemId } =
    removeInventoryItemSchema.parse(input);

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
    select: { id: true },
  });
  if (!character) return { error: "Character not found." };

  await prisma.inventoryItem.deleteMany({
    where: { id: inventoryItemId, characterId },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

async function requireOwnedCharacter(characterId: string) {
  const session = await requireSession();
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: session.user.id },
    select: { id: true },
  });
  return character ? session : null;
}

const updateInventoryItemDetailsSchema = z.object({
  characterId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/** Renames an inventory item and/or edits its freeform description/notes. */
export async function updateInventoryItemDetails(
  input: z.infer<typeof updateInventoryItemDetailsSchema>,
) {
  const { characterId, inventoryItemId, name, notes } =
    updateInventoryItemDetailsSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  const { count } = await prisma.inventoryItem.updateMany({
    where: { id: inventoryItemId, characterId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
  if (count === 0) return { error: "Item not found." };

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const addInventoryItemEffectSchema = z.object({
  characterId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
});

/** Attaches an enchantment/enhancement/attachment to an inventory item —
 * purely descriptive, tracked as freeform text rather than a computed
 * mechanical bonus. */
export async function addInventoryItemEffect(
  input: z.infer<typeof addInventoryItemEffectSchema>,
) {
  const { characterId, inventoryItemId, name, description } =
    addInventoryItemEffectSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  const row = await prisma.inventoryItem.findFirst({
    where: { id: inventoryItemId, characterId },
    select: { effects: true },
  });
  if (!row) return { error: "Item not found." };

  const effects = readEffects(row.effects);
  effects.push({ id: crypto.randomUUID(), name, description });
  await prisma.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { effects: asJson(effects) },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const removeInventoryItemEffectSchema = z.object({
  characterId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  effectId: z.string().min(1),
});

export async function removeInventoryItemEffect(
  input: z.infer<typeof removeInventoryItemEffectSchema>,
) {
  const { characterId, inventoryItemId, effectId } =
    removeInventoryItemEffectSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  const row = await prisma.inventoryItem.findFirst({
    where: { id: inventoryItemId, characterId },
    select: { effects: true },
  });
  if (!row) return { error: "Item not found." };

  const effects = readEffects(row.effects).filter((e) => e.id !== effectId);
  await prisma.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { effects: asJson(effects) },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const customItemStatsSchema = z.object({
  type: z.nativeEnum(ItemType),
  description: z.string().trim().max(2000).default(""),
  weaponCategory: z.nativeEnum(WeaponCategory).optional(),
  damage: z.string().trim().max(40).optional(),
  damageType: z.string().trim().max(40).optional(),
  critRange: z.number().int().min(1).max(20).optional(),
  critMultiplier: z.number().int().min(1).max(10).optional(),
  rangeIncrement: z.number().int().min(0).max(2000).nullable().optional(),
  armorCategory: z.nativeEnum(ArmorCategory).optional(),
  acBonus: z.number().int().min(-20).max(50).optional(),
  maxDexBonus: z.number().int().min(0).max(20).nullable().optional(),
  armorCheckPenalty: z.number().int().min(0).max(20).optional(),
  spellFailure: z.number().int().min(0).max(100).optional(),
});

const createCustomInventoryItemSchema = z.object({
  characterId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  costCp: z.number().int().min(0).max(9_999_999).default(0),
  weight: z.number().min(0).max(100000).default(0),
  stats: customItemStatsSchema,
});

/** Creates a freeform, non-catalog inventory item — the player supplies
 * every field by hand instead of picking from the shared Item library. All
 * of its stats live in `customData`; `resolveItemStats` (shared by the
 * sheet UI and derived-stat math) reads it the same way it reads a catalog
 * item, so an equipped custom weapon/armor works exactly like a real one. */
export async function createCustomInventoryItem(
  input: z.infer<typeof createCustomInventoryItemSchema>,
) {
  const { characterId, name, costCp, weight, stats } =
    createCustomInventoryItemSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  await prisma.inventoryItem.create({
    data: {
      characterId,
      name,
      costCp,
      weight,
      customData: asJson(stats),
    },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const rollModifierSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.number().int().min(-100).max(100),
});

const rollSlotSchema = z.object({
  label: z.string().trim().max(60).default(""),
  diceSides: z.number().int().min(1).max(1000).nullable().default(null),
  diceCount: z.number().int().min(0).max(100).default(1),
  scalePerLevels: z.number().int().min(0).max(20).default(0),
  scaleSource: z.string().trim().max(80).default(""),
  modifiers: z.array(rollModifierSchema).max(10).default([]),
});

const createCharacterActionSchema = z.object({
  characterId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  actionSpeed: z.nativeEnum(ActionSpeed).default("STANDARD"),
  range: z.string().trim().max(60).default(""),
  roll1: rollSlotSchema.optional(),
  roll2: rollSlotSchema.optional(),
  linkedFeatIds: z.array(z.string().min(1)).max(20).default([]),
  linkedTalentIds: z.array(z.string().min(1)).max(20).default([]),
});

/** Creates a player-defined custom action for the Combat tab's Actions
 * section — a class feature, improvised maneuver, or anything else not
 * already covered by a weapon attack or a standard combat maneuver. */
export async function createCharacterAction(
  input: z.infer<typeof createCharacterActionSchema>,
) {
  const {
    characterId,
    name,
    description,
    actionSpeed,
    range,
    roll1,
    roll2,
    linkedFeatIds,
    linkedTalentIds,
  } = createCharacterActionSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  // Only trust feat/talent ids that actually belong to this character.
  const [feats, talents] = await Promise.all([
    linkedFeatIds.length
      ? prisma.characterFeat.findMany({
          where: { id: { in: linkedFeatIds }, characterId },
          select: { id: true },
        })
      : [],
    linkedTalentIds.length
      ? prisma.characterTalent.findMany({
          where: { id: { in: linkedTalentIds }, characterId },
          select: { id: true },
        })
      : [],
  ]);

  await prisma.characterAction.create({
    data: {
      characterId,
      name,
      description,
      actionSpeed,
      range,
      roll1: roll1 ? asJson(roll1) : undefined,
      roll2: roll2 ? asJson(roll2) : undefined,
      linkedFeatIds: feats.map((f) => f.id),
      linkedTalentIds: talents.map((t) => t.id),
    },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const removeCharacterActionSchema = z.object({
  characterId: z.string().min(1),
  actionId: z.string().min(1),
});

export async function removeCharacterAction(
  input: z.infer<typeof removeCharacterActionSchema>,
) {
  const { characterId, actionId } = removeCharacterActionSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  await prisma.characterAction.deleteMany({
    where: { id: actionId, characterId },
  });

  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

const updateDestructiveBlastConfigSchema = z.object({
  characterId: z.string().min(1),
  actionId: z.string().min(1),
  blastShapeTalentId: z.string().min(1).nullable(),
  blastTypeTalentId: z.string().min(1).nullable(),
  boosted: z.boolean(),
});

/** Saves the player's blast shape/blast type talent picks (and the "boost
 * for 1 spell point" toggle) on an auto-granted Destructive Blast action —
 * see src/lib/rules/destructive-blast.ts for how the sheet resolves these
 * into actual dice/damage type. */
export async function updateDestructiveBlastConfig(
  input: z.infer<typeof updateDestructiveBlastConfigSchema>,
) {
  const { characterId, actionId, blastShapeTalentId, blastTypeTalentId, boosted } =
    updateDestructiveBlastConfigSchema.parse(input);
  if (!(await requireOwnedCharacter(characterId))) {
    return { error: "Character not found." };
  }

  // Only trust talent ids that actually belong to this character.
  const ids = [blastShapeTalentId, blastTypeTalentId].filter(
    (id): id is string => !!id,
  );
  const owned = ids.length
    ? await prisma.characterTalent.findMany({
        where: { id: { in: ids }, characterId },
        select: { id: true },
      })
    : [];
  const ownedIds = new Set(owned.map((t) => t.id));

  const { count } = await prisma.characterAction.updateMany({
    where: { id: actionId, characterId },
    data: {
      sphereConfig: asJson({
        blastShapeTalentId:
          blastShapeTalentId && ownedIds.has(blastShapeTalentId)
            ? blastShapeTalentId
            : null,
        blastTypeTalentId:
          blastTypeTalentId && ownedIds.has(blastTypeTalentId)
            ? blastTypeTalentId
            : null,
        boosted,
      }),
    },
  });
  if (count === 0) return { error: "Action not found." };

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
