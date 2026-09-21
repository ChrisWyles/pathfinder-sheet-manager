"use client";

import { ChevronRightIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { removeCharacterAction } from "@/app/(app)/characters/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  parseActionRollSlot,
  resolveDiceExpression,
  type ActionRollSlot,
  type LevelLookup,
} from "@/lib/dice/action-roll";
import { cn } from "@/lib/utils";

import { sign } from "./stat";
import type { CharacterWithRelations } from "./types";
import { useCharacterRoll } from "../use-character-roll";

type CharacterAction = CharacterWithRelations["actions"][number];

const ACTION_SPEED_LABEL: Record<CharacterAction["actionSpeed"], string> = {
  FREE: "Free",
  SWIFT: "Swift",
  IMMEDIATE: "Immediate",
  MOVE: "Move",
  STANDARD: "Standard",
  FULL_ROUND: "Full Round",
};

function RollButton({
  actionName,
  slot,
  levels,
  roll,
  pending,
}: {
  actionName: string;
  slot: ActionRollSlot;
  levels: LevelLookup;
  roll: (intent: {
    type: "custom";
    label: string;
    dice: string;
    modifiers?: { source: string; value: number }[];
  }) => void;
  pending: boolean;
}) {
  const dice = resolveDiceExpression(slot, levels);
  if (!dice && slot.modifiers.length === 0) return null;

  const rollLabel = slot.label || "Roll";
  const modifierText = slot.modifiers
    .map((m) => sign(m.value))
    .join(" ")
    .trim();

  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={() =>
        roll({
          type: "custom",
          label: `${actionName} — ${rollLabel}`,
          dice: dice || "0",
          modifiers: slot.modifiers.map((m) => ({ source: m.label, value: m.value })),
        })
      }
    >
      {rollLabel} ({[dice, modifierText].filter(Boolean).join(" ")})
    </Button>
  );
}

export function ActionRow({
  characterId,
  action,
  linkedNames,
  levels,
}: {
  characterId: string;
  action: CharacterAction;
  linkedNames: string[];
  levels: LevelLookup;
}) {
  const [open, setOpen] = useState(false);
  const { roll, pending: rollPending } = useCharacterRoll(characterId);
  const [removing, startTransition] = useTransition();
  const pending = rollPending || removing;

  const roll1 = parseActionRollSlot(action.roll1);
  const roll2 = parseActionRollSlot(action.roll2);

  function remove() {
    startTransition(async () => {
      const result = await removeCharacterAction({
        characterId,
        actionId: action.id,
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
        className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-2 py-1.5"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          {action.name}
          <Badge variant="secondary">{ACTION_SPEED_LABEL[action.actionSpeed]}</Badge>
          {action.range && (
            <span className="text-muted-foreground text-xs">{action.range}</span>
          )}
        </span>
        <span
          className="flex flex-wrap items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <RollButton
            actionName={action.name}
            slot={roll1}
            levels={levels}
            roll={roll}
            pending={pending}
          />
          <RollButton
            actionName={action.name}
            slot={roll2}
            levels={levels}
            roll={roll}
            pending={pending}
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={pending}
            onClick={remove}
          >
            Remove
          </Button>
        </span>
      </div>

      {open && (
        <div className="text-muted-foreground space-y-1.5 border-t px-2 py-2 text-xs leading-relaxed">
          {action.description && (
            <p className="whitespace-pre-wrap">{action.description}</p>
          )}
          {linkedNames.length > 0 && (
            <p>
              <span className="font-medium">Modified by:</span>{" "}
              {linkedNames.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
