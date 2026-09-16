import { describe, expect, it } from "vitest";

import {
  buildStepPlan,
  casterTier,
  classifyTalentColumnName,
  parseTalentColumnValue,
  type SphereClassData,
} from "./class-creation-steps";

const incanterData: SphereClassData = {
  slug: "incanter",
  group: "spherecaster",
  talentColumns: ["Caster Level", "Magic Talents"],
  advancement: [
    { level: 1, columns: { "Caster Level": "+1", "Magic Talents": "1 (+2)" } },
    { level: 3, columns: { "Caster Level": "+3", "Magic Talents": "3" } },
    { level: 5, columns: { "Caster Level": "+5", "Magic Talents": "5" } },
  ],
  choicesByLevel: [
    { level: 1, choices: ["Bonus feat", "bonus talent", "specializations"] },
    { level: 2, choices: ["Bonus feat"] },
    { level: 3, choices: ["Bonus talent"] },
    {
      level: 4,
      choices: ["Bonus feat", "ability score increase (+1, core PF1e)"],
    },
    { level: 5, choices: ["Bonus talent"] },
  ],
};

const strikerData: SphereClassData = {
  slug: "striker",
  group: "practitioner",
  talentColumns: ["Combat Talents"],
  advancement: [
    { level: 1, columns: { "Combat Talents": "1" } },
    { level: 2, columns: { "Combat Talents": "2" } },
    { level: 3, columns: { "Combat Talents": "3" } },
  ],
  choicesByLevel: [
    { level: 1, choices: ["martial tradition", "combat talent"] },
    { level: 2, choices: ["Combat talent"] },
    { level: 3, choices: ["Combat talent"] },
  ],
};

describe("buildStepPlan — Spheres spherecaster (Incanter, L5)", () => {
  const plan = buildStepPlan({
    className: "Incanter",
    classSlug: "incanter",
    system: "SPHERES_OF_POWER",
    group: "spherecaster",
    level: 5,
    classData: incanterData,
    features: [
      { name: "Incanter Specializations", level: 1, isChoice: true },
      { name: "Casting", level: 1, isChoice: true },
    ],
  });

  it("never emits a step above the chosen level", () => {
    expect(plan.every((s) => s.classLevel <= 5)).toBe(true);
  });

  it("has unique ids", () => {
    const ids = plan.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds the spherecaster casting-tradition step at level 1", () => {
    const t = plan.filter((s) => s.title === "Casting tradition");
    expect(t).toHaveLength(1);
    expect(t[0].classLevel).toBe(1);
  });

  it("emits the ability score increase at level 4 (from the core rule, once)", () => {
    const boosts = plan.filter((s) => s.kind === "ability-boost");
    expect(boosts.map((s) => s.classLevel)).toEqual([4]);
  });

  it("emits general feats at odd levels plus bonus-feat picks from the table", () => {
    const feats = plan.filter((s) => s.kind === "pick-feat");
    // general feats at 1,3,5 + bonus feat tokens at 1,2,4
    expect(feats.filter((s) => s.title === "Feat").map((s) => s.classLevel)).toEqual([
      1, 3, 5,
    ]);
    expect(
      feats.filter((s) => s.title === "Bonus feat").map((s) => s.classLevel),
    ).toEqual([1, 2, 4]);
  });

  it("routes talent picks to the Spheres tab", () => {
    const talents = plan.filter((s) => s.kind === "pick-talent");
    expect(talents.length).toBeGreaterThan(0);
    expect(talents.every((s) => s.tab === "spheres")).toBe(true);
  });

  it("surfaces the Incanter specialization choice once, with the registry label", () => {
    const specs = plan.filter(
      (s) => s.title === "Incanter specialization" && s.classLevel === 1,
    );
    expect(specs).toHaveLength(1);
    // the raw "specializations" token is suppressed by the registry
    expect(plan.some((s) => s.title === "Class specialization")).toBe(false);
  });

  it("does not turn the plain 'Casting' feature into a step", () => {
    expect(plan.some((s) => s.title.toLowerCase() === "casting")).toBe(false);
  });
});

describe("buildStepPlan — generic spherecaster token classification", () => {
  it("turns a bare 'specializations' token into a class-specialization option", () => {
    const plan = buildStepPlan({
      className: "Testcaster",
      classSlug: "testcaster",
      system: "SPHERES_OF_POWER",
      group: "spherecaster",
      level: 2,
      classData: {
        slug: "testcaster",
        group: "spherecaster",
        talentColumns: ["Magic Talents"],
        advancement: [{ level: 1, columns: { "Magic Talents": "1" } }],
        choicesByLevel: [{ level: 1, choices: ["specializations"] }],
      },
    });
    expect(
      plan.some(
        (s) => s.title === "Class specialization" && s.classLevel === 1,
      ),
    ).toBe(true);
  });
});

