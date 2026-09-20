import { abilityModifier } from "./abilities";
import { sizeSkillModifier } from "./size";
import type { AbilityKey, AbilityScores, CreatureSizeKey } from "./types";

export interface CharacterSkillRankLike {
  ranks: number;
  isClassSkill: boolean;
  miscMod: number;
  skill: { name: string; keyAbility: AbilityKey; armorCheckPenalty: boolean };
}

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

/** Finds a character's total for a named skill (e.g. "Bluff" for Feint),
 * falling back to 0 ranks/untrained/not-a-class-skill on the given key
 * ability when the character has no rank row for it at all — every skill
 * usable untrained still has a valid total from its ability mod alone. */
export function findSkillTotal(
  skillName: string,
  fallbackKeyAbility: AbilityKey,
  skillRanks: CharacterSkillRankLike[],
  ctx: SkillContext,
): number {
  const row = skillRanks.find(
    (r) => r.skill.name.toLowerCase() === skillName.toLowerCase(),
  );
  const input: SkillInput = row
    ? {
        name: row.skill.name,
        keyAbility: row.skill.keyAbility,
        ranks: row.ranks,
        isClassSkill: row.isClassSkill,
        miscMod: row.miscMod,
        usesArmorCheckPenalty: row.skill.armorCheckPenalty,
      }
    : { name: skillName, keyAbility: fallbackKeyAbility, ranks: 0, isClassSkill: false };
  return computeSkillTotal(input, ctx);
}
