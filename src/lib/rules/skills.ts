import { abilityModifier } from "./abilities";
import { sizeSkillModifier } from "./size";
import type { AbilityKey, AbilityScores, CreatureSizeKey } from "./types";

export interface SkillInput {
  /** Needed to look up the handful of skills with a size modifier (Stealth, Fly). */
  name: string;
  keyAbility: AbilityKey;
  ranks: number;
  isClassSkill: boolean;
  miscMod?: number;
  /** Whether this skill is affected by armor check penalty. */
  usesArmorCheckPenalty?: boolean;
}

export interface SkillContext {
  abilityScores: AbilityScores;
  armorCheckPenalty: number;
  /** Defaults to no size modifier (as Medium) when omitted. */
  size?: CreatureSizeKey;
}

/**
 * Total skill bonus:
 *   ranks + (class skill with >=1 rank ? +3) + ability mod + size (Stealth/Fly
 *   only) + misc - ACP.
 */
export function computeSkillTotal(
  skill: SkillInput,
  ctx: SkillContext,
): number {
  const ranks = Math.max(0, skill.ranks);
  const classSkillBonus = skill.isClassSkill && ranks > 0 ? 3 : 0;
  const abilityMod = abilityModifier(ctx.abilityScores[skill.keyAbility]);
  const sizeMod = ctx.size ? sizeSkillModifier(skill.name, ctx.size) : 0;
  const acp = skill.usesArmorCheckPenalty ? ctx.armorCheckPenalty : 0;
  return (
    ranks + classSkillBonus + abilityMod + sizeMod + (skill.miscMod ?? 0) - acp
  );
}
