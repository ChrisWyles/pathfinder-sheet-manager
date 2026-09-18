"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useWizard } from "./wizard-provider";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ListRow({
  label,
  items,
  empty = "None yet",
}: {
  label: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div className="text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">
        {items.length ? items.join(", ") : (
          <span className="text-muted-foreground font-normal">{empty}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Persistent right-column overview of the build-in-progress, visible on
 * every wizard step (wired in from the shared `characters/new` layout) — a
 * running answer to "what have I picked so far, and what's still open,"
 * independent of whichever single step is currently on screen.
 */
export function BuildSummaryPanel() {
  const { state, chassis, stepPlan, skillBudget, skillSpent } = useWizard();

  const featSteps = stepPlan.filter((s) => s.kind === "pick-feat");
  const featNames = state.feats.map((f) => f.name.trim()).filter(Boolean);
  const tradedFeatSlotCount = state.feats.filter(
    (f) => f.tradedFor === "magic" || f.tradedFor === "combat",
  ).length;
  const resolvedFeatSlotCount = featNames.length + tradedFeatSlotCount;

  const sphereNames = state.spheres.map((s) => s.name.trim()).filter(Boolean);
  const talentNames = state.talents.map((t) => t.name.trim()).filter(Boolean);

  let suggestedSpheres = 0;
  let suggestedTalents = 0;
  for (const s of stepPlan) {
    if (s.kind === "pick-sphere") suggestedSpheres += s.count;
    if (s.kind === "pick-talent") suggestedTalents += s.count;
  }

  const equippedCount = state.equipment.filter((e) => e.name.trim()).length;

  const traditionLabel =
    state.customCastingTradition
      ? "Custom build"
      : state.choices["casting-tradition"]?.[0] ||
        state.choices["martial-tradition"]?.[0] ||
        "";

  const pending: string[] = [];
  if (!state.race.trim()) pending.push("Race not chosen");
  if (resolvedFeatSlotCount < featSteps.length) {
    const remaining = featSteps.length - resolvedFeatSlotCount;
    pending.push(`${remaining} feat slot${remaining === 1 ? "" : "s"} open`);
  }
  if (suggestedSpheres > 0 && sphereNames.length < suggestedSpheres) {
    pending.push(`${suggestedSpheres - sphereNames.length} sphere(s) suggested`);
  }
  if (skillSpent < skillBudget) {
    pending.push(`${skillBudget - skillSpent} skill rank${skillBudget - skillSpent === 1 ? "" : "s"} unspent`);
  }
  if (!state.name.trim()) pending.push("Character needs a name");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Build summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Name" value={state.name.trim() || "Unnamed"} />
        <Row
          label="System"
          value={
            state.system === "SPHERES_OF_POWER"
              ? "Spheres of Power"
              : "Pathfinder 1e"
          }
        />
        <Row label="Race" value={state.race.trim() || "Not chosen"} />
        <Row label="Class" value={`${chassis.name} ${state.level}`} />
        {state.archetype.trim() && (
          <Row label="Archetype" value={state.archetype.trim()} />
        )}
        {traditionLabel && <Row label="Tradition" value={traditionLabel} />}

        <Separator />

        <ListRow
          label={`Feats (${resolvedFeatSlotCount}${featSteps.length ? ` of ${featSteps.length}` : ""}${tradedFeatSlotCount ? `, ${tradedFeatSlotCount} traded` : ""})`}
          items={featNames}
        />

        {state.system === "SPHERES_OF_POWER" && (
          <>
            <ListRow
              label={`Spheres (${sphereNames.length}${suggestedSpheres ? ` of ${suggestedSpheres}` : ""})`}
              items={sphereNames}
            />
            <ListRow
              label={`Talents (${talentNames.length}${suggestedTalents ? ` of ${suggestedTalents}` : ""})`}
              items={talentNames}
            />
          </>
        )}

        <Row label="Skill ranks" value={`${skillSpent} of ${skillBudget}`} />
        <Row label="Equipment" value={`${equippedCount} item${equippedCount === 1 ? "" : "s"}`} />

        {pending.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="text-sm font-medium">Still needed</div>
              <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5 text-sm">
                {pending.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
