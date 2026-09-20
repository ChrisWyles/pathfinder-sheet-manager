"use client";

import { useTransition } from "react";
import { toast } from "sonner";

export interface RollResponse {
  result: {
    label: string;
    expression: string;
    output: string;
    total: number;
    dice: number[];
  };
  discord: { attempted: boolean; delivered: boolean; error?: string };
}

export type RollIntent = Record<string, unknown> & { type: string };

/** Posts a roll intent to the character's roll API and surfaces the result
 * via toast — shared by the full Rolls panel and any inline "click to roll"
 * stat (a save, an ability score, ...) so they hit the exact same endpoint
 * and Discord-delivery feedback. */
export function useCharacterRoll(characterId: string) {
  const [pending, startTransition] = useTransition();

  function roll(
    intent: RollIntent,
    onResult?: (data: RollResponse) => void,
  ): Promise<RollResponse | null> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await fetch(`/api/characters/${characterId}/roll`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(intent),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast.error(body?.error ?? "Roll failed");
          resolve(null);
          return;
        }
        const data = (await res.json()) as RollResponse;
        onResult?.(data);
        const nat =
          data.result.expression.startsWith("1d20") &&
          data.result.dice[0] === 20
            ? " — natural 20!"
            : data.result.expression.startsWith("1d20") &&
                data.result.dice[0] === 1
              ? " — natural 1"
              : "";
        toast.success(`${data.result.label}: ${data.result.total}${nat}`, {
          description: data.result.output,
        });
        if (data.discord.attempted && !data.discord.delivered) {
          toast.warning("Discord delivery failed", {
            description: data.discord.error,
          });
        }
        resolve(data);
      });
    });
  }

  return { roll, pending };
}
