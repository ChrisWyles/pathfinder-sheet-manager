/**
 * The creation wizard's page order. Each step is a real route under
 * `/characters/new/<path>`; `enabled` mirrors the old in-page tab visibility
 * rules (a class's own step plan decides whether Features/Spheres apply).
 */

import type { CreationChoiceStep, StepTab } from "@/lib/rules/creation";

import type { WizardState } from "./wizard-provider";

export interface WizardStepDef {
  path: string;
  label: string;
  enabled: (
    state: WizardState,
    planTabs: Map<StepTab, CreationChoiceStep[]>,
  ) => boolean;
}

export const WIZARD_STEPS: WizardStepDef[] = [
  { path: "system", label: "System", enabled: () => true },
  { path: "race", label: "Race", enabled: () => true },
  { path: "class", label: "Class", enabled: () => true },
  { path: "abilities", label: "Abilities", enabled: () => true },
  {
    path: "features",
    label: "Features",
    enabled: (_state, planTabs) => planTabs.has("class-features"),
  },
  {
    path: "casting-tradition",
    label: "Casting tradition",
    enabled: (_state, planTabs) => planTabs.has("casting-tradition"),
  },
  {
    path: "martial-tradition",
    label: "Martial tradition",
    enabled: (_state, planTabs) => planTabs.has("martial-tradition"),
  },
  { path: "skills", label: "Skills", enabled: () => true },
  { path: "feats", label: "Feats", enabled: () => true },
  {
    path: "spheres",
    label: "Spheres",
    enabled: (state, planTabs) =>
      state.system === "SPHERES_OF_POWER" || planTabs.has("spheres"),
  },
  { path: "equipment", label: "Equipment", enabled: () => true },
  { path: "review", label: "Review", enabled: () => true },
];
