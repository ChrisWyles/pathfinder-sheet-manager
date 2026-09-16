"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { abilityModifier } from "@/lib/rules/abilities";
import { estimateStartingHp } from "@/lib/rules/creation";
import { isValidDiscordWebhookUrl } from "@/lib/discord/webhook";
import { ABILITIES } from "@/lib/rules/types";

import { useWizard } from "../wizard-provider";
import { Field, sign } from "./field";

export function ReviewStep() {
  const {
    state,
    update,
    chassis,
    finalAbilities,
    selectedClass,
    problems,
    skillBudget,
    skillSpent,
  } = useWizard();

  const conMod = abilityModifier(finalAbilities.CON);
  const hp = estimateStartingHp(chassis.hitDie, state.level, conMod);

  const webhookState =
    state.webhook.length === 0
      ? "empty"
      : isValidDiscordWebhookUrl(state.webhook)
        ? "valid"
        : "invalid";

  return (
    <div className="space-y-4">
      {problems.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              Fix before creating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-destructive list-disc space-y-1 pl-5 text-sm">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Name your character</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Name">
            <Input
              value={state.name}
              onChange={(e) => update({ name: e.target.value })}
              autoFocus
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Class: </span>
            {chassis.name} {state.level}
            {state.archetype ? ` (${state.archetype})` : ""}
          </div>
          <div>
            <span className="text-muted-foreground">System: </span>
            {state.system === "SPHERES_OF_POWER"
              ? "Spheres of Power"
              : "Pathfinder 1e"}
          </div>
          <div>
            <span className="text-muted-foreground">Race: </span>
            {state.race || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Estimated max HP: </span>
            {hp}
          </div>
          <div>
            <span className="text-muted-foreground">Skill ranks: </span>
            {skillSpent} / {skillBudget}
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Abilities: </span>
            {ABILITIES.map(
              (k) =>
                `${k} ${finalAbilities[k]} (${sign(
                  abilityModifier(finalAbilities[k]),
                )})`,
            ).join(" · ")}
          </div>
          <div>
            <span className="text-muted-foreground">Feats: </span>
            {state.feats.filter((f) => f.name.trim()).length}
          </div>
          <div>
            <span className="text-muted-foreground">Equipment: </span>
            {state.equipment.filter((e) => e.name.trim()).length} items
          </div>
          {state.system === "SPHERES_OF_POWER" && (
            <div>
              <span className="text-muted-foreground">Spheres / talents: </span>
              {state.spheres.filter((s) => s.name.trim()).length} /{" "}
              {state.talents.filter((t) => t.name.trim()).length}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Guided choices made: </span>
            {
              Object.values(state.choices).filter((v) =>
                v.some((x) => x && x.trim()),
              ).length
            }
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord delivery (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Field label="Channel webhook URL">
            <Input
              value={state.webhook}
              onChange={(e) => update({ webhook: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </Field>
          <p className="text-muted-foreground text-sm">
            {webhookState === "invalid"
              ? "That isn't a Discord webhook URL."
              : "Discord → Channel → Edit → Integrations → Webhooks → New Webhook → Copy URL. You can add this later."}
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        {selectedClass.id
          ? "Class chassis comes from the library; the server recalculates derived stats."
          : "Using a built-in preset chassis (no library row)."}
      </p>
    </div>
  );
}
