"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RULES_SYSTEMS } from "@/lib/constants";

import { useWizard } from "../wizard-provider";

// TEMP: Spheres of Power only, per request — remove this filter to restore
// Pathfinder 1e as a selectable system (matches the same restriction already
// applied to the class picker in class-step.tsx).
const AVAILABLE_SYSTEMS = RULES_SYSTEMS.filter(
  (s) => s.value === "SPHERES_OF_POWER",
);

export function SystemStep() {
  const { state, update } = useWizard();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rules system</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={state.system}
          onValueChange={(v) =>
            v &&
            update({
              system: v as (typeof RULES_SYSTEMS)[number]["value"],
            })
          }
          className="gap-3"
        >
          {AVAILABLE_SYSTEMS.map((s) => (
            <div key={s.value} className="flex items-start gap-3">
              <RadioGroupItem
                value={s.value}
                id={`sys-${s.value}`}
                className="mt-1"
              />
              <label htmlFor={`sys-${s.value}`} className="flex flex-col gap-0.5">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground text-sm">
                  {s.blurb}
                </span>
              </label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