describe("buildStepPlan — PF1e Fighter (L4)", () => {
  const plan = buildStepPlan({
    className: "Fighter",
    classSlug: "fighter",
    system: "PATHFINDER_1E",
    level: 4,
    features: [
      { name: "Bonus Feat", level: 1 },
      { name: "Bravery", level: 2 },
      { name: "Armor Training", level: 3 },
    ],
  });

  it("has the ability boost at level 4", () => {
    expect(
      plan.some((s) => s.kind === "ability-boost" && s.classLevel === 4),
    ).toBe(true);
  });

  it("has general feats at levels 1 and 3", () => {
    expect(
      plan
        .filter((s) => s.kind === "pick-feat" && s.title === "Feat")
        .map((s) => s.classLevel),
    ).toEqual([1, 3]);
  });

  it("adds Fighter bonus feats at 1, 2 and 4 and applies the registry annotation", () => {
    const bonus = plan.filter(
      (s) => s.featureName === "Bonus Feat" && s.title === "Bonus Feat",
    );
    expect(bonus.map((s) => s.classLevel)).toEqual([1, 2, 4]);
    expect(bonus[0].prompt).toMatch(/Fighter bonus feat/i);
  });
});

describe("buildStepPlan — isHuman adds the bonus feat at 1st level", () => {
  it("has no human bonus feat step by default", () => {
    const plan = buildStepPlan({
      className: "Fighter",
      classSlug: "fighter",
      system: "PATHFINDER_1E",
      level: 1,
    });
    expect(plan.some((s) => s.title === "Human bonus feat")).toBe(false);
  });

  it("adds exactly one Human bonus feat step at level 1 when isHuman is true", () => {
    const plan = buildStepPlan({
      className: "Fighter",
      classSlug: "fighter",
      system: "PATHFINDER_1E",
      level: 5,
      isHuman: true,
    });
    const human = plan.filter((s) => s.title === "Human bonus feat");
    expect(human).toHaveLength(1);
    expect(human[0].classLevel).toBe(1);
    expect(human[0].kind).toBe("pick-feat");
  });
});

describe("buildStepPlan — Spheres practitioner (Striker, L3)", () => {
  const plan = buildStepPlan({
    className: "Striker",
    classSlug: "striker",
    system: "SPHERES_OF_POWER",
    group: "practitioner",
    level: 3,
    classData: strikerData,
  });

  it("has a single martial-tradition step at level 1", () => {
    const t = plan.filter((s) => s.title === "Martial tradition");
    expect(t).toHaveLength(1);
    expect(t[0].classLevel).toBe(1);
  });

  it("emits combat-talent picks on the Spheres tab", () => {
    const talents = plan.filter((s) => s.kind === "pick-talent");
    expect(talents.length).toBeGreaterThan(0);
    expect(talents.every((s) => s.tab === "spheres")).toBe(true);
  });
});

function withCasterLevel(atLevel20: string | null): SphereClassData {
  const advancement = [{ level: 1, columns: {} }];
  if (atLevel20 !== null) {
    advancement.push({ level: 20, columns: { "Caster Level": atLevel20 } });
  } else {
    advancement.push({ level: 20, columns: {} });
  }
  return { advancement };
}

describe("classifyTalentColumnName", () => {
  it("recognizes magic, combat, and combined columns", () => {
    expect(classifyTalentColumnName("Magic Talents")).toBe("magic");
    expect(classifyTalentColumnName("Combat Talents")).toBe("combat");
    expect(classifyTalentColumnName("Combat & Magic Talents")).toBe("combined");
    expect(classifyTalentColumnName("Blended Training Talents")).toBe("combined");
    expect(classifyTalentColumnName("Talents")).toBe("magic");
  });

  it("ignores unrelated columns", () => {
    expect(classifyTalentColumnName("Caster Level")).toBeNull();
    expect(classifyTalentColumnName("Any")).toBeNull();
    expect(classifyTalentColumnName("Utility")).toBeNull();
  });
});

describe("parseTalentColumnValue", () => {
  it("splits the running total from a starting bonus", () => {
    expect(parseTalentColumnValue("0 (+2)")).toEqual({ base: 0, bonus: 2 });
    expect(parseTalentColumnValue("1 (+2 magic)")).toEqual({ base: 1, bonus: 2 });
    expect(parseTalentColumnValue("3")).toEqual({ base: 3, bonus: 0 });
    expect(parseTalentColumnValue(undefined)).toEqual({ base: 0, bonus: 0 });
  });
});

