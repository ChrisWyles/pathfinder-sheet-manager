"use client";

import type { ActionSpeed } from "@prisma/client";
import { PlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCharacterAction } from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { CharacterWithRelations } from "./types";

const ACTION_SPEEDS: { value: ActionSpeed; label: string }[] = [
  { value: "FREE", label: "Free" },
  { value: "SWIFT", label: "Swift" },
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "MOVE", label: "Move" },
  { value: "STANDARD", label: "Standard" },
  { value: "FULL_ROUND", label: "Full Round" },
];

const CHARACTER_LEVEL = "__character__";

interface ModifierDraft {
  label: string;
  value: string;
}

interface RollSlotDraft {
  label: string;
  diceSides: string;
  diceCount: string;
  scalePerLevels: string;
  scaleSource: string;
  modifiers: ModifierDraft[];
}

function emptyRollSlotDraft(): RollSlotDraft {
  return {
    label: "",
    diceSides: "",
    diceCount: "1",
    scalePerLevels: "0",
    scaleSource: CHARACTER_LEVEL,
    modifiers: [],
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Builds one roll slot: a die size + base count, optional "+1 die every N
 * levels of ..." scaling (covers things like "1d6 per Destruction caster
 * level" — modeled as scaling with a chosen class's level, since the app
 * doesn't track a separate per-sphere caster level), and a free-length
 * list of flat modifiers. */
function RollSlotBuilder({
  title,
  classNames,
  draft,
  setDraft,
}: {
  title: string;
  classNames: string[];
  draft: RollSlotDraft;
  setDraft: (next: RollSlotDraft) => void;
}) {
  function addModifier() {
    setDraft({
      ...draft,
      modifiers: [...draft.modifiers, { label: "", value: "0" }],
    });
  }
  function updateModifier(i: number, patch: Partial<ModifierDraft>) {
    const modifiers = draft.modifiers.map((m, j) =>
      j === i ? { ...m, ...patch } : m,
    );
    setDraft({ ...draft, modifiers });
  }
  function removeModifier(i: number) {
    setDraft({ ...draft, modifiers: draft.modifiers.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="text-muted-foreground text-xs font-medium">{title}</div>

      <Field label="Label">
        <Input
          placeholder="e.g. Attack roll, Damage roll"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
      </Field>

      <div className="flex items-end gap-2">
        <Field label="Dice count">
          <Input
            type="number"
            min={0}
            value={draft.diceCount}
            onChange={(e) => setDraft({ ...draft, diceCount: e.target.value })}
          />
        </Field>
        <span className="text-muted-foreground pb-2 text-sm">d</span>
        <Field label="Dice sides">
          <Input
            type="number"
            min={0}
            placeholder="e.g. 6, or blank for none"
            value={draft.diceSides}
            onChange={(e) => setDraft({ ...draft, diceSides: e.target.value })}
          />
        </Field>
      </div>

      {draft.diceSides.trim() && (
        <div className="flex items-end gap-2">
          <span className="text-muted-foreground pb-2 text-xs whitespace-nowrap">
            +1 die every
          </span>
          <Field label="Levels">
            <Input
              type="number"
              min={0}
              placeholder="0 = no scaling"
              value={draft.scalePerLevels}
              onChange={(e) => setDraft({ ...draft, scalePerLevels: e.target.value })}
            />
          </Field>
          <Field label="Of">
            <Select
              items={{
                [CHARACTER_LEVEL]: "Character level",
                ...Object.fromEntries(classNames.map((n) => [n, `${n} level`])),
              }}
              value={draft.scaleSource}
              onValueChange={(v) => v && setDraft({ ...draft, scaleSource: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CHARACTER_LEVEL}>Character level</SelectItem>
                {classNames.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n} level
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <div className="space-y-1">
        <Label>Modifiers</Label>
        {draft.modifiers.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              placeholder="Label (e.g. Str mod)"
              value={m.label}
              onChange={(e) => updateModifier(i, { label: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              value={m.value}
              onChange={(e) => updateModifier(i, { value: e.target.value })}
              className="w-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => removeModifier(i)}
            >
              <XIcon />
              <span className="sr-only">Remove modifier</span>
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="xs" onClick={addModifier}>
          <PlusIcon /> Add modifier
        </Button>
      </div>
    </div>
  );
}

function draftToRollSlot(draft: RollSlotDraft) {
  const diceSides = draft.diceSides.trim() ? Number(draft.diceSides) || 0 : null;
  const modifiers = draft.modifiers
    .filter((m) => m.label.trim())
    .map((m) => ({ label: m.label.trim(), value: Number(m.value) || 0 }));
  if (diceSides == null && modifiers.length === 0) return undefined;
  return {
    label: draft.label.trim(),
    diceSides,
    diceCount: Number(draft.diceCount) || 0,
    scalePerLevels: Number(draft.scalePerLevels) || 0,
    scaleSource: draft.scaleSource === CHARACTER_LEVEL ? "" : draft.scaleSource,
    modifiers,
  };
}

/** "Add custom action" button + dialog for the Combat tab's Actions
 * section. Each of the two roll slots supports scaling dice count with a
 * character/class level and any number of named flat modifiers, and the
 * player can flag which of their known feats/talents modify the action
 * for reference. */
export function CustomActionDialog({
  character,
}: {
  character: CharacterWithRelations;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [actionSpeed, setActionSpeed] = useState<ActionSpeed>("STANDARD");
  const [range, setRange] = useState("");
  const [roll1, setRoll1] = useState<RollSlotDraft>(emptyRollSlotDraft);
  const [roll2, setRoll2] = useState<RollSlotDraft>(emptyRollSlotDraft);
  const [linkedFeatIds, setLinkedFeatIds] = useState<string[]>([]);
  const [linkedTalentIds, setLinkedTalentIds] = useState<string[]>([]);

  const classNames = character.classes.map((c) => c.name);

  function reset() {
    setName("");
    setDescription("");
    setActionSpeed("STANDARD");
    setRange("");
    setRoll1(emptyRollSlotDraft());
    setRoll2(emptyRollSlotDraft());
    setLinkedFeatIds([]);
    setLinkedTalentIds([]);
  }

  function toggle(list: string[], id: string, setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);
  }

  function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    startTransition(async () => {
      const result = await createCharacterAction({
        characterId: character.id,
        name: trimmedName,
        description: description.trim(),
        actionSpeed,
        range: range.trim(),
        roll1: draftToRollSlot(roll1),
        roll2: draftToRollSlot(roll2),
        linkedFeatIds,
        linkedTalentIds,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added ${trimmedName}`);
        reset();
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        Add custom action
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom action</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <Field label="Name">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="flex gap-2">
            <Field label="Action speed">
              <Select
                items={Object.fromEntries(ACTION_SPEEDS.map((s) => [s.value, s.label]))}
                value={actionSpeed}
                onValueChange={(v) => v && setActionSpeed(v as ActionSpeed)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_SPEEDS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Range">
              <Input
                placeholder="e.g. 30 ft. or Melee"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
            </Field>
          </div>

          <RollSlotBuilder
            title="Roll 1"
            classNames={classNames}
            draft={roll1}
            setDraft={setRoll1}
          />
          <RollSlotBuilder
            title="Roll 2 (optional)"
            classNames={classNames}
            draft={roll2}
            setDraft={setRoll2}
          />

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this action does…"
            />
          </Field>

          {character.feats.length > 0 && (
            <div className="space-y-1">
              <Label>Known feats that modify this action</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {character.feats.map((f) => (
                  <label key={f.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={linkedFeatIds.includes(f.id)}
                      onCheckedChange={() =>
                        toggle(linkedFeatIds, f.id, setLinkedFeatIds)
                      }
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {character.talents.length > 0 && (
            <div className="space-y-1">
              <Label>Known talents that modify this action</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {character.talents.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={linkedTalentIds.includes(t.id)}
                      onCheckedChange={() =>
                        toggle(linkedTalentIds, t.id, setLinkedTalentIds)
                      }
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !name.trim()} onClick={submit}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
