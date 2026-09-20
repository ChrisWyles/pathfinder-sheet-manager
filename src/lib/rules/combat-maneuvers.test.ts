import { describe, expect, it } from "vitest";

import {
  COMBAT_MANEUVERS,
  COMBAT_MANEUVERS_OVERVIEW,
  resolveManeuverFeat,
} from "./combat-maneuvers";

const EXPECTED_NAMES = [
  "Bull Rush",
  "Dirty Trick",
  "Disarm",
  "Drag",
  "Grapple",
  "Overrun",
  "Reposition",
  "Steal",
  "Sunder",
  "Trip",
  "Feint",
];

describe("COMBAT_MANEUVERS", () => {
  it("has exactly the 10 CMB maneuvers plus Feint, in order", () => {
    expect(COMBAT_MANEUVERS.map((m) => m.name)).toEqual(EXPECTED_NAMES);
  });

  it("flags every maneuver as CMB-based except Feint", () => {
    for (const m of COMBAT_MANEUVERS) {
      expect(m.isCmbBased).toBe(m.name !== "Feint");
    }
  });

  it("has non-empty rules text and a d20pfsrd source link for every entry", () => {
    for (const m of COMBAT_MANEUVERS) {
      expect(m.description.length).toBeGreaterThan(20);
      expect(m.sourceUrl).toMatch(/^https:\/\/www\.d20pfsrd\.com\/.*#TOC-/);
    }
  });

  it("never references a specific Improved/Greater feat in the base rules text", () => {
    for (const m of COMBAT_MANEUVERS) {
      expect(m.description).not.toMatch(/\b(Improved|Greater)\s+[A-Z][a-z]+/);
    }
  });

  it("has a unique, url-safe slug per maneuver", () => {
    const slugs = COMBAT_MANEUVERS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z-]+$/);
  });
});

describe("COMBAT_MANEUVERS_OVERVIEW", () => {
  it("is non-empty general CMB/CMD rules text", () => {
    expect(COMBAT_MANEUVERS_OVERVIEW.length).toBeGreaterThan(100);
    expect(COMBAT_MANEUVERS_OVERVIEW).toMatch(/CMB/);
  });
});

describe("resolveManeuverFeat", () => {
  it("returns null when the character has neither tier", () => {
    expect(resolveManeuverFeat("Trip", ["Weapon Focus"])).toBeNull();
  });

  it("resolves the improved tier and its benefit text", () => {
    const resolved = resolveManeuverFeat("Trip", ["Improved Trip"]);
    expect(resolved?.tier).toBe("improved");
    expect(resolved?.feats).toHaveLength(1);
    expect(resolved?.feats[0].name).toBe("Improved Trip");
    expect(resolved?.feats[0].benefit.length).toBeGreaterThan(10);
  });

  it("matches feat names case/whitespace-insensitively", () => {
    expect(resolveManeuverFeat("Trip", ["  improved trip  "])?.tier).toBe(
      "improved",
    );
  });

  it("prefers greater over improved, and includes both feats' text", () => {
    const resolved = resolveManeuverFeat("Bull Rush", [
      "Improved Bull Rush",
      "Greater Bull Rush",
    ]);
    expect(resolved?.tier).toBe("greater");
    expect(resolved?.feats.map((f) => f.name)).toEqual([
      "Improved Bull Rush",
      "Greater Bull Rush",
    ]);
  });

  it("includes Improved's text too even without an explicit Improved pick, since Greater requires it as a prerequisite", () => {
    const resolved = resolveManeuverFeat("Bull Rush", ["Greater Bull Rush"]);
    expect(resolved?.tier).toBe("greater");
    expect(resolved?.feats.map((f) => f.name)).toEqual([
      "Improved Bull Rush",
      "Greater Bull Rush",
    ]);
  });

  it("has no greater tier for Feint, only improved", () => {
    expect(resolveManeuverFeat("Feint", ["Greater Feint"])).toBeNull();
    expect(resolveManeuverFeat("Feint", ["Improved Feint"])?.tier).toBe(
      "improved",
    );
  });
});
