"use client";

import { ChevronRightIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  removeInventoryItem,
  updateInventoryItemFlags,
} from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { ItemDetail } from "./item-detail";
import type { CharacterWithRelations } from "./types";

type InventoryItem = CharacterWithRelations["inventory"][number];

export function InventoryRow({
  characterId,
  item,
  showMasterwork,
}: {
  characterId: string;
  item: InventoryItem;
  showMasterwork: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function setEquipped(value: boolean) {
    startTransition(async () => {
      const result = await updateInventoryItemFlags({
        characterId,
        inventoryItemId: item.id,
        equipped: value,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeInventoryItem({
        characterId,
        inventoryItemId: item.id,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="rounded-md border text-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 cursor-pointer"
      >
        <span className="flex items-center gap-1">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          {item.name}
          {item.quantity > 1 ? ` ×${item.quantity}` : ""}
        </span>
        <span className="flex items-center gap-3">
          {item.weight > 0 && (
            <span className="text-muted-foreground text-xs">
              {(item.weight * item.quantity).toFixed(1)} lb.
            </span>
          )}
          <label
            className="flex items-center gap-1.5 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={item.equipped}
              disabled={pending}
              onCheckedChange={(c) => setEquipped(c === true)}
            />
            Equipped
          </label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
          >
            Remove
          </Button>
        </span>
      </div>

      {open && (
        <div className="px-2 pb-2">
          <ItemDetail
            characterId={characterId}
            item={item}
            showMasterwork={showMasterwork}
          />
        </div>
      )}
    </div>
  );
}