describe("buildStepPlan — talent-column totals (the 2 free starting magic talents)", () => {
  it("Incanter (magic column 'Magic Talents': '1 (+2)') gets 3 magic talents at level 1", () => {
    const plan = buildStepPlan({
      className: "Incanter",
      classSlug: "incanter",
      system: "SPHERES_OF_POWER",
      group: "spherecaster",
      level: 1,
      classData: incanterData,
    });
    const magic = plan.filter(
      (s) => s.kind === "pick-talent" && s.title === "Magic talents",
    );
    expect(magic).toHaveLength(1);
    expect(magic[0].count).toBe(3);
    expect(magic[0].classLevel).toBe(1);
  });

  it("Striker (pure 'Combat Talents': '1') gets 1 combat talent at level 1, no magic step", () => {
    const plan = buildStepPlan({
      className: "Striker",
      classSlug: "striker",
      system: "SPHERES_OF_POWER",
      group: "practitioner",
      level: 1,
      classData: strikerData,
    });
    const combat = plan.filter(
      (s) => s.kind === "pick-talent" && s.title === "Combat talents",
    );
    expect(combat).toHaveLength(1);
    expect(combat[0].count).toBe(1);
    expect(plan.some((s) => s.title === "Magic talents")).toBe(false);
  });

  it("a combined 'Combat & Magic Talents' column splits into a combined pool plus a magic-only bonus step", () => {
    const plan = buildStepPlan({
      className: "Necros",
      classSlug: "necros",
      system: "SPHERES_OF_POWER",
      group: "champion",
      level: 1,
      classData: {
        slug: "necros",
        group: "champion",
        talentColumns: ["Combat & Magic Talents", "Caster Level"],
        advancement: [
          {
            level: 1,
            columns: {
              "Caster Level": "+0 (1)",
              "Combat & Magic Talents": "1 (+2 magic)",
            },
          },
        ],
      },
    });
    const combined = plan.filter((s) => s.title === "Combat or magic talents");
    const magic = plan.filter((s) => s.title === "Magic talents");
    expect(combined).toHaveLength(1);
    expect(combined[0].count).toBe(1);
    expect(magic).toHaveLength(1);
    expect(magic[0].count).toBe(2);
  });

  it("recomputes the total fresh at a higher level rather than accumulating per level", () => {
    const plan = buildStepPlan({
      className: "Incanter",
      classSlug: "incanter",
      system: "SPHERES_OF_POWER",
      group: "spherecaster",
      level: 5,
      classData: incanterData,
    });
    // Level 5's row already reads "5" (a running total that itself includes
    // the level-1 bonus in the class's real published tables) — this test
    // fixture's level-5 row is "5" with no separate bonus annotation, so the
    // step should read the row's own value as-is.
    const magic = plan.filter(
      (s) => s.kind === "pick-talent" && s.title === "Magic talents",
    );
    expect(magic).toHaveLength(1);
    expect(magic[0].count).toBe(5);
  });
});

describe("casterTier", () => {
  it("reads FULL from a class whose caster level equals class level (Incanter-style: +20)", () => {
    expect(casterTier(withCasterLevel("+20"))).toBe("FULL");
  });

  it("reads THREE_QUARTER from a 15-at-20 progression (Elementalist-style)", () => {
    expect(casterTier(withCasterLevel("+15"))).toBe("THREE_QUARTER");
  });

  it("reads HALF from a 10-at-20 progression (Mageknight/Reaper-style)", () => {
    expect(casterTier(withCasterLevel("+10"))).toBe("HALF");
  });

  it("reads OTHER from an unusual progression (Magemage-style: +5)", () => {
    expect(casterTier(withCasterLevel("+5"))).toBe("OTHER");
  });

  it("reads NONE when there is no Caster Level column at all (Striker-style)", () => {
    expect(casterTier(withCasterLevel(null))).toBe("NONE");
  });

  it("reads NONE for a class with no advancement table", () => {
    expect(casterTier({ advancement: [] })).toBe("NONE");
    expect(casterTier(null)).toBe("NONE");
    expect(casterTier(undefined)).toBe("NONE");
  });

  it("handles an unsigned value (Prodigy-style: '15' with no '+')", () => {
    expect(casterTier(withCasterLevel("15"))).toBe("THREE_QUARTER");
  });
});
