import { abilityModifier } from "./abilities";
import type { AbilityKey, AbilityScores } from "./types";

export interface SkillInput {
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
}

/**
 * Total skill bonus:
 *   ranks + (class skill with >=1 rank ? +3) + ability mod + misc - ACP.
 */
export function computeSkillTotal(
  skill: SkillInput,
  ctx: SkillContext,
): number {
  const ranks = Math.max(0, skill.ranks);
  const classSkillBonus = skill.isClassSkill && ranks > 0 ? 3 : 0;
  const abilityMod = abilityModifier(ctx.abilityScores[skill.keyAbility]);
  const acp = skill.usesArmorCheckPenalty ? ctx.armorCheckPenalty : 0;
  return ranks + classSkillBonus + abilityMod + (skill.miscMod ?? 0) - acp;
}
