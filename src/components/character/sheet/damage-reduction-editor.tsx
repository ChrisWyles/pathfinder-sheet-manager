"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDamageReduction } from "@/app/(app)/characters/actions";
import { Input } from "@/components/ui/input";

/** DR bypass types (magic, cold iron, evil, ...) vary too much to compute,
 * so this is a freeform editable field rather than a derived stat. */
export function DamageReductionEditor({
  characterId,
  value: initial,
}: {
  characterId: string;
  value: string;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    if (value === initial) return;
    startTransition(async () => {
      const result = await updateDamageReduction({
        characterId,
        damageReduction: value,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground text-[10px] leading-tight">DR</div>
      <Input
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="e.g. 5/magic"
        className="h-6 w-24 px-1 text-sm font-semibold"
      />
    </div>
  );
}
