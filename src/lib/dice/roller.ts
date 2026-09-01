import { DiceRoll } from "@dice-roller/rpg-dice-roller";

export interface RollOutcome {
  notation: string;
  total: number;
  /** Human-readable breakdown, e.g. "1d20+7: [14]+7 = 21". */
  output: string;
  /** Every individual die face rolled, in order. */
  dice: number[];
  minTotal: number;
  maxTotal: number;
}

// Dice notation we accept: digits, dNN, +-*/(), spaces, keep/drop/reroll/explode
// flags, and comparison operators. Anything else is rejected before it reaches
// the parser.
const ALLOWED_NOTATION = /^[0-9dkhlr!<>=+\-*/%().\s]+$/i;

export class InvalidDiceNotationError extends Error {
  constructor(notation: string) {
    super(`Invalid dice notation: ${JSON.stringify(notation)}`);
    this.name = "InvalidDiceNotationError";
  }
}

function collectDice(rolls: unknown[]): number[] {
  const out: number[] = [];
  for (const entry of rolls) {
    if (entry && typeof entry === "object" && "rolls" in entry) {
      const inner = (entry as { rolls: unknown[] }).rolls;
      for (const die of inner) {
        if (die && typeof die === "object" && "value" in die) {
          out.push(Number((die as { value: number }).value));
        }
      }
    }
  }
  return out;
}

export function rollNotation(notation: string): RollOutcome {
  const trimmed = notation.trim();
  if (!trimmed || !ALLOWED_NOTATION.test(trimmed)) {
    throw new InvalidDiceNotationError(notation);
  }
  let roll: DiceRoll;
  try {
    roll = new DiceRoll(trimmed);
  } catch {
    throw new InvalidDiceNotationError(notation);
  }
  return {
    notation: trimmed,
    total: roll.total,
    output: roll.output,
    dice: collectDice(roll.rolls as unknown[]),
    minTotal: roll.minTotal,
    maxTotal: roll.maxTotal,
  };
}

/** Format a signed modifier for notation, e.g. 3 -> "+3", -1 -> "-1", 0 -> "". */
export function signed(value: number): string {
  if (value === 0) return "";
  return value > 0 ? `+${value}` : `${value}`;
}
