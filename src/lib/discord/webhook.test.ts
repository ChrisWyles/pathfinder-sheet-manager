import { afterEach, describe, expect, it, vi } from "vitest";

import { isValidDiscordWebhookUrl, sendToWebhook } from "./webhook";

describe("isValidDiscordWebhookUrl", () => {
  it("accepts real Discord webhook URLs", () => {
    expect(
      isValidDiscordWebhookUrl(
        "https://discord.com/api/webhooks/123456789012345678/abcdEFGH-_ijklMNOP",
      ),
    ).toBe(true);
    expect(
      isValidDiscordWebhookUrl(
        "https://discordapp.com/api/webhooks/123/abc-def",
      ),
    ).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidDiscordWebhookUrl("https://example.com/webhook")).toBe(false);
    expect(
      isValidDiscordWebhookUrl("http://discord.com/api/webhooks/123/abc"),
    ).toBe(false);
    expect(
      isValidDiscordWebhookUrl("https://evil.com/discord.com/api/webhooks/1/a"),
    ).toBe(false);
    expect(isValidDiscordWebhookUrl("not a url")).toBe(false);
  });
});

describe("sendToWebhook", () => {
  afterEach(() => vi.restoreAllMocks());

  it("refuses to POST to a non-webhook URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await sendToWebhook("https://example.com", {
      content: "hi",
    });
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats a 204 as success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const result = await sendToWebhook(
      "https://discord.com/api/webhooks/123/abc-def",
      { content: "rolled a 20" },
    );
    expect(result).toEqual({ ok: true, status: 204 });
  });

  it("surfaces Discord error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );
    const result = await sendToWebhook(
      "https://discord.com/api/webhooks/123/abc-def",
      { content: "x" },
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toContain("429");
  });
});
