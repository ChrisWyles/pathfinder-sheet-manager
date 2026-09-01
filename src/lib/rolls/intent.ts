import { z } from "zod";

import {
  abilityCheckRequest,
  attackRollRequest,
  initiativeRequest,
  saveRollRequest,
  skillRollRequest,
  type RollModifier,
  type RollRequest,
} from "@/lib/dice/rolls";
import type { DerivedStats } from "@/lib/rules/types";

const modifierSchema = z.object({
  source: z.string().min(1).max(60),
  value: z.number().int().min(-100).max(100),
});

export const rollIntentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("attack"),
    which: z.enum(["melee", "ranged"]),
    weaponName: z.string().min(1).max(80),
    weaponBonus: z.number().int().min(-10).max(20).optional(),
    situational: z.array(modifierSchema).max(10).optional(),
  }),
  z.object({
    type: z.literal("save"),
    save: z.enum(["fort", "ref", "will"]),
    situational: z.array(modifierSchema).max(10).optional(),
  }),
  z.object({
    type: z.literal("ability-check"),
    ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]),
    situational: z.array(modifierSchema).max(10).optional(),
  }),
  z.object({
    type: z.literal("initiative"),
    situational: z.array(modifierSchema).max(10).optional(),
  }),
  z.object({
    type: z.literal("skill"),
    skillName: z.string().min(1).max(60),
    total: z.number().int().min(-20).max(80),
    situational: z.array(modifierSchema).max(10).optional(),
  }),
  z.object({
    type: z.literal("custom"),
    label: z.string().min(1).max(80),
    dice: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[0-9dkhlr!<>=+\-*/%().\s]+$/i, "Unsupported dice notation"),
    modifiers: z.array(modifierSchema).max(15).optional(),
  }),
]);

export type RollIntent = z.infer<typeof rollIntentSchema>;

export function buildRequestFromIntent(
  derived: DerivedStats,
  intent: RollIntent,
): RollRequest {
  const situational = (intent as { situational?: RollModifier[] }).situational;
  switch (intent.type) {
    case "attack":
      return attackRollRequest(derived, {
        which: intent.which,
        weaponName: intent.weaponName,
        weaponBonus: intent.weaponBonus,
        situational,
      });
    case "save":
      return saveRollRequest(derived, intent.save, situational);
    case "ability-check":
      return abilityCheckRequest(derived, intent.ability, situational);
    case "initiative":
      return initiativeRequest(derived, situational);
    case "skill":
      return skillRollRequest(intent.skillName, intent.total, situational);
    case "custom":
      return {
        kind: "CUSTOM",
        label: intent.label,
        dice: intent.dice,
        modifiers: intent.modifiers ?? [],
      };
  }
}
