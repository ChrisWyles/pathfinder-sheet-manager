"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  updateInventoryItemDetails,
  updateInventoryItemFlags,
} from "@/app/(app)/characters/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCritical,
  readEffects,
  resolveItemStats,
} from "@/lib/rules/inventory-item";

import { ItemEffects } from "./item-effects";
import { Stat } from "./stat";
import type { CharacterWithRelations } from "./types";

type InventoryItem = CharacterWithRelations["inventory"][number];

export function ItemDetail({
  characterId,
  item,
  showMasterwork,
}: {
  characterId: string;
  item: InventoryItem;
  showMasterwork: boolean;
}) {
  const stats = resolveItemStats(item);
  const effects = readEffects(item.effects);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(item.name);
  const [notes, setNotes] = useState(item.notes);

  function setMasterwork(value: boolean) {
    startTransition(async () => {
      const result = await updateInventoryItemFlags({
        characterId,
        inventoryItemId: item.id,
        masterwork: value,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === item.name) {
      setName(item.name);
      return;
    }
    startTransition(async () => {
      const result = await updateInventoryItemDetails({
        characterId,
        inventoryItemId: item.id,
        name: trimmed,
      });
      if (result?.error) {
        toast.error(result.error);
        setName(item.name);
      }
    });
  }

  function saveNotes() {
    if (notes === item.notes) return;
    startTransition(async () => {
      const result = await updateInventoryItemDetails({
        characterId,
        inventoryItemId: item.id,
        notes,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  const critical = formatCritical(stats.critRange, stats.critMultiplier);
  const isWeaponLike = stats.type === "WEAPON" || stats.type === "AMMUNITION";
  const isArmorLike = stats.type === "ARMOR" || stats.type === "SHIELD";

  return (
    <div
      className="space-y-3 rounded-md border border-dashed p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className="text-muted-foreground mb-1 text-[10px] leading-tight">
          Name
        </div>
        <Input
          value={name}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-7 max-w-xs text-sm"
        />
      </div>

      {(isWeaponLike || isArmorLike) && (
        <div className="flex flex-wrap gap-1.5">
          {isWeaponLike && stats.damage && (
            <Stat label="Damage" value={stats.damage} />
          )}
          {isWeaponLike && stats.damageType && (
            <Stat label="Type" value={stats.damageType} />
          )}
          {isWeaponLike && critical && <Stat label="Critical" value={critical} />}
          {isWeaponLike && stats.rangeIncrement != null && (
            <Stat label="Range" value={`${stats.rangeIncrement} ft.`} />
          )}
          {isArmorLike && <Stat label="AC bonus" value={`+${stats.acBonus}`} />}
          {isArmorLike && (
            <Stat label="Max Dex" value={stats.maxDexBonus ?? "—"} />
          )}
          {isArmorLike && (
            <Stat
              label="Check penalty"
              value={`-${stats.armorCheckPenalty}`}
            />
          )}
          {isArmorLike && stats.spellFailure > 0 && (
            <Stat label="Spell failure" value={`${stats.spellFailure}%`} />
          )}
        </div>
      )}

      {showMasterwork && (
        <label className="flex w-fit items-center gap-1.5 text-xs">
          <Checkbox
            checked={item.masterwork}
            disabled={pending}
            onCheckedChange={(c) => setMasterwork(c === true)}
          />
          Masterwork
        </label>
      )}

      <div>
        <div className="text-muted-foreground mb-1 text-[10px] leading-tight">
          Description
        </div>
        <Textarea
          value={notes}
          disabled={pending}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Notes, flavor text, where it came from…"
          className="min-h-16 text-sm"
        />
      </div>

      <ItemEffects
        characterId={characterId}
        inventoryItemId={item.id}
        effects={effects}
      />
    </div>
  );
}
