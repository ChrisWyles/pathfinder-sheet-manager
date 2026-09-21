"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ABILITY_META } from "@/lib/constants";
import { CLASS_CREATION_STEPS } from "@/lib/rules/class-creation-steps";
import { CASTING_TRADITIONS } from "@/lib/rules/traditions";
import type { CastingAbilityKey } from "@/lib/rules/types";

import { useWizard } from "../wizard-provider";
import { TraditionPicker } from "../tradition-picker";

function CastingAbilityField() {
  const { state, update, selectedClass } = useWizard();
  const fixed = CLASS_CREATION_STEPS[selectedClass.name]?.castingAbility;

  if (fixed) {
    return (
      <p className="text-sm">
        <span className="text-muted-foreground">Casting ability: </span>
        <span className="font-medium">{ABILITY_META[fixed].label}</span>
      </p>
    );
  }

  return (
    <div className="max-w-xs space-y-1">
      <label className="text-sm font-medium">Casting ability</label>
      <Select
        items={{ INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma" }}
        value={state.castingAbility ?? ""}
        onValueChange={(v) =>
          v && update({ castingAbility: v as CastingAbilityKey })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose Int, Wis, or Cha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="INT">Intelligence</SelectItem>
          <SelectItem value="WIS">Wisdom</SelectItem>
          <SelectItem value="CHA">Charisma</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">
        Governs your spell points and any ability checks/DCs your class
        features key off of casting ability. This choice is permanent.
      </p>
    </div>
  );
}

export function CastingTraditionStep() {
  const { stepPlan, state, setChoice } = useWizard();
  const step = stepPlan.find((s) => s.tab === "casting-tradition");

  if (!step) {
    return (
      <p className="text-muted-foreground text-sm">
        This class doesn&apos;t use a casting tradition.
      </p>
    );
  }

  const values = state.choices[step.id] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Casting tradition</h2>
        <p className="text-muted-foreground text-sm">{step.prompt}</p>
      </div>
      <CastingAbilityField />
      <TraditionPicker
        noun="casting tradition"
        presets={CASTING_TRADITIONS}
        value={values[0] ?? ""}
        onChange={(v) => setChoice(step.id, [v])}
        stepId={step.id}
        kind="casting"
      />
    </div>
  );
}
