import { describe, expect, it } from "vitest";

import {
  bonusSpellPointsFromUnspentDrawbacks,
  isRepeatable,
  parseDrawbackCost,
  parseGrants,
  parsePrerequisites,
  requiredSphereFromPrereq,
  summarizeCastingTradition,
} from "./casting-tradition";

describe("bonusSpellPointsFromUnspentDrawbacks", () => {
  it("gives 0 with no unspent drawbacks", () => {
    expect(bonusSpellPointsFromUnspentDrawbacks(0, 10)).toBe(0);
  });

  it("matches the source table's five rows across representative levels", () => {
    // 1 drawback: +1, +1 per 6 levels
    expect(bonusSpellPointsFromUnspentDrawbacks(1, 1)).toBe(1);
    expect(bonusSpellPointsFromUnspentDrawbacks(1, 6)).toBe(2);
    expect(bonusSpellPointsFromUnspentDrawbacks(1, 12)).toBe(3);

    // 2 drawbacks: +1, +1 per 3 levels
    expect(bonusSpellPointsFromUnspentDrawbacks(2, 1)).toBe(1);
    expect(bonusSpellPointsFromUnspentDrawbacks(2, 3)).toBe(2);
    expect(bonusSpellPointsFromUnspentDrawbacks(2, 9)).toBe(4);

    // 3 drawbacks: +1 per odd level (1, 3, 5, ...)
    expect(bonusSpellPointsFromUnspentDrawbacks(3, 1)).toBe(1);
    expect(bonusSpellPointsFromUnspentDrawbacks(3, 2)).toBe(1);
    expect(bonusSpellPointsFromUnspentDrawbacks(3, 3)).toBe(2);
    expect(bonusSpellPointsFromUnspentDrawbacks(3, 5)).toBe(3);

    // 4 drawbacks: +1, +1 per 1.5 levels (increases at 2,3,5,6,8,9,...)
    expect(bonusSpellPointsFromUnspentDrawbacks(4, 1)).toBe(1);
    expect(bonusSpellPointsFromUnspentDrawbacks(4, 2)).toBe(2);
    expect(bonusSpellPointsFromUnspentDrawbacks(4, 3)).toBe(3);
    expect(bonusSpellPointsFromUnspentDrawbacks(4, 4)).toBe(3);
    expect(bonusSpellPointsFromUnspentDrawbacks(4, 6)).toBe(5);

    // 5 drawbacks: +1 per level
    expect(bonusSpellPointsFromUnspentDrawbacks(5, 7)).toBe(7);
  });

  it("caps at the 5-drawback row for anything beyond 5 unspent", () => {
    expect(bonusSpellPointsFromUnspentDrawbacks(9, 7)).toBe(
      bonusSpellPointsFromUnspentDrawbacks(5, 7),
    );
  });
});

describe("summarizeCastingTradition", () => {
  it("spends 2 drawbacks per boon and grants spell points for the remainder", () => {
    // 5 drawbacks (one costs 2), 1 boon -> spent 2, unspent 4
    const s = summarizeCastingTradition({
      drawbackCosts: [1, 1, 2, 1, 1],
      boonCount: 1,
      casterLevel: 6,
    });
    expect(s.totalDrawbackCost).toBe(6);
    expect(s.boonCost).toBe(2);
    expect(s.unspent).toBe(4);
    expect(s.bonusSpellPoints).toBe(bonusSpellPointsFromUnspentDrawbacks(4, 6));
  });

  it("never goes negative when boons cost more than the drawbacks provide", () => {
    const s = summarizeCastingTradition({
      drawbackCosts: [1],
      boonCount: 2,
      casterLevel: 5,
    });
    expect(s.unspent).toBe(0);
    expect(s.bonusSpellPoints).toBe(0);
  });
});

describe("parseDrawbackCost", () => {
  it("reads the 'counts as 2 drawbacks' override", () => {
    expect(
      parseDrawbackCost(
        "This counts as 2 drawbacks when determining boons and bonus spell points.",
      ),
    ).toBe(2);
  });

  it("defaults to 1 for ordinary drawbacks", () => {
    expect(parseDrawbackCost("The presence of science interrupts your flow of magic.")).toBe(1);
  });
});

describe("isRepeatable", () => {
  it("recognises 'may take this boon multiple times'", () => {
    expect(
      isRepeatable(
        "You gain a (drawback) feat, chosen when this casting tradition is created. You may take this boon multiple times.",
      ),
    ).toBe(true);
  });

  it("recognises 'may be taken multiple times'", () => {
    expect(
      isRepeatable(
        "This boon may be taken multiple times, each time using a different environmental setting.",
      ),
    ).toBe(true);
  });

  it("is false for a normal one-shot boon", () => {
    expect(isRepeatable("You gain a +1 competence bonus to your caster level.")).toBe(false);
  });
});

describe("parsePrerequisites", () => {
  it("extracts a 'must possess the X drawback' requirement", () => {
    expect(
      parsePrerequisites(
        "You must possess the Draining Casting drawback to select this boon.",
      ),
    ).toEqual(["Requires Draining Casting (drawback)"]);
  });

  it("extracts an incompatibility phrased as 'can not take ... if you took'", () => {
    expect(
      parsePrerequisites(
        "You can not take this drawback if you took the Magical Signs drawback.",
      ),
    ).toEqual(["Incompatible with Magical Signs (drawback)"]);
  });

  it("returns nothing for text with no prerequisite language", () => {
    expect(
      parsePrerequisites("You gain a +1 competence bonus to your caster level."),
    ).toEqual([]);
  });

  it("extracts a 'must possess the X sphere' requirement", () => {
    expect(
      parsePrerequisites(
        "You must already possess the Conjuration sphere to select this boon.",
      ),
    ).toEqual(["Requires Conjuration sphere"]);
  });
});

describe("requiredSphereFromPrereq", () => {
  it("pulls the sphere name out of a 'Requires X sphere' string", () => {
    expect(requiredSphereFromPrereq("Requires Conjuration sphere")).toBe(
      "Conjuration",
    );
  });

  it("returns null for a drawback/boon prerequisite", () => {
    expect(
      requiredSphereFromPrereq("Requires Draining Casting (drawback)"),
    ).toBeNull();
  });
});

describe("parseGrants", () => {
  it("extracts a sphere grant", () => {
    expect(
      parseGrants(
        "Your magic is tied to a magical creature. You gain the Conjuration sphere (or the Extra Companion talent if you already possess the Conjuration sphere), and a companion who serves as the source of your power.",
      ),
    ).toEqual(
      expect.arrayContaining([
        { type: "sphere", name: "Conjuration" },
        { type: "talent", name: "Extra Companion" },
      ]),
    );
  });

  it("extracts the Drawback Feat boon's feat grant", () => {
    expect(
      parseGrants(
        "You gain a (drawback) feat, chosen when this casting tradition is created.",
      ),
    ).toEqual([{ type: "feat", name: "(Drawback) Feat — choose one" }]);
  });

  it("returns nothing for a purely numeric passive bonus", () => {
    expect(
      parseGrants("You gain a +1 competence bonus to your caster level."),
    ).toEqual([]);
  });
});
