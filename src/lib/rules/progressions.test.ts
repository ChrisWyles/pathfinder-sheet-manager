import { describe, expect, it } from "vitest";

import {
  attackSequenceFromBab,
  babForClass,
  saveForClass,
  totalBab,
  totalBaseSaves,
} from "./progressions";
import type { ClassProgression } from "./types";

describe("babForClass", () => {
  it("full progression equals level", () => {
    expect(babForClass("FULL", 1)).toBe(1);
    expect(babForClass("FULL", 20)).toBe(20);
  });
  it("three-quarter progression", () => {
    expect(babForClass("THREE_QUARTER", 1)).toBe(0);
    expect(babForClass("THREE_QUARTER", 4)).toBe(3);
    expect(babForClass("THREE_QUARTER", 20)).toBe(15);
  });
  it("half progression", () => {
    expect(babForClass("HALF", 1)).toBe(0);
    expect(babForClass("HALF", 2)).toBe(1);
    expect(babForClass("HALF", 20)).toBe(10);
  });
});

describe("saveForClass", () => {
  it("good save", () => {
    expect(saveForClass("GOOD", 1)).toBe(2);
    expect(saveForClass("GOOD", 2)).toBe(3);
    expect(saveForClass("GOOD", 20)).toBe(12);
  });
  it("poor save", () => {
    expect(saveForClass("POOR", 1)).toBe(0);
    expect(saveForClass("POOR", 3)).toBe(1);
    expect(saveForClass("POOR", 20)).toBe(6);
  });
});

describe("multiclass totals", () => {
  const fighter5: ClassProgression = {
    levels: 5,
    babProgression: "FULL",
    fortProgression: "GOOD",
    refProgression: "POOR",
    willProgression: "POOR",
  };
  const rogue3: ClassProgression = {
    levels: 3,
    babProgression: "THREE_QUARTER",
    fortProgression: "POOR",
    refProgression: "GOOD",
    willProgression: "POOR",
  };

  it("sums BAB across classes", () => {
    expect(totalBab([fighter5, rogue3])).toBe(5 + 2);
  });

  it("sums base saves across classes", () => {
    expect(totalBaseSaves([fighter5, rogue3])).toEqual({
      fort: 4 + 1,
      ref: 1 + 3,
      will: 1 + 1,
    });
  });
});

describe("attackSequenceFromBab", () => {
  it("single attack below BAB 6", () => {
    expect(attackSequenceFromBab(5)).toEqual([5]);
  });
  it("two attacks at BAB 6", () => {
    expect(attackSequenceFromBab(6)).toEqual([6, 1]);
  });
  it("four attacks at BAB 20", () => {
    expect(attackSequenceFromBab(20)).toEqual([20, 15, 10, 5]);
  });
});
