import { describe, expect, it } from "vitest";

import { allocateTalentSpend } from "./talent-spend";

describe("allocateTalentSpend", () => {
  it("spends exactly the matching bucket when there's enough of it", () => {
    // 2 magic talents: pick the Destruction sphere (1) + a blast talent (1).
    const result = allocateTalentSpend(
      ["magic", "magic"],
      { combat: 0, magic: 2, flex: 0 },
    );
    expect(result.specificUsed).toEqual({ combat: 0, magic: 2 });
    expect(result.flexUsed).toBe(0);
    expect(result.overBudget).toBe(0);
  });

  it("spends specific-type slots before flex", () => {
    const result = allocateTalentSpend(
      ["magic", "magic", "magic"],
      { combat: 0, magic: 2, flex: 3 },
    );
    expect(result.specificUsed.magic).toBe(2);
    expect(result.flexUsed).toBe(1);
    expect(result.overBudget).toBe(0);
  });

  it("keeps combat and magic overflow independent before combining into flex", () => {
    const result = allocateTalentSpend(
      ["combat", "combat", "magic", "magic"],
      { combat: 1, magic: 1, flex: 2 },
    );
    expect(result.specificUsed).toEqual({ combat: 1, magic: 1 });
    expect(result.flexUsed).toBe(2);
    expect(result.overBudget).toBe(0);
  });

  it("reports overBudget once flex is also exhausted", () => {
    const result = allocateTalentSpend(
      ["magic", "magic", "magic"],
      { combat: 0, magic: 1, flex: 1 },
    );
    expect(result.specificUsed.magic).toBe(1);
    expect(result.flexUsed).toBe(1);
    expect(result.overBudget).toBe(1);
  });

  it("handles no items and no totals", () => {
    const result = allocateTalentSpend([], { combat: 0, magic: 0, flex: 0 });
    expect(result).toEqual({
      specificUsed: { combat: 0, magic: 0 },
      flexUsed: 0,
      overBudget: 0,
    });
  });
});
