import type {
  BabProgressionKey,
  ClassProgression,
  SaveProgressionKey,
} from "./types";

/** Base attack bonus contributed by `levels` levels of one progression. */
export function babForClass(
  progression: BabProgressionKey,
  levels: number,
): number {
  const n = Math.max(0, levels);
  switch (progression) {
    case "FULL":
      return n;
    case "THREE_QUARTER":
      return Math.floor((n * 3) / 4);
    case "HALF":
      return Math.floor(n / 2);
  }
}

/** Base save bonus contributed by `levels` levels of one progression. */
export function saveForClass(
  progression: SaveProgressionKey,
  levels: number,
): number {
  const n = Math.max(0, levels);
  return progression === "GOOD" ? 2 + Math.floor(n / 2) : Math.floor(n / 3);
}

export function totalBab(classes: ClassProgression[]): number {
  return classes.reduce(
    (sum, c) => sum + babForClass(c.babProgression, c.levels),
    0,
  );
}

export function totalBaseSaves(classes: ClassProgression[]): {
  fort: number;
  ref: number;
  will: number;
} {
  return classes.reduce(
    (acc, c) => ({
      fort: acc.fort + saveForClass(c.fortProgression, c.levels),
      ref: acc.ref + saveForClass(c.refProgression, c.levels),
      will: acc.will + saveForClass(c.willProgression, c.levels),
    }),
    { fort: 0, ref: 0, will: 0 },
  );
}

/**
 * Iterative attack bonuses from a base attack bonus: a second attack at BAB 6, a
 * third at 11, a fourth at 16. Returns bonuses highest-first.
 */
export function attackSequenceFromBab(bab: number): number[] {
  const sequence: number[] = [bab];
  let next = bab - 5;
  while (next >= 1 && sequence.length < 4) {
    sequence.push(next);
    next -= 5;
  }
  return sequence;
}
