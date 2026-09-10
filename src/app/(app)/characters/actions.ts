"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth-helpers";
import { isValidDiscordWebhookUrl } from "@/lib/discord/webhook";
import { prisma } from "@/lib/prisma";
import { abilityModifier } from "@/lib/rules/abilities";

const abilitySchema = z.object({
  STR: z.number().int().min(1).max(60),
  DEX: z.number().int().min(1).max(60),
  CON: z.number().int().min(1).max(60),
  INT: z.number().int().min(1).max(60),
  WIS: z.number().int().min(1).max(60),
  CHA: z.number().int().min(1).max(60),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  system: z.enum(["PATHFINDER_1E", "SPHERES_OF_POWER"]),
  race: z.string().max(60).default(""),
  alignment: z.string().max(20).default(""),
  size: z
    .enum([
      "FINE",
      "DIMINUTIVE",
      "TINY",
      "SMALL",
      "MEDIUM",
      "LARGE",
      "HUGE",
      "GARGANTUAN",
      "COLOSSAL",
    ])
    .default("MEDIUM"),
  baseSpeed: z.number().int().min(0).max(240).default(30),
  abilities: abilitySchema,
  className: z.string().min(1).max(80),
  classLevel: z.number().int().min(1).max(20),
  gameClassId: z.string().min(1).optional(),
  hitDie: z.number().int().min(4).max(12),
  skillRanksPerLevel: z.number().int().min(0).max(12),
  babProgression: z.enum(["FULL", "THREE_QUARTER", "HALF"]),
  fortProgression: z.enum(["GOOD", "POOR"]),
  refProgression: z.enum(["GOOD", "POOR"]),
  willProgression: z.enum(["GOOD", "POOR"]),
  discordWebhookUrl: z.string().trim().optional().default(""),
});

export type CreateCharacterInput = z.input<typeof createSchema>;

function estimateStartingHp(
  hitDie: number,
  level: number,
  conMod: number,
): number {
  const average = Math.ceil((hitDie + 1) / 2);
  const fromDice = hitDie + Math.max(0, level - 1) * average;
  return Math.max(1, fromDice + level * conMod);
}

export async function createCharacter(input: CreateCharacterInput) {
  const session = await requireSession();
  const data = createSchema.parse(input);

  if (
    data.discordWebhookUrl &&
    !isValidDiscordWebhookUrl(data.discordWebhookUrl)
  ) {
    return { error: "That doesn't look like a Discord webhook URL." };
  }

  // When a library class is chosen, take its chassis as authoritative rather
  // than trusting the client-supplied numbers.
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
  if (data.gameClassId) {
    const gc = await prisma.gameClass.findUnique({
      where: { id: data.gameClassId },
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
    }
  }

  const conMod = abilityModifier(data.abilities.CON);
  const maxHp = estimateStartingHp(chassis.hitDie, data.classLevel, conMod);

  const character = await prisma.character.create({
    data: {
      userId: session.user.id,
      name: data.name,
      system: data.system,
      race: data.race,
      alignment: data.alignment,
      size: data.size,
      baseSpeed: data.baseSpeed,
      strength: data.abilities.STR,
      dexterity: data.abilities.DEX,
      constitution: data.abilities.CON,
      intelligence: data.abilities.INT,
      wisdom: data.abilities.WIS,
      charisma: data.abilities.CHA,
      maxHp,
      currentHp: maxHp,
      discordWebhookUrl: data.discordWebhookUrl || null,
      classes: {
        create: {
          name: chassis.name,
          gameClassId,
          levels: data.classLevel,
          hitDie: chassis.hitDie,
          skillRanksPerLevel: chassis.skillRanksPerLevel,
          babProgression: chassis.babProgression,
          fortProgression: chassis.fortProgression,
          refProgression: chassis.refProgression,
          willProgression: chassis.willProgression,
          isFavoredClass: true,
        },
      },
    },
  });

  revalidatePath("/dashboard");
  redirect(`/characters/${character.id}`);
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
