/**
 * Which class-feature rows of the seeded Pathfinder 1e core classes represent a
 * player *choice* at creation, and at which levels. The seed's `ClassFeature`
 * rows carry no `data.isChoice` flag (unlike the scraped Spheres classes), so
 * `buildStepPlan` reads this table to give PF1e classes a guided flow too.
 */

import type { StepKind, StepTab } from "./creation";

export interface Pf1eChoiceMeta {
  /** Matched against `ClassFeature.name` (case-insensitive, prefix-friendly). */
  featureName: string;
  kind: StepKind;
  tab?: StepTab;
  /** Levels a pick happens at; omit to use the matched feature's own level. */
  levels?: number[];
  /** Selections per level (default 1). */
  count?: number;
  prompt?: string;
}

export const PF1E_CLASS_CHOICES: Record<string, Pf1eChoiceMeta[]> = {
  Fighter: [
    {
      featureName: "Bonus Feat",
      kind: "pick-feat",
      tab: "feats",
      levels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
      prompt: "Choose a combat feat (Fighter bonus feat).",
    },
  ],
  Rogue: [
    {
      featureName: "Rogue Talent",
      kind: "pick-option",
      tab: "class-features",
      levels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
      prompt: "Choose a rogue talent.",
    },
  ],
  Wizard: [
    {
      featureName: "Arcane School",
      kind: "pick-option",
      tab: "class-features",
      levels: [1],
      prompt: "Choose an arcane school, or be a universalist.",
    },
    {
      featureName: "Arcane Bond",
      kind: "pick-option",
      tab: "class-features",
      levels: [1],
      prompt: "Choose a bonded object or a familiar.",
    },
    {
      featureName: "Bonus Feat",
      kind: "pick-feat",
      tab: "feats",
      levels: [5, 10, 15, 20],
      prompt: "Choose an item creation or metamagic feat (Wizard bonus feat).",
    },
  ],
  Cleric: [
    {
      featureName: "Domains",
      kind: "pick-option",
      tab: "class-features",
      levels: [1],
      count: 2,
      prompt: "Choose two domains granted by your deity.",
    },
  ],
  Ranger: [
    {
      featureName: "Favored Enemy",
      kind: "pick-option",
      tab: "class-features",
      levels: [1, 5, 10, 15, 20],
      prompt: "Choose a favored enemy.",
    },
    {
      featureName: "Favored Terrain",
      kind: "pick-option",
      tab: "class-features",
      levels: [3, 8, 13, 18],
      prompt: "Choose a favored terrain.",
    },
    {
      featureName: "Combat Style",
      kind: "pick-option",
      tab: "class-features",
      levels: [2],
      prompt: "Choose a combat style: archery or two-weapon combat.",
    },
    {
      featureName: "Hunter's Bond",
      kind: "pick-option",
      tab: "class-features",
      levels: [4],
      prompt: "Choose an animal companion or a bond with your companions.",
    },
  ],
};
