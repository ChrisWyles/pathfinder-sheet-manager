// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CORE_RACES } from "@/lib/rules/races";

import { WizardProvider } from "../wizard-provider";
import { RaceStep } from "./race-step";

// The provider imports the "use server" createCharacter action at module
// scope (for its submit()); stub it out so this test doesn't need Next's
// server runtime.
vi.mock("@/app/(app)/characters/actions", () => ({
  createCharacter: vi.fn().mockResolvedValue({}),
}));

afterEach(cleanup);

const emptyData = {
  classes: [],
  skills: [],
  feats: [],
  spheres: [],
  talents: [],
  items: [],
  castingDrawbacks: [],
  castingBoons: [],
  martialDrawbacks: [],
};

function renderRaceStep() {
  return render(
    <WizardProvider {...emptyData}>
      <RaceStep />
    </WizardProvider>,
  );
}

describe("RaceStep", () => {
  it("lists every core race plus a custom option", () => {
    renderRaceStep();
    const list = screen.getByRole("radiogroup", { name: "race" });
    // every curated race + "Custom / other race…"
    expect(list.querySelectorAll('[role="radio"]').length).toBe(
      CORE_RACES.length + 1,
    );
    expect(screen.getByText("Elf")).toBeTruthy();
    expect(screen.getByText("Custom / other race…")).toBeTruthy();
  });

  it("shows the three filter dropdowns", () => {
    renderRaceStep();
    expect(screen.getByRole("button", { name: /^bonus/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^malus/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^size/i })).toBeTruthy();
  });

  it("narrows the race list to a checked Bonus facet", async () => {
    renderRaceStep();
    fireEvent.click(screen.getByRole("button", { name: /^bonus/i }));
    const dex = await screen.findByRole("menuitemcheckbox", {
      name: /dexterity/i,
    });
    fireEvent.click(dex);

    const list = screen.getByRole("radiogroup", { name: "race" });
    const names = [...list.querySelectorAll('[role="radio"]')].map(
      (el) => el.textContent,
    );
    // Elf and Halfling both have a Dex bonus; Dwarf does not.
    expect(names.some((n) => n?.includes("Elf"))).toBe(true);
    expect(names.some((n) => n?.includes("Dwarf"))).toBe(false);
    // Human's flexible +2 never satisfies a fixed-bonus filter.
    expect(names.some((n) => n?.startsWith("Human"))).toBe(false);
  });
});
