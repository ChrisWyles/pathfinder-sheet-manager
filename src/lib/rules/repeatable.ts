/**
 * Detects "you may take this feat/talent multiple times" language in a
 * feat/talent's rules text — and, when stated, an explicit cap — so the
 * wizard can let a repeatable pick (e.g. Armor Training: "up to two
 * times") actually be taken more than once instead of being treated like
 * every other one-shot feat/talent.
 */

export interface RepeatInfo {
  repeatable: boolean;
  /** Stated cap on how many times it can be taken, or null when the text
   * says "multiple times"/"more than once" with no specific number. */
  maxTakes: number | null;
}

const NUMBER_WORDS: Record<string, number> = {
  second: 2,
  twice: 2,
  two: 2,
  third: 3,
  three: 3,
  fourth: 4,
  four: 4,
  fifth: 5,
  five: 5,
  sixth: 6,
  six: 6,
};

function wordToNumber(raw: string): number | null {
  const low = raw.toLowerCase();
  if (/^\d+$/.test(low)) return parseInt(low, 10);
  return NUMBER_WORDS[low] ?? null;
}

export function parseRepeatable(
  text: string,
  noun: "feat" | "talent",
): RepeatInfo {
  const takeRe = new RegExp(`\\btake this ${noun}\\b([^.]{0,100})`, "i");
  const m = text.match(takeRe);
  if (!m) return { repeatable: false, maxTakes: null };
  const clause = m[1];

  const upTo = clause.match(/\bup to (\d+|\w+) times?\b/i);
  if (upTo) return { repeatable: true, maxTakes: wordToNumber(upTo[1]) };

  if (/\btwice\b/i.test(clause) || /\ba second time\b/i.test(clause)) {
    return { repeatable: true, maxTakes: 2 };
  }

  const totalOf = clause.match(/\ba total of (\d+|\w+)(?: times?)?\b/i);
  if (totalOf) return { repeatable: true, maxTakes: wordToNumber(totalOf[1]) };

  if (/\bmultiple times\b/i.test(clause) || /\bmore than once\b/i.test(clause)) {
    return { repeatable: true, maxTakes: null };
  }

  return { repeatable: false, maxTakes: null };
}
