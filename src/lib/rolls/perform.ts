import type { RollResult } from "@/lib/dice/rolls";
import { executeRoll } from "@/lib/dice/rolls";
import { rollToWebhookPayload } from "@/lib/discord/format";
import { sendToWebhook } from "@/lib/discord/webhook";
import { prisma } from "@/lib/prisma";
import { deriveCharacter } from "@/lib/rules/snapshot";

import { buildRequestFromIntent, type RollIntent } from "./intent";

export interface PerformRollOutcome {
  result: RollResult;
  discord: { attempted: boolean; delivered: boolean; error?: string };
  logId: string;
}

export class CharacterNotFoundError extends Error {
  constructor() {
    super("Character not found");
    this.name = "CharacterNotFoundError";
  }
}

/**
 * Authoritative server-side roll: recomputes the character's derived stats,
 * rolls, records a RollLog, and (if configured) posts the result to Discord.
 */
export async function performCharacterRoll(params: {
  characterId: string;
  userId: string;
  intent: RollIntent;
}): Promise<PerformRollOutcome> {
  const character = await prisma.character.findFirst({
    where: { id: params.characterId, userId: params.userId },
    include: {
      classes: true,
      inventory: { include: { item: true } },
    },
  });
  if (!character) throw new CharacterNotFoundError();

  const derived = deriveCharacter(character);
  const request = buildRequestFromIntent(derived, params.intent);
  const result = executeRoll(request);

  let discord: PerformRollOutcome["discord"] = {
    attempted: false,
    delivered: false,
  };

  if (character.discordWebhookUrl) {
    discord.attempted = true;
    const send = await sendToWebhook(
      character.discordWebhookUrl,
      rollToWebhookPayload(character.name, result),
    );
    discord = {
      attempted: true,
      delivered: send.ok,
      error: send.ok ? undefined : send.error,
    };
  }

  const log = await prisma.rollLog.create({
    data: {
      characterId: character.id,
      userId: params.userId,
      kind: result.kind,
      label: result.label,
      expression: result.expression,
      total: result.total,
      breakdown: JSON.parse(
        JSON.stringify({
          modifiers: result.modifiers,
          output: result.output,
        }),
      ),
      dice: result.dice,
      discordDelivered: discord.delivered,
      discordError: discord.error ?? null,
    },
  });

  return { result, discord, logId: log.id };
}
