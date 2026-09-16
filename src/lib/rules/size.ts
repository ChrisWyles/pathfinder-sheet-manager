import type { CreatureSizeKey } from "./types";

/** Size modifier to AC and attack rolls. */
const SIZE_AC_ATTACK: Record<CreatureSizeKey, number> = {
  FINE: 8,
  DIMINUTIVE: 4,
  TINY: 2,
  SMALL: 1,
  MEDIUM: 0,
  LARGE: -1,
  HUGE: -2,
  GARGANTUAN: -4,
  COLOSSAL: -8,
};

export function sizeAcAttackModifier(size: CreatureSizeKey): number {
  return SIZE_AC_ATTACK[size];
}

/** Special size modifier to CMB and CMD (the inverse of the AC/attack mod). */
export function specialSizeModifier(size: CreatureSizeKey): number {
  return -SIZE_AC_ATTACK[size];
}

/** Size modifier to Stealth checks. */
const SIZE_STEALTH: Record<CreatureSizeKey, number> = {
  FINE: 16,
  DIMINUTIVE: 12,
  TINY: 8,
  SMALL: 4,
  MEDIUM: 0,
  LARGE: -4,
  HUGE: -8,
  GARGANTUAN: -12,
  COLOSSAL: -16,
};

export function sizeStealthModifier(size: CreatureSizeKey): number {
  return SIZE_STEALTH[size];
}

/** Size modifier to Fly checks (half the Stealth table, same direction). */
const SIZE_FLY: Record<CreatureSizeKey, number> = {
  FINE: 8,
  DIMINUTIVE: 6,
  TINY: 4,
  SMALL: 2,
  MEDIUM: 0,
  LARGE: -2,
  HUGE: -4,
  GARGANTUAN: -6,
  COLOSSAL: -8,
};

export function sizeFlyModifier(size: CreatureSizeKey): number {
  return SIZE_FLY[size];
}

/** Size modifier for whichever skill this is — only Stealth and Fly have one. */
export function sizeSkillModifier(
  skillName: string,
  size: CreatureSizeKey,
): number {
  switch (skillName.trim().toLowerCase()) {
    case "stealth":
      return sizeStealthModifier(size);
    case "fly":
      return sizeFlyModifier(size);
    default:
      return 0;
  }
}
