"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ABILITIES } from "@/lib/rules/types";

interface RollResponse {
  result: {
    label: string;
    expression: string;
    output: string;
    total: number;
    dice: number[];
  };
  discord: { attempted: boolean; delivered: boolean; error?: string };
}

type Intent = Record<string, unknown> & { type: string };

export function RollPanel({ characterId }: { characterId: string }) {
  const [pending, startTransition] = useTransition();
  const [last, setLast] = useState<RollResponse | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customDice, setCustomDice] = useState("1d20");

  function roll(intent: Intent) {
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
        return;
      }
      const data = (await res.json()) as RollResponse;
      setLast(data);
      const nat =
        data.result.expression.startsWith("1d20") && data.result.dice[0] === 20
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
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rolls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label="Saves">
          {(["fort", "ref", "will"] as const).map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => roll({ type: "save", save: s })}
            >
              {{ fort: "Fortitude", ref: "Reflex", will: "Will" }[s]}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => roll({ type: "initiative" })}
          >
            Initiative
          </Button>
        </Group>

        <Group label="Ability checks">
          {ABILITIES.map((a) => (
            <Button
              key={a}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => roll({ type: "ability-check", ability: a })}
            >
              {a}
            </Button>
          ))}
        </Group>

        <div className="space-y-2">
          <p className="text-sm font-medium">Custom roll</p>
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-40"
              placeholder="Label"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
            <Input
              className="w-32"
              placeholder="1d20+5"
              value={customDice}
              onChange={(e) => setCustomDice(e.target.value)}
            />
            <Button
              size="sm"
              disabled={pending || !customLabel.trim() || !customDice.trim()}
              onClick={() =>
                roll({
                  type: "custom",
                  label: customLabel.trim(),
                  dice: customDice.trim(),
                })
              }
            >
              Roll
            </Button>
          </div>
        </div>

        {last && (
          <div className="bg-muted/40 rounded-md border p-3 text-sm">
            <p className="font-medium">
              {last.result.label}: {last.result.total}
            </p>
            <p className="text-muted-foreground">{last.result.output}</p>
            {last.discord.attempted && (
              <p className="text-muted-foreground mt-1 text-xs">
                {last.discord.delivered
                  ? "Sent to Discord"
                  : `Discord: ${last.discord.error ?? "failed"}`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
