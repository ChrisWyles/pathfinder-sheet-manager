import type { AbilityKey, DerivedStats } from "@/lib/rules/types";

import { rollNotation, signed, type RollOutcome } from "./roller";

export type RollKind =
  | "ATTACK"
  | "DAMAGE"
  | "SAVE"
  | "SKILL"
  | "ABILITY_CHECK"
  | "INITIATIVE"
  | "CONCENTRATION"
  | "CUSTOM";

export interface RollModifier {
  source: string;
  value: number;
}

export interface RollRequest {
  kind: RollKind;
  label: string;
  /** Base dice; defaults to a single d20. */
  dice?: string;
  modifiers?: RollModifier[];
}

export interface RollResult extends RollOutcome {
  kind: RollKind;
  label: string;
  expression: string;
  modifiers: RollModifier[];
}

export function buildExpression(request: RollRequest): string {
  const dice = request.dice?.trim() || "1d20";
  const mods = (request.modifiers ?? []).reduce((s, m) => s + m.value, 0);
  return `${dice}${signed(mods)}`;
}

export function executeRoll(request: RollRequest): RollResult {
  const expression = buildExpression(request);
  const outcome = rollNotation(expression);
  return {
    ...outcome,
    kind: request.kind,
    label: request.label,
    expression,
    modifiers: request.modifiers ?? [],
  };
}

// --- Builders keyed off computed derived stats -----------------------------

const ABILITY_LABEL: Record<AbilityKey, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

export function attackRollRequest(
  derived: DerivedStats,
  opts: {
    which: "melee" | "ranged";
    weaponName: string;
    weaponBonus?: number;
    situational?: RollModifier[];
  },
): RollRequest {
  const base =
    opts.which === "melee" ? derived.meleeAttack : derived.rangedAttack;
  return {
    kind: "ATTACK",
    label: `${opts.weaponName} attack`,
    modifiers: [
      {
        source: `${opts.which === "melee" ? "Melee" : "Ranged"} attack`,
        value: base,
      },
      ...(opts.weaponBonus
        ? [{ source: "Weapon", value: opts.weaponBonus }]
        : []),
      ...(opts.situational ?? []),
    ],
  };
}

export function saveRollRequest(
  derived: DerivedStats,
  save: "fort" | "ref" | "will",
  situational: RollModifier[] = [],
): RollRequest {
  const label = { fort: "Fortitude", ref: "Reflex", will: "Will" }[save];
  return {
    kind: "SAVE",
    label: `${label} save`,
    modifiers: [{ source: label, value: derived.saves[save] }, ...situational],
  };
}

export function abilityCheckRequest(
  derived: DerivedStats,
  ability: AbilityKey,
  situational: RollModifier[] = [],
): RollRequest {
  return {
    kind: "ABILITY_CHECK",
    label: `${ABILITY_LABEL[ability]} check`,
    modifiers: [
      { source: `${ability} modifier`, value: derived.abilityMods[ability] },
      ...situational,
    ],
  };
}

export function initiativeRequest(
  derived: DerivedStats,
  situational: RollModifier[] = [],
): RollRequest {
  return {
    kind: "INITIATIVE",
    label: "Initiative",
    modifiers: [
      { source: "Initiative", value: derived.initiative },
      ...situational,
    ],
  };
}

export function skillRollRequest(
  skillName: string,
  total: number,
  situational: RollModifier[] = [],
): RollRequest {
  return {
    kind: "SKILL",
    label: `${skillName} check`,
    modifiers: [{ source: skillName, value: total }, ...situational],
  };
}
