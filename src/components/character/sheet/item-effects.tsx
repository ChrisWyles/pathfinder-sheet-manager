"use client";

import { XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addInventoryItemEffect,
  removeInventoryItemEffect,
} from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemEffect } from "@/lib/rules/inventory-item";

/** Enchantments/enhancements/attachments attached to a weapon or armor
 * piece — tracked as freeform name + description, not a computed bonus. */
export function ItemEffects({
  characterId,
  inventoryItemId,
  effects,
}: {
  characterId: string;
  inventoryItemId: string;
  effects: ItemEffect[];
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addInventoryItemEffect({
        characterId,
        inventoryItemId,
        name: trimmed,
        description: description.trim(),
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        setName("");
        setDescription("");
        setAdding(false);
      }
    });
  }

  function remove(effectId: string) {
    startTransition(async () => {
      const result = await removeInventoryItemEffect({
        characterId,
        inventoryItemId,
        effectId,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div>
      <div className="text-muted-foreground mb-1 text-[10px] leading-tight">
        Effects
      </div>

      {effects.length > 0 && (
        <div className="mb-1.5 space-y-1">
          {effects.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
            >
              <div>
                <div className="text-sm font-medium">{e.name}</div>
                {e.description && (
                  <div className="text-muted-foreground text-xs">
                    {e.description}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                onClick={() => remove(e.id)}
              >
                <XIcon />
                <span className="sr-only">Remove {e.name}</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-1.5 rounded-md border p-2">
          <Input
            autoFocus
            placeholder="Effect name (e.g. +1 flaming)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-sm"
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-7 text-sm"
          />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="xs"
              disabled={pending || !name.trim()}
              onClick={submit}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setAdding(false);
                setName("");
                setDescription("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setAdding(true)}
        >
          Add effect
        </Button>
      )}
    </div>
  );
}
