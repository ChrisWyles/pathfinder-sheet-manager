/**
 * Registry of sphere-granted base abilities — the free, automatic ability
 * a sphere gives the moment it's taken (as opposed to its optional
 * talents). Adding the next sphere to the "one sphere at a time" framework
 * means adding an entry here (used by `createCharacter` to auto-grant the
 * CharacterAction) plus a dedicated renderer wired into ActionRow (matched
 * on `sphereName`, since each ability's mechanics differ too much to
 * generalize further).
 */
import type { RangeKind } from "./sphere-range";

export interface SphereGrantedAbility {
  sphereName: string;
  actionName: string;
  description: string;
  /** The ability's range *kind* rather than a pre-formatted string — the
   * actual distance scales with caster level (see sphere-range.ts) and is
   * computed at render time, not stored. */
  rangeKind: RangeKind;
}

export const SPHERE_GRANTED_ABILITIES: SphereGrantedAbility[] = [
  {
    sphereName: "Destruction",
    actionName: "Destructive Blast",
    description:
      "As a standard action, deliver a burst of magical force as a melee touch attack or a ranged touch attack within close range. Deals 1d6 bludgeoning damage per odd caster level (minimum 1d6); spend 1 spell point to instead deal 1d6 per caster level (minimum 2d6). A single blast may apply at most one blast type talent and one blast shape talent.",
    rangeKind: "CLOSE",
  },
];

export function sphereGrantedAbility(
  sphereName: string,
): SphereGrantedAbility | undefined {
  return SPHERE_GRANTED_ABILITIES.find(
    (a) => a.sphereName.toLowerCase() === sphereName.trim().toLowerCase(),
  );
}
