"use client";

import type { ItemType, WeaponCategory } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { addInventoryItem, searchItems } from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCritical } from "@/lib/rules/inventory-item";

type ItemResult = Awaited<ReturnType<typeof searchItems>>[number];
type Kind = "weapons" | "armor" | "equipment";
type Grip = "one-hand" | "two-hand" | "ranged";
type ArmorBucket = "LIGHT" | "MEDIUM" | "HEAVY" | "SHIELD";
type ConsumableBucket = "CONSUMABLE" | "NON_CONSUMABLE";

const WEAPON_CATEGORY_OPTIONS: { value: WeaponCategory; label: string }[] = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MARTIAL", label: "Martial" },
  { value: "EXOTIC", label: "Exotic" },
];
const GRIP_OPTIONS: { value: Grip; label: string }[] = [
  { value: "one-hand", label: "One Hand" },
  { value: "two-hand", label: "Two Hand" },
  { value: "ranged", label: "Ranged" },
];
const ARMOR_BUCKET_OPTIONS: { value: ArmorBucket; label: string }[] = [
  { value: "LIGHT", label: "Light" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HEAVY", label: "Heavy" },
  { value: "SHIELD", label: "Shield" },
];
const CONSUMABLE_BUCKET_OPTIONS: { value: ConsumableBucket; label: string }[] = [
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "NON_CONSUMABLE", label: "Non-consumable" },
];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterChips<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <Button
            key={o.value}
            type="button"
            size="xs"
            variant={active ? "secondary" : "outline"}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

/** Extra at-a-glance stats shown in a result row — damage/crit for weapons,
 * AC for armor/shields; nothing for generic gear. */
function ResultStats({ item }: { item: ItemResult }) {
  if (item.type === "WEAPON" || item.type === "AMMUNITION") {
    const critical = formatCritical(item.critRange, item.critMultiplier);
    if (!item.damage && !critical) return null;
    return (
      <span className="text-muted-foreground text-xs">
        {item.damage}
        {item.damage && critical ? " · " : ""}
        {critical}
      </span>
    );
  }
  if (item.type === "ARMOR" || item.type === "SHIELD") {
    return (
      <span className="text-muted-foreground text-xs">AC +{item.acBonus ?? 0}</span>
    );
  }
  return null;
}

/** "Add gear" button + dialog: searches the shared item catalog scoped to
 * `types` (e.g. only WEAPON on the Weapons tab), narrowed further by
 * `kind`-specific filter chips, and adds a pick to the character's
 * inventory. Stays open after each add so several items can be picked in
 * one session. */
export function ItemPicker({
  characterId,
  types,
  kind,
  triggerLabel,
  dialogTitle,
}: {
  characterId: string;
  types: ItemType[];
  kind: Kind;
  triggerLabel: string;
  dialogTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<ItemResult[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const loading = query !== debouncedQuery;

  const [weaponCategories, setWeaponCategories] = useState<WeaponCategory[]>([]);
  const [grips, setGrips] = useState<Grip[]>([]);
  const [armorBuckets, setArmorBuckets] = useState<ArmorBucket[]>([]);
  const [consumableBuckets, setConsumableBuckets] = useState<ConsumableBucket[]>([]);

  function resetFilters() {
    setWeaponCategories([]);
    setGrips([]);
    setArmorBuckets([]);
    setConsumableBuckets([]);
  }

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    searchItems({
      query: debouncedQuery,
      types,
      weaponCategories,
      grips,
      armorBuckets,
      consumableBuckets,
    }).then((items) => {
      if (!cancelled) setResults(items);
    });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, types, weaponCategories, grips, armorBuckets, consumableBuckets]);

  function add(item: ItemResult) {
    setAddingId(item.id);
    startTransition(async () => {
      const result = await addInventoryItem({ characterId, itemId: item.id });
      setAddingId(null);
      if (result?.error) toast.error(result.error);
      else toast.success(`Added ${item.name}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setDebouncedQuery("");
          resetFilters();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {kind === "weapons" && (
          <div className="space-y-1.5">
            <FilterChips
              options={WEAPON_CATEGORY_OPTIONS}
              selected={weaponCategories}
              onToggle={(v) => setWeaponCategories((s) => toggleValue(s, v))}
            />
            <FilterChips
              options={GRIP_OPTIONS}
              selected={grips}
              onToggle={(v) => setGrips((s) => toggleValue(s, v))}
            />
          </div>
        )}
        {kind === "armor" && (
          <FilterChips
            options={ARMOR_BUCKET_OPTIONS}
            selected={armorBuckets}
            onToggle={(v) => setArmorBuckets((s) => toggleValue(s, v))}
          />
        )}
        {kind === "equipment" && (
          <FilterChips
            options={CONSUMABLE_BUCKET_OPTIONS}
            selected={consumableBuckets}
            onToggle={(v) => setConsumableBuckets((s) => toggleValue(s, v))}
          />
        )}

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loading && (
            <p className="text-muted-foreground py-2 text-center text-sm">
              Searching…
            </p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No matches.
            </p>
          )}
          {!loading &&
            results.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <span className="flex flex-col">
                  <span>{item.name}</span>
                  <ResultStats item={item} />
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={addingId === item.id}
                  onClick={() => add(item)}
                >
                  Add
                </Button>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
