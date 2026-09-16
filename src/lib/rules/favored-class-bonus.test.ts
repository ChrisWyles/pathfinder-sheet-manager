import { describe, expect, it } from "vitest";

import {
  favoredClassBonusTalentsEarned,
  parseFavoredClassBonusMechanic,
} from "./favored-class-bonus";

describe("parseFavoredClassBonusMechanic", () => {
  it("extracts a single named sphere", () => {
    expect(parseFavoredClassBonusMechanic("+1/5 of a Life sphere talent.")).toEqual(
      { every: 5, spheres: ["Life"] },
    );
  });

  it("extracts an 'X or Y sphere' choice as both spheres", () => {
    expect(
      parseFavoredClassBonusMechanic(
        "+1/5 of an Destruction or Scoundrel sphere talent.",
      ),
    ).toEqual({ every: 5, spheres: ["Destruction", "Scoundrel"] });
  });

  it("returns an empty sphere list for a generic talent", () => {
    expect(
      parseFavoredClassBonusMechanic("+1/6 of a new magical talent."),
    ).toEqual({ every: 6, spheres: [] });
    expect(
      parseFavoredClassBonusMechanic("+1/6 of a social talent."),
    ).toEqual({ every: 6, spheres: [] });
  });

  it("returns null for non-talent bonuses", () => {
    expect(
      parseFavoredClassBonusMechanic("+1/6 of a bestial trait."),
    ).toBeNull();
    expect(
      parseFavoredClassBonusMechanic(
        "Deal +1/2 bonus damage to evil outsiders when using a bonded weapon.",
      ),
    ).toBeNull();
    expect(parseFavoredClassBonusMechanic("+1 hit point.")).toBeNull();
  });
});

describe("favoredClassBonusTalentsEarned", () => {
  it("floors to the number of full increments reached", () => {
    const mechanic = { every: 5, spheres: ["Life"] };
    expect(favoredClassBonusTalentsEarned(mechanic, 1)).toBe(0);
    expect(favoredClassBonusTalentsEarned(mechanic, 4)).toBe(0);
    expect(favoredClassBonusTalentsEarned(mechanic, 5)).toBe(1);
    expect(favoredClassBonusTalentsEarned(mechanic, 9)).toBe(1);
    expect(favoredClassBonusTalentsEarned(mechanic, 10)).toBe(2);
    expect(favoredClassBonusTalentsEarned(mechanic, 20)).toBe(4);
  });
});
