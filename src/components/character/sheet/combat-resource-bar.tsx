"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateMartialFocus, updateResources } from "@/app/(app)/characters/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

function SpellPointsBox({
  characterId,
  spellPoints,
  maxSpellPoints,
}: {
  characterId: string;
  spellPoints: number;
  maxSpellPoints: number;
}) {
  const [draft, setDraft] = useState(String(spellPoints));
  const [pending, startTransition] = useTransition();

  function commit() {
    const next = Number(draft);
    if (!Number.isFinite(next)) {
      setDraft(String(spellPoints));
      return;
    }
    startTransition(async () => {
      const result = await updateResources({
        characterId,
        spellPoints: Math.trunc(next),
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground text-[10px] leading-tight">
        Spell Points
      </div>
      <div className="flex items-baseline gap-1">
        <Input
          type="number"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-6 w-14 px-1 text-right text-sm font-semibold tabular-nums"
        />
        <span className="text-muted-foreground text-xs">/ {maxSpellPoints}</span>
      </div>
    </div>
  );
}

function MartialFocusToggle({
  characterId,
  martialFocus,
}: {
  characterId: string;
  martialFocus: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle(value: boolean) {
    startTransition(async () => {
      const result = await updateMartialFocus({ characterId, martialFocus: value });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <label className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm">
      <Checkbox
        checked={martialFocus}
        disabled={pending}
        onCheckedChange={(c) => toggle(c === true)}
      />
      Martial Focus
    </label>
  );
}

/** Combat-tab header strip: an editable Spell Points X/Y box (hidden for
 * non-casters) and the Martial Focus toggle (Spheres of Might — grants
 * bonuses to combat talents while active; the player tracks when it's on
 * by hand, same as any other per-combat state this app doesn't simulate). */
export function CombatResourceBar({
  characterId,
  spellPoints,
  maxSpellPoints,
  martialFocus,
}: {
  characterId: string;
  spellPoints: number | null;
  maxSpellPoints: number | null;
  martialFocus: boolean;
}) {
  if (maxSpellPoints == null) {
    return (
      <div className="flex flex-wrap gap-2">
        <MartialFocusToggle characterId={characterId} martialFocus={martialFocus} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <SpellPointsBox
        characterId={characterId}
        spellPoints={spellPoints ?? 0}
        maxSpellPoints={maxSpellPoints}
      />
      <MartialFocusToggle characterId={characterId} martialFocus={martialFocus} />
    </div>
  );
}
