import { describe, expect, it } from "vitest";

import {
  emptyActionRollSlot,
  parseActionRollSlot,
  resolveDiceCount,
  resolveDiceExpression,
  type LevelLookup,
} from "./action-roll";

const levels: LevelLookup = {
  totalLevel: 7,
  classLevels: { Destroyer: 7, Fighter: 2 },
};

describe("resolveDiceCount", () => {
  it("returns the flat base count when there's no scaling", () => {
    expect(
      resolveDiceCount({ diceCount: 2, scalePerLevels: 0, scaleSource: "" }, levels),
    ).toBe(2);
  });

  it("scales with total character level when scaleSource is empty", () => {
    // "1d6 per caster level" — base 0, +1 die per 1 level.
    expect(
      resolveDiceCount({ diceCount: 0, scalePerLevels: 1, scaleSource: "" }, levels),
    ).toBe(7);
  });

  it("scales with a specific class's level when scaleSource names one", () => {
    expect(
      resolveDiceCount(
        { diceCount: 0, scalePerLevels: 1, scaleSource: "Fighter" },
        levels,
      ),
    ).toBe(2);
  });

  it("floors partial scaling steps (e.g. 1 die per 3 levels)", () => {
    expect(
      resolveDiceCount({ diceCount: 1, scalePerLevels: 3, scaleSource: "" }, levels),
    ).toBe(1 + Math.floor(7 / 3)); // 1 + 2 = 3
  });

  it("treats an unrecognized class as level 0", () => {
    expect(
      resolveDiceCount(
        { diceCount: 0, scalePerLevels: 1, scaleSource: "Wizard" },
        levels,
      ),
    ).toBe(0);
  });

  it("never returns a negative count", () => {
    expect(
      resolveDiceCount({ diceCount: -5, scalePerLevels: 0, scaleSource: "" }, levels),
    ).toBe(0);
  });
});

describe("resolveDiceExpression", () => {
  it("builds NdM notation from the resolved count", () => {
    expect(
      resolveDiceExpression(
        { diceSides: 6, diceCount: 0, scalePerLevels: 1, scaleSource: "" },
        levels,
      ),
    ).toBe("7d6");
  });

  it("is empty when diceSides is null (modifiers-only slot)", () => {
    expect(
      resolveDiceExpression(
        { diceSides: null, diceCount: 1, scalePerLevels: 0, scaleSource: "" },
        levels,
      ),
    ).toBe("");
  });

  it("is empty when the resolved count is 0", () => {
    expect(
      resolveDiceExpression(
        { diceSides: 8, diceCount: 0, scalePerLevels: 0, scaleSource: "" },
        levels,
      ),
    ).toBe("");
  });
});

describe("parseActionRollSlot", () => {
  it("returns an empty slot for null/malformed input", () => {
    expect(parseActionRollSlot(null)).toEqual(emptyActionRollSlot());
    expect(parseActionRollSlot("nope")).toEqual(emptyActionRollSlot());
    expect(parseActionRollSlot({})).toEqual(emptyActionRollSlot());
  });

  it("round-trips a well-formed slot", () => {
    const slot = {
      label: "Damage",
      diceSides: 6,
      diceCount: 0,
      scalePerLevels: 1,
      scaleSource: "Destroyer",
      modifiers: [{ label: "Enhancement", value: 1 }],
    };
    expect(parseActionRollSlot(slot)).toEqual(slot);
  });

  it("drops malformed modifier entries but keeps well-formed ones", () => {
    const parsed = parseActionRollSlot({
      modifiers: [
        { label: "Good", value: 2 },
        { label: "Bad" },
        "not an object",
        null,
      ],
    });
    expect(parsed.modifiers).toEqual([{ label: "Good", value: 2 }]);
  });
});
