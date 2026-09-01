"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDiscordWebhook } from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidDiscordWebhookUrl } from "@/lib/discord/webhook";

export function DiscordWebhookCard({
  characterId,
  current,
}: {
  characterId: string;
  current: string | null;
}) {
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();

  const invalid = value.length > 0 && !isValidDiscordWebhookUrl(value);

  function save() {
    startTransition(async () => {
      const result = await updateDiscordWebhook({
        characterId,
        url: value.trim(),
      });
      if (result?.error) toast.error(result.error);
      else
        toast.success(
          value ? "Discord webhook saved" : "Discord webhook cleared",
        );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord delivery</CardTitle>
        <CardDescription>
          Rolls for this character post to this channel webhook.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
        {invalid && (
          <p className="text-destructive text-sm">
            That isn&apos;t a Discord webhook URL.
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={pending || invalid}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setValue("")}
              disabled={pending}
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
