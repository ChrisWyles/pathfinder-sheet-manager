import type { RollResult } from "@/lib/dice/rolls";

import type { DiscordWebhookPayload } from "./webhook";

const KIND_COLOR: Record<string, number> = {
  ATTACK: 0xc0392b,
  DAMAGE: 0xe67e22,
  SAVE: 0x2980b9,
  SKILL: 0x27ae60,
  ABILITY_CHECK: 0x8e44ad,
  INITIATIVE: 0xf1c40f,
  CONCENTRATION: 0x16a085,
  CUSTOM: 0x7f8c8d,
};

function modifierSummary(result: RollResult): string {
  if (result.modifiers.length === 0) return "—";
  return result.modifiers
    .map((m) => {
      const sign = m.value >= 0 ? "+" : "−";
      return `${m.source}: ${sign}${Math.abs(m.value)}`;
    })
    .join("\n");
}

const NAT_20 = "🎯 Natural 20!";
const NAT_1 = "💀 Natural 1!";

function d20Flavor(result: RollResult): string | null {
  if (!result.expression.startsWith("1d20")) return null;
  const first = result.dice[0];
  if (first === 20) return NAT_20;
  if (first === 1) return NAT_1;
  return null;
}

export function rollToWebhookPayload(
  characterName: string,
  result: RollResult,
): DiscordWebhookPayload {
  const flavor = d20Flavor(result);
  const fields = [
    { name: "Roll", value: `\`${result.output}\``, inline: false },
    { name: "Total", value: `**${result.total}**`, inline: true },
    { name: "Modifiers", value: modifierSummary(result), inline: true },
  ];

  return {
    username: characterName,
    embeds: [
      {
        title: result.label,
        description: flavor ?? undefined,
        color: KIND_COLOR[result.kind] ?? KIND_COLOR.CUSTOM,
        fields,
        footer: { text: `Pathfinder Sheet Manager • ${result.kind}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
