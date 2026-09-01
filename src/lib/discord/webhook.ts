/** Minimal Discord webhook client. No bot, no gateway — just an HTTP POST. */

const WEBHOOK_HOST =
  /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function isValidDiscordWebhookUrl(url: string): boolean {
  return WEBHOOK_HOST.test(url.trim());
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface WebhookSendResult {
  ok: boolean;
  status: number;
  error?: string;
}

export async function sendToWebhook(
  url: string,
  payload: DiscordWebhookPayload,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<WebhookSendResult> {
  if (!isValidDiscordWebhookUrl(url)) {
    return { ok: false, status: 0, error: "Not a valid Discord webhook URL" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.ok || res.status === 204) {
      return { ok: true, status: res.status };
    }
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      error: `Discord responded ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timer);
  }
}
