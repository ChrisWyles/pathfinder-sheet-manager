"use client";

import { Dices } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { postInfoToDiscord } from "@/app/(app)/characters/actions";
import { cn } from "@/lib/utils";

/** Posts the given section's currently-shown fields to the character's
 * Discord webhook as one embed — e.g. the whole Hit Points row, as-is. */
export function SectionDiscordButton({
  characterId,
  title,
  fields,
  className,
}: {
  characterId: string;
  title: string;
  fields: { name: string; value: string }[];
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await postInfoToDiscord({ characterId, title, fields });
      if (result?.error) toast.error(result.error);
      else toast.success(`Sent "${title}" to Discord`);
    });
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={pending}
      title={`Send ${title} to Discord`}
      className={cn(
        "text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:opacity-50",
        className,
      )}
    >
      <Dices className="size-3.5" />
    </button>
  );
}
