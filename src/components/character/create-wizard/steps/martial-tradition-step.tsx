"use client";

import { MARTIAL_TRADITIONS } from "@/lib/rules/traditions";

import { useWizard } from "../wizard-provider";
import { TraditionPicker } from "../tradition-picker";

export function MartialTraditionStep() {
  const { stepPlan, state, setChoice } = useWizard();
  const step = stepPlan.find((s) => s.tab === "martial-tradition");

  if (!step) {
    return (
      <p className="text-muted-foreground text-sm">
        This class doesn&apos;t use a martial tradition.
      </p>
    );
  }

  const values = state.choices[step.id] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Martial tradition</h2>
        <p className="text-muted-foreground text-sm">{step.prompt}</p>
      </div>
      <TraditionPicker
        noun="martial tradition"
        presets={MARTIAL_TRADITIONS}
        value={values[0] ?? ""}
        onChange={(v) => setChoice(step.id, [v])}
        stepId={step.id}
        kind="martial"
      />
    </div>
  );
}
