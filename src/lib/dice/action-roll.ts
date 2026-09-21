export interface ActionRollModifier {
  label: string;
  value: number;
}

/** One roll slot on a custom CharacterAction, stored as JSON on
 * CharacterAction.roll1/roll2. `diceSides: null` means "no dice, modifiers
 * only" (e.g. a flat bonus). `scalePerLevels: 0` means the dice count
 * never scales; otherwise the slot gains one extra die every N levels of
 * `scaleSource` ("" = total character level, else a CharacterClass.name —
 * there's no per-sphere caster level tracked separately, so "1d6 per
 * Destruction caster level" is modeled as scaling with that character's
 * spellcasting class). */
export interface ActionRollSlot {
  label: string;
  diceSides: number | null;
  diceCount: number;
  scalePerLevels: number;
  scaleSource: string;
  modifiers: ActionRollModifier[];
}

/** Parses a CharacterAction.roll1/roll2 JSON value into a well-formed
 * slot, defaulting anything missing or malformed rather than throwing —
 * the column defaults to "{}" for an action with no second roll. */
export function parseActionRollSlot(value: unknown): ActionRollSlot {
  const empty = emptyActionRollSlot();
  if (!value || typeof value !== "object") return empty;
  const v = value as Partial<ActionRollSlot>;
  return {
    label: typeof v.label === "string" ? v.label : empty.label,
    diceSides: typeof v.diceSides === "number" ? v.diceSides : null,
    diceCount: typeof v.diceCount === "number" ? v.diceCount : empty.diceCount,
    scalePerLevels:
      typeof v.scalePerLevels === "number" ? v.scalePerLevels : empty.scalePerLevels,
    scaleSource: typeof v.scaleSource === "string" ? v.scaleSource : empty.scaleSource,
    modifiers: Array.isArray(v.modifiers)
      ? v.modifiers.filter(
          (m): m is ActionRollModifier =>
            !!m &&
            typeof m === "object" &&
            typeof (m as ActionRollModifier).label === "string" &&
            typeof (m as ActionRollModifier).value === "number",
        )
      : [],
  };
}

export function emptyActionRollSlot(): ActionRollSlot {
  return {
    label: "",
    diceSides: null,
    diceCount: 1,
    scalePerLevels: 0,
    scaleSource: "",
    modifiers: [],
  };
}

export interface LevelLookup {
  totalLevel: number;
  /** Class levels by CharacterClass.name. */
  classLevels: Record<string, number>;
}

/** How many dice a roll slot's scaling resolves to for this character —
 * the base count plus one per `scalePerLevels` levels of the source. */
export function resolveDiceCount(
  slot: Pick<ActionRollSlot, "diceCount" | "scalePerLevels" | "scaleSource">,
  levels: LevelLookup,
): number {
  const base = Math.max(0, slot.diceCount);
  if (slot.scalePerLevels <= 0) return base;
  const level = slot.scaleSource
    ? (levels.classLevels[slot.scaleSource] ?? 0)
    : levels.totalLevel;
  return base + Math.floor(level / slot.scalePerLevels);
}

/** The dice notation to roll for this slot right now (e.g. "3d6"), or ""
 * when there are no dice (a pure-modifier slot). */
export function resolveDiceExpression(
  slot: Pick<ActionRollSlot, "diceSides" | "diceCount" | "scalePerLevels" | "scaleSource">,
  levels: LevelLookup,
): string {
  if (slot.diceSides == null) return "";
  const count = resolveDiceCount(slot, levels);
  return count > 0 ? `${count}d${slot.diceSides}` : "";
}
