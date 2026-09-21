/**
 * Spheres of Power's standard range increments, shared by every sphere
 * ability (not just Destruction) — each scales with caster level except
 * Touch (personal reach) and Static (a fixed distance, e.g. for an effect
 * with its own explicit range).
 */
export type RangeKind = "TOUCH" | "CLOSE" | "MEDIUM" | "LONG" | "STATIC";

export interface RangeSpec {
  kind: RangeKind;
  /** Only meaningful for STATIC. */
  staticFeet?: number;
}

const RANGE_LABEL: Record<RangeKind, string> = {
  TOUCH: "Touch",
  CLOSE: "Close",
  MEDIUM: "Medium",
  LONG: "Long",
  STATIC: "Static",
};

/** Distance in feet for a range spec at the given caster level — null for
 * Touch, which isn't a distance so much as "an adjacent target". */
export function resolveRangeFeet(
  spec: RangeSpec,
  casterLevel: number,
): number | null {
  const level = Math.max(1, Math.floor(casterLevel));
  switch (spec.kind) {
    case "TOUCH":
      return null;
    case "CLOSE":
      return 25 + 5 * Math.floor(level / 2);
    case "MEDIUM":
      return 100 + 10 * level;
    case "LONG":
      return 400 + 40 * level;
    case "STATIC":
      return Math.max(0, spec.staticFeet ?? 0);
  }
}

/** Human-readable range, e.g. "Touch", "Close (35 ft.)". */
export function formatRange(spec: RangeSpec, casterLevel: number): string {
  const feet = resolveRangeFeet(spec, casterLevel);
  if (feet == null) return RANGE_LABEL[spec.kind];
  return spec.kind === "STATIC"
    ? `${feet} ft.`
    : `${RANGE_LABEL[spec.kind]} (${feet} ft.)`;
}
