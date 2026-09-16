import { describe, expect, it } from "vitest";

import {
  CORE_RACES,
  isHumanRace,
  RACE_SIZES,
  raceMatchesFacets,
  type RaceFacetFilter,
  type RacePreset,
} from "./races";
import { ABILITIES, type AbilityKey, type CreatureSizeKey } from "./types";

function filter(f: Partial<RaceFacetFilter>): RaceFacetFilter {
  return { bonus: [], malus: [], sizes: [], ...f };
}

describe("CORE_RACES", () => {
  it("has unique names and a Human entry", () => {
    const names = CORE_RACES.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("Human");
  });

  it("keeps every ability adjustment within ±4 and on a real ability", () => {
    for (const race of CORE_RACES) {
      for (const [key, delta] of Object.entries(race.abilityAdjustments)) {
        expect(ABILITIES).toContain(key);
        expect(Math.abs(delta)).toBeLessThanOrEqual(4);
      }
      expect(race.description.length).toBeGreaterThan(10);
      expect(race.speed).toBeGreaterThan(0);
    }
  });

  it("gives every race at least one trait to display", () => {
    for (const race of CORE_RACES) {
      expect(race.traits.length).toBeGreaterThan(0);
    }
  });

  it("marks the flexible-bonus races as a player choice with no fixed adjustment", () => {
    const choiceRaces = CORE_RACES.filter((r) => r.hasChoiceAdjustment);
    expect(choiceRaces.map((r) => r.name).sort()).toEqual([
      "Half-Elf",
      "Half-Orc",
      "Human",
    ]);
    for (const race of choiceRaces) {
      expect(race.abilityAdjustments).toEqual({});
    }
  });

  it("recognises only Human for the human skill/feat bonus", () => {
    expect(isHumanRace("Human")).toBe(true);
    expect(isHumanRace("human")).toBe(true);
    expect(isHumanRace("Half-Elf")).toBe(false);
  });
});

describe("RACE_SIZES", () => {
  it("only lists sizes a curated race actually has", () => {
    for (const size of RACE_SIZES) {
      expect(CORE_RACES.some((r) => r.size === size)).toBe(true);
    }
  });
});

describe("raceMatchesFacets", () => {
  const elf: RacePreset = {
    name: "Elf",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: { DEX: 2, INT: 2, CON: -2 },
    description: "",
    traits: [],
  };
  const human: RacePreset = {
    name: "Human",
    size: "MEDIUM",
    speed: 30,
    abilityAdjustments: {},
    description: "",
    traits: [],
  };
  const halfling: RacePreset = {
    name: "Halfling",
    size: "SMALL",
    speed: 20,
    abilityAdjustments: { DEX: 2, CHA: 2, STR: -2 },
    description: "",
    traits: [],
  };
  it("passes everything when no facet is set", () => {
    expect(raceMatchesFacets(elf, filter({}))).toBe(true);
    expect(raceMatchesFacets(human, filter({}))).toBe(true);
  });

  it("ORs checked boxes within one facet", () => {
    // DEX-or-CHA bonus: both Elf (DEX) and Halfling (DEX+CHA) match
    const bonus: AbilityKey[] = ["DEX", "CHA"];
    expect(raceMatchesFacets(elf, filter({ bonus }))).toBe(true);
    expect(raceMatchesFacets(halfling, filter({ bonus }))).toBe(true);
  });

  it("ANDs across facets", () => {
    // Bonus DEX AND Malus STR: Halfling matches, Elf does not (no STR malus)
    const f = filter({ bonus: ["DEX"], malus: ["STR"] });
    expect(raceMatchesFacets(halfling, f)).toBe(true);
    expect(raceMatchesFacets(elf, f)).toBe(false);
  });

  it("never matches a flexible-bonus race against a non-empty bonus/malus facet", () => {
    expect(raceMatchesFacets(human, filter({ bonus: ["STR"] }))).toBe(false);
    expect(raceMatchesFacets(human, filter({ malus: ["STR"] }))).toBe(false);
  });

  it("filters by size", () => {
    const sizes: CreatureSizeKey[] = ["SMALL"];
    expect(raceMatchesFacets(halfling, filter({ sizes }))).toBe(true);
    expect(raceMatchesFacets(elf, filter({ sizes }))).toBe(false);
  });
});
