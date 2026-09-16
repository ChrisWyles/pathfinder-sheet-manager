"use client";

import { useId, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { startingWealth } from "@/lib/rules/creation";

import { useWizard } from "../wizard-provider";
import { Field } from "./field";

export function EquipmentStep() {
  const { state, data, apply, update, selectedClass } = useWizard();
  const listId = useId();

  const wealth = startingWealth(selectedClass.name, selectedClass.groupKey);
  const spentCp = state.equipment.reduce(
    (sum, e) => sum + e.costCp * e.quantity,
    0,
  );
  const remainingGp = state.startingGold - spentCp / 100;

  const itemByName = useMemo(() => {
    const m = new Map<string, (typeof data.items)[number]>();
    for (const it of data.items) m.set(it.name.toLowerCase(), it);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.items]);

  function addRow() {
    apply((s) => ({
      equipment: [
        ...s.equipment,
        {
          key: `e-${Date.now()}`,
          name: "",
          quantity: 1,
          costCp: 0,
          weight: 0,
          equipped: false,
        },
      ],
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Starting wealth</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Gold (gp)" hint={`${selectedClass.name}: ${wealth.dice} (avg ${wealth.avg})`}>
            <Input
              type="number"
              min={0}
              value={state.startingGold}
              onChange={(e) =>
                update({ startingGold: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update({ startingGold: wealth.avg })}
          >
            Use average
          </Button>
          <span
            className={
              remainingGp < 0
                ? "text-destructive text-sm font-medium"
                : "text-muted-foreground text-sm"
            }
          >
            Remaining: {remainingGp.toFixed(2)} gp
          </span>
        </CardContent>
      </Card>

      <datalist id={listId}>
        {data.items.map((it) => (
          <option key={it.id} value={it.name} />
        ))}
      </datalist>

      <div className="space-y-2">
        {state.equipment.length === 0 && (
          <p className="text-muted-foreground text-sm">Nothing added yet.</p>
        )}
        {state.equipment.map((row, i) => (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border p-2"
          >
            <Input
              list={listId}
              value={row.name}
              placeholder="Item name"
              onChange={(e) =>
                apply((s) => {
                  const next = [...s.equipment];
                  const match = itemByName.get(e.target.value.toLowerCase());
                  next[i] = {
                    ...next[i],
                    name: e.target.value,
                    itemId: match?.id,
                    costCp: match ? match.costCp : next[i].costCp,
                    weight: match ? match.weight : next[i].weight,
                  };
                  return { equipment: next };
                })
              }
            />
            <Input
              className="w-16"
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) =>
                apply((s) => {
                  const next = [...s.equipment];
                  next[i] = {
                    ...next[i],
                    quantity: Math.max(1, Number(e.target.value) || 1),
                  };
                  return { equipment: next };
                })
              }
            />
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={row.equipped}
                onCheckedChange={(c) =>
                  apply((s) => {
                    const next = [...s.equipment];
                    next[i] = { ...next[i], equipped: c === true };
                    return { equipment: next };
                  })
                }
              />
              worn
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                apply((s) => ({
                  equipment: s.equipment.filter((_, j) => j !== i),
                }))
              }
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addRow}>
        Add item
      </Button>
    </div>
  );
}
