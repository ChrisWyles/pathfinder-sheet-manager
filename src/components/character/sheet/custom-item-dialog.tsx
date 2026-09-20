"use client";

import type { ArmorCategory, WeaponCategory } from "@prisma/client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCustomInventoryItem } from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
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

type Kind = "weapon" | "armor" | "equipment";

const WEAPON_CATEGORIES: { value: WeaponCategory; label: string }[] = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MARTIAL", label: "Martial" },
  { value: "EXOTIC", label: "Exotic" },
];

const ARMOR_CATEGORIES: { value: ArmorCategory; label: string }[] = [
  { value: "LIGHT", label: "Light" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HEAVY", label: "Heavy" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function CustomItemDialog({
  characterId,
  kind,
  triggerLabel,
  dialogTitle,
}: {
  characterId: string;
  kind: Kind;
  triggerLabel: string;
  dialogTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [costGp, setCostGp] = useState("0");
  const [weight, setWeight] = useState("0");

  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory>("MARTIAL");
  const [damage, setDamage] = useState("");
  const [damageType, setDamageType] = useState("");
  const [critRange, setCritRange] = useState("20");
  const [critMultiplier, setCritMultiplier] = useState("2");
  const [rangeIncrement, setRangeIncrement] = useState("");

  const [armorKind, setArmorKind] = useState<"ARMOR" | "SHIELD">("ARMOR");
  const [armorCategory, setArmorCategory] = useState<ArmorCategory>("LIGHT");
  const [acBonus, setAcBonus] = useState("0");
  const [maxDexBonus, setMaxDexBonus] = useState("");
  const [armorCheckPenalty, setArmorCheckPenalty] = useState("0");
  const [spellFailure, setSpellFailure] = useState("0");

  function reset() {
    setName("");
    setDescription("");
    setCostGp("0");
    setWeight("0");
    setWeaponCategory("MARTIAL");
    setDamage("");
    setDamageType("");
    setCritRange("20");
    setCritMultiplier("2");
    setRangeIncrement("");
    setArmorKind("ARMOR");
    setArmorCategory("LIGHT");
    setAcBonus("0");
    setMaxDexBonus("");
    setArmorCheckPenalty("0");
    setSpellFailure("0");
  }

  function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    const stats =
      kind === "weapon"
        ? {
            type: "WEAPON" as const,
            description: description.trim(),
            weaponCategory,
            damage: damage.trim() || undefined,
            damageType: damageType.trim() || undefined,
            critRange: Number(critRange) || 20,
            critMultiplier: Number(critMultiplier) || 2,
            rangeIncrement: rangeIncrement.trim()
              ? Number(rangeIncrement)
              : null,
          }
        : kind === "armor"
          ? {
              type: armorKind,
              description: description.trim(),
              armorCategory: armorKind === "ARMOR" ? armorCategory : undefined,
              acBonus: Number(acBonus) || 0,
              maxDexBonus: maxDexBonus.trim() ? Number(maxDexBonus) : null,
              armorCheckPenalty: Number(armorCheckPenalty) || 0,
              spellFailure: Number(spellFailure) || 0,
            }
          : {
              type: "GEAR" as const,
              description: description.trim(),
            };

    startTransition(async () => {
      const result = await createCustomInventoryItem({
        characterId,
        name: trimmedName,
        costCp: Math.round((Number(costGp) || 0) * 100),
        weight: Number(weight) || 0,
        stats,
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
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <Field label="Name">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="flex gap-2">
            <Field label="Cost (gp)">
              <Input
                type="number"
                min={0}
                value={costGp}
                onChange={(e) => setCostGp(e.target.value)}
              />
            </Field>
            <Field label="Weight (lb)">
              <Input
                type="number"
                min={0}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
          </div>

          {kind === "weapon" && (
            <>
              <Field label="Proficiency">
                <Select
                  value={weaponCategory}
                  onValueChange={(v) => v && setWeaponCategory(v as WeaponCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEAPON_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex gap-2">
                <Field label="Damage">
                  <Input
                    placeholder="1d8"
                    value={damage}
                    onChange={(e) => setDamage(e.target.value)}
                  />
                </Field>
                <Field label="Damage type">
                  <Input
                    placeholder="S"
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <Field label="Crit range">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={critRange}
                    onChange={(e) => setCritRange(e.target.value)}
                  />
                </Field>
                <Field label="Crit ×">
                  <Input
                    type="number"
                    min={1}
                    value={critMultiplier}
                    onChange={(e) => setCritMultiplier(e.target.value)}
                  />
                </Field>
                <Field label="Range (ft)">
                  <Input
                    type="number"
                    min={0}
                    placeholder="melee"
                    value={rangeIncrement}
                    onChange={(e) => setRangeIncrement(e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {kind === "armor" && (
            <>
              <Field label="Kind">
                <Select
                  value={armorKind}
                  onValueChange={(v) => v && setArmorKind(v as "ARMOR" | "SHIELD")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARMOR">Armor</SelectItem>
                    <SelectItem value="SHIELD">Shield</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {armorKind === "ARMOR" && (
                <Field label="Weight class">
                  <Select
                    value={armorCategory}
                    onValueChange={(v) => v && setArmorCategory(v as ArmorCategory)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ARMOR_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <div className="flex gap-2">
                <Field label="AC bonus">
                  <Input
                    type="number"
                    value={acBonus}
                    onChange={(e) => setAcBonus(e.target.value)}
                  />
                </Field>
                <Field label="Max Dex">
                  <Input
                    type="number"
                    min={0}
                    placeholder="unlimited"
                    value={maxDexBonus}
                    onChange={(e) => setMaxDexBonus(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <Field label="Check penalty">
                  <Input
                    type="number"
                    min={0}
                    value={armorCheckPenalty}
                    onChange={(e) => setArmorCheckPenalty(e.target.value)}
                  />
                </Field>
                <Field label="Spell failure %">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={spellFailure}
                    onChange={(e) => setSpellFailure(e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Flavor text, rules text…"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !name.trim()}
            onClick={submit}
          >
            {pending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
