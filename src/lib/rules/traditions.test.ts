import { describe, expect, it } from "vitest";

import { CASTING_TRADITIONS, MARTIAL_TRADITIONS } from "./traditions";

describe.each([
  ["casting", CASTING_TRADITIONS],
  ["martial", MARTIAL_TRADITIONS],
])("%s traditions", (_label, list) => {
  it("has at least 8 entries with unique names", () => {
    expect(list.length).toBeGreaterThanOrEqual(8);
    const names = list.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every entry a non-empty summary and grants line", () => {
    for (const t of list) {
      expect(t.summary.trim().length).toBeGreaterThan(10);
      expect(t.grants.trim().length).toBeGreaterThan(5);
    }
  });
});
