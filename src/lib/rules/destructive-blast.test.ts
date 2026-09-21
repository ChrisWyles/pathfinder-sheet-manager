import { describe, expect, it } from "vitest";

import {
  destructiveBlastBaseCost,
  destructiveBlastDamageType,
  destructiveBlastDice,
  destructiveBlastSaveDC,
  destructiveBlastSaveType,
  emptyDestructiveBlastConfig,
  parseDestructiveBlastConfig,
} from "./destructive-blast";

describe("destructiveBlastDice", () => {
  it("deals 1d6 for every odd level, unboosted", () => {
    expect(destructiveBlastDice(1, false)).toEqual({ count: 1, sides: 6 });
    expect(destructiveBlastDice(2, false)).toEqual({ count: 1, sides: 6 });
    expect(destructiveBlastDice(3, false)).toEqual({ count: 2, sides: 6 });
    expect(destructiveBlastDice(4, false)).toEqual({ count: 2, sides: 6 });
    expect(destructiveBlastDice(5, false)).toEqual({ count: 3, sides: 6 });
    expect(destructiveBlastDice(20, false)).toEqual({ count: 10, sides: 6 });
  });

  it("deals 1d6 per level when boosted, minimum 2d6", () => {
    expect(destructiveBlastDice(1, true)).toEqual({ count: 2, sides: 6 });
    expect(destructiveBlastDice(2, true)).toEqual({ count: 2, sides: 6 });
    expect(destructiveBlastDice(3, true)).toEqual({ count: 3, sides: 6 });
    expect(destructiveBlastDice(20, true)).toEqual({ count: 20, sides: 6 });
  });

  it("floors fractional levels and never goes below the minimum", () => {
    expect(destructiveBlastDice(0, false)).toEqual({ count: 1, sides: 6 });
    expect(destructiveBlastDice(-5, false)).toEqual({ count: 1, sides: 6 });
    expect(destructiveBlastDice(0, true)).toEqual({ count: 2, sides: 6 });
  });
});

describe("destructiveBlastDamageType", () => {
  it("is bludgeoning with no blast type talent chosen", () => {
    expect(destructiveBlastDamageType(null)).toBe("bludgeoning");
  });

  it("reads the tagged damage type off a blast type talent", () => {
    expect(
      destructiveBlastDamageType({ talentTypes: ["blast type", "fire"] }),
    ).toBe("fire");
    expect(
      destructiveBlastDamageType({ talentTypes: ["blast type", "cold"] }),
    ).toBe("cold");
  });

  it("skips an 'advanced' tag to find the actual damage type", () => {
    expect(
      destructiveBlastDamageType({
        talentTypes: ["blast type", "fire", "light", "advanced"],
      }),
    ).toBe("fire");
  });

  it("falls back to bludgeoning for a malformed/untagged talent", () => {
    expect(destructiveBlastDamageType({ talentTypes: [] })).toBe("bludgeoning");
    expect(
      destructiveBlastDamageType({ talentTypes: ["blast type"] }),
    ).toBe("bludgeoning");
  });
});

describe("destructiveBlastBaseCost", () => {
  it("is 0 at baseline, 1 when boosted", () => {
    expect(destructiveBlastBaseCost(false)).toBe(0);
    expect(destructiveBlastBaseCost(true)).toBe(1);
  });
});

describe("destructiveBlastSaveType", () => {
  it("is null for no shape chosen or an attack-roll shape", () => {
    expect(destructiveBlastSaveType(null)).toBeNull();
    expect(destructiveBlastSaveType("Chain Blast")).toBeNull();
    expect(destructiveBlastSaveType("Guided Strike")).toBeNull();
  });

  it("returns the save type for a known save-based shape, case/whitespace-insensitively", () => {
    expect(destructiveBlastSaveType("Sculpt Blast")).toBe("REFLEX");
    expect(destructiveBlastSaveType("  sculpt blast  ")).toBe("REFLEX");
    expect(destructiveBlastSaveType("Energy Sphere")).toBe("REFLEX");
    expect(destructiveBlastSaveType("Explosive Orb")).toBe("REFLEX");
  });
});

describe("destructiveBlastSaveDC", () => {
  it("is 10 + half caster level + casting ability modifier", () => {
    expect(destructiveBlastSaveDC(1, 3)).toBe(10 + 0 + 3);
    expect(destructiveBlastSaveDC(4, 3)).toBe(10 + 2 + 3);
    expect(destructiveBlastSaveDC(5, 3)).toBe(10 + 2 + 3);
    expect(destructiveBlastSaveDC(10, -1)).toBe(10 + 5 - 1);
  });

  it("treats level below 1 as level 1", () => {
    expect(destructiveBlastSaveDC(0, 2)).toBe(destructiveBlastSaveDC(1, 2));
  });
});

describe("parseDestructiveBlastConfig", () => {
  it("returns an empty config for null/malformed input", () => {
    expect(parseDestructiveBlastConfig(null)).toEqual(emptyDestructiveBlastConfig());
    expect(parseDestructiveBlastConfig("nope")).toEqual(
      emptyDestructiveBlastConfig(),
    );
    expect(parseDestructiveBlastConfig({})).toEqual(emptyDestructiveBlastConfig());
  });

  it("round-trips a well-formed config", () => {
    const config = {
      blastShapeTalentId: "shape1",
      blastTypeTalentId: "type1",
      boosted: true,
    };
    expect(parseDestructiveBlastConfig(config)).toEqual(config);
  });
});
