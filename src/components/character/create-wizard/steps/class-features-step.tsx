"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ABILITY_META } from "@/lib/constants";
import { abilityModifier } from "@/lib/rules/abilities";
import type { CreationChoiceStep } from "@/lib/rules/creation";
import { ABILITIES } from "@/lib/rules/types";

import { useWizard } from "../wizard-provider";
import { OptionPicker } from "../option-picker";
import { sign } from "./field";

function StepControl({ step }: { step: CreationChoiceStep }) {
  const { state, setChoice, finalAbilities } = useWizard();
  const values = state.choices[step.id] ?? [];
  const set = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    setChoice(step.id, next);
  };
  const slots = Array.from({ length: Math.max(1, step.count) });

  if (step.kind === "info") {
    return <p className="text-muted-foreground text-sm">{step.prompt}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{step.prompt}</p>
      {slots.map((_, i) => {
        if (step.kind === "ability-boost") {
          return (
            <div key={i} className="flex flex-wrap gap-1.5">
              {ABILITIES.map((a) => {
                const active = values[i] === a;
                const next = finalAbilities[a] + 1;
                return (
                  <Button
                    key={a}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => set(i, a)}
                  >
                    {ABILITY_META[a].short} +1
                    <span
                      className={
                        active
                          ? "ml-1 opacity-80"
                          : "text-muted-foreground ml-1"
                      }
                    >
                      → {next} ({sign(abilityModifier(next))})
                    </span>
                  </Button>
                );
              })}
            </div>
          );
        }

        if (step.options?.length) {
          return (
            <OptionPicker
              key={i}
              aria-label={step.title}
              options={step.options.map((o) => ({
                value: o.value,
                label: o.label,
                preview: o.description,
              }))}
              value={values[i] ?? null}
              onChange={(v) => set(i, v)}
            />
          );
        }

        return (
          <Input
            key={i}
            value={values[i] ?? ""}
            onChange={(e) => set(i, e.target.value)}
            placeholder="Type your choice"
          />
        );
      })}
    </div>
  );
}

export function ClassFeaturesStep() {
  const { stepPlan, state, selectedClass } = useWizard();
  const steps = stepPlan.filter((s) => s.tab === "class-features");

  const byLevel = new Map<number, typeof steps>();
  for (const s of steps) {
    const list = byLevel.get(s.classLevel) ?? [];
    list.push(s);
    byLevel.set(s.classLevel, list);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Class features &amp; choices</h2>
        <p className="text-muted-foreground text-sm">
          {selectedClass.name} to level {state.level}. Feats are on the Feats
          tab; spheres and talents on the Spheres tab; casting/martial
          traditions have their own steps.
        </p>
      </div>

      {levels.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No guided feature choices for this class and level.
        </p>
      ) : (
        levels.map((lvl) => (
          <Card key={lvl}>
            <CardHeader>
              <CardTitle className="text-base">Level {lvl}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {byLevel.get(lvl)!.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 text-sm font-medium">{s.title}</div>
                  <StepControl step={s} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
