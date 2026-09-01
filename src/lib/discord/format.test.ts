import { describe, expect, it } from "vitest";

import type { RollResult } from "@/lib/dice/rolls";

import { rollToWebhookPayload } from "./format";

function makeResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    kind: "ATTACK",
    label: "Longsword attack",
    expression: "1d20+8",
    notation: "1d20+8",
    output: "1d20+8: [14]+8 = 22",
    total: 22,
    dice: [14],
    minTotal: 9,
    maxTotal: 28,
    modifiers: [
      { source: "Melee attack", value: 8 },
      { source: "flanking", value: 2 },
    ],
    ...overrides,
  };
}

describe("rollToWebhookPayload", () => {
  it("builds an embed with the character as the username", () => {
    const payload = rollToWebhookPayload("Seelah", makeResult());
    expect(payload.username).toBe("Seelah");
    expect(payload.embeds?.[0].title).toBe("Longsword attack");
    const fields = payload.embeds?.[0].fields ?? [];
    expect(fields.find((f) => f.name === "Total")?.value).toBe("**22**");
    expect(fields.find((f) => f.name === "Modifiers")?.value).toContain(
      "flanking: +2",
    );
  });

  it("flags a natural 20 on a d20 roll", () => {
    const payload = rollToWebhookPayload(
      "Seelah",
      makeResult({ dice: [20], output: "1d20+8: [20]+8 = 28", total: 28 }),
    );
    expect(payload.embeds?.[0].description).toContain("Natural 20");
  });

  it("flags a natural 1", () => {
    const payload = rollToWebhookPayload(
      "Seelah",
      makeResult({ dice: [1], output: "1d20+8: [1]+8 = 9", total: 9 }),
    );
    expect(payload.embeds?.[0].description).toContain("Natural 1");
  });

  it("adds no d20 flavour for damage rolls", () => {
    const payload = rollToWebhookPayload(
      "Seelah",
      makeResult({
        kind: "DAMAGE",
        expression: "2d6+4",
        output: "2d6+4: [1, 1]+4 = 6",
        dice: [1, 1],
        total: 6,
      }),
    );
    expect(payload.embeds?.[0].description).toBeUndefined();
  });
});
