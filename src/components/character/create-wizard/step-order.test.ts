import { describe, expect, it } from "vitest";

import type { CreationChoiceStep, StepTab } from "@/lib/rules/creation";

import { WIZARD_STEPS } from "./step-order";
import type { WizardState } from "./wizard-provider";

function state(overrides: Partial<WizardState> = {}): WizardState {
  return {
    system: "PATHFINDER_1E",
    classKey: "Fighter",
    className: "Fighter",
    archetype: "",
    level: 1,
    favoredBonusNote: "",
    castingAbility: null,
    customCastingTradition: null,
    customMartialTradition: null,
    name: "",
    raceKey: "",
    race: "",
    alignment: "",
    deity: "",
    gender: "",
    age: "",
    size: "MEDIUM",
    baseSpeed: 30,
    racial: {},
    abilityMethod: "manual",
    pointBuyBudget: 15,
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    rolled: null,
    choices: {},
    skillRanks: {},
    feats: [],
    spheres: [],
    talents: [],
    startingGold: 0,
    equipment: [],
    webhook: "",
    ...overrides,
  };
}

function planTabs(
  tabs: StepTab[],
): Map<StepTab, CreationChoiceStep[]> {
  return new Map(tabs.map((t) => [t, []]));
}

function enabledPaths(s: WizardState, tabs: StepTab[]): string[] {
  return WIZARD_STEPS.filter((step) => step.enabled(s, planTabs(tabs))).map(
    (step) => step.path,
  );
}

describe("WIZARD_STEPS", () => {
  it("always includes the core steps", () => {
    const paths = enabledPaths(state(), []);
    expect(paths).toEqual([
      "system",
      "race",
      "class",
      "abilities",
      "skills",
      "feats",
      "equipment",
      "review",
    ]);
  });

  it("adds Features only when the step plan has class-features choices", () => {
    expect(enabledPaths(state(), []).includes("features")).toBe(false);
    expect(
      enabledPaths(state(), ["class-features"]).includes("features"),
    ).toBe(true);
  });

  it("adds Spheres for the Spheres of Power system even with an empty plan", () => {
    expect(enabledPaths(state(), []).includes("spheres")).toBe(false);
    expect(
      enabledPaths(state({ system: "SPHERES_OF_POWER" }), []).includes(
        "spheres",
      ),
    ).toBe(true);
  });

  it("adds Spheres for a PF1e build whose plan still has sphere picks", () => {
    expect(enabledPaths(state(), ["spheres"]).includes("spheres")).toBe(true);
  });
});
