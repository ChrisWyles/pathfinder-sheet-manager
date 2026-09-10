import { describe, expect, it } from "vitest";

import { normalizePgUrl } from "./pg-url";

describe("normalizePgUrl", () => {
  it("upgrades sslmode=require to verify-full", () => {
    expect(
      normalizePgUrl(
        "postgresql://u:p@ep-x-pooler.neon.tech/neondb?channel_binding=require&sslmode=require",
      ),
    ).toBe(
      "postgresql://u:p@ep-x-pooler.neon.tech/neondb?channel_binding=require&sslmode=verify-full",
    );
  });

  it("handles sslmode as the only query param", () => {
    expect(normalizePgUrl("postgres://h/db?sslmode=require")).toBe(
      "postgres://h/db?sslmode=verify-full",
    );
  });

  it("leaves verify-full and disable untouched", () => {
    expect(normalizePgUrl("postgres://h/db?sslmode=verify-full")).toBe(
      "postgres://h/db?sslmode=verify-full",
    );
    expect(normalizePgUrl("postgres://h/db?sslmode=disable")).toBe(
      "postgres://h/db?sslmode=disable",
    );
  });

  it("does not touch a substring in a password", () => {
    expect(
      normalizePgUrl("postgres://u:sslmode=require@h/db?sslmode=require"),
    ).toBe("postgres://u:sslmode=require@h/db?sslmode=verify-full");
  });

  it("passes through an empty string", () => {
    expect(normalizePgUrl("")).toBe("");
  });
});
