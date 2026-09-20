"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateResources } from "@/app/(app)/characters/actions";
import { Input } from "@/components/ui/input";

/** One editable "current / max" resource pool (HP, temp HP, spell points) —
 * saves on blur, optimistic locally, reverts to the last-saved value on
 * error. */
function EditableAmount({
  label,
  value,
  onCommit,
  suffix,
  pending,
}: {
  label: string;
  value: number;
  onCommit: (next: number) => void;
  suffix?: string;
  pending?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));

  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground text-[10px] leading-tight">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <Input
          type="number"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = Number(draft);
            if (Number.isFinite(next)) onCommit(Math.trunc(next));
            else setDraft(String(value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-6 w-14 px-1 text-right text-sm font-semibold tabular-nums"
        />
        {suffix && (
          <span className="text-muted-foreground text-xs">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export function ResourceTracker({
  characterId,
  currentHp,
  maxHp,
  tempHp,
  spellPoints,
  maxSpellPoints,
}: {
  characterId: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  spellPoints: number | null;
  maxSpellPoints: number | null;
}) {
  const [hp, setHp] = useState(currentHp);
  const [temp, setTemp] = useState(tempHp);
  const [sp, setSp] = useState(spellPoints ?? 0);
  const [pending, startTransition] = useTransition();

  function commit(next: { hp?: number; temp?: number; sp?: number }) {
    const nextHp = next.hp ?? hp;
    const nextTemp = next.temp ?? temp;
    const nextSp = next.sp ?? sp;
    if (next.hp !== undefined) setHp(next.hp);
    if (next.temp !== undefined) setTemp(next.temp);
    if (next.sp !== undefined) setSp(next.sp);
    startTransition(async () => {
      const result = await updateResources({
        characterId,
        currentHp: nextHp,
        tempHp: nextTemp,
        spellPoints: maxSpellPoints != null ? nextSp : undefined,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <EditableAmount
        label="Hit points"
        value={hp}
        suffix={`/ ${maxHp}`}
        pending={pending}
        onCommit={(v) => commit({ hp: v })}
      />
      <EditableAmount
        label="Temp HP"
        value={temp}
        pending={pending}
        onCommit={(v) => commit({ temp: v })}
      />
      {maxSpellPoints != null && (
        <EditableAmount
          label="Spell points"
          value={sp}
          suffix={`/ ${maxSpellPoints}`}
          pending={pending}
          onCommit={(v) => commit({ sp: v })}
        />
      )}
    </div>
  );
}
