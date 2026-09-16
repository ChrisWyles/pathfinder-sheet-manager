"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ABILITY_META } from "@/lib/constants";
import { abilityModifier } from "@/lib/rules/abilities";
import {
  type AbilityMethod,
  POINT_BUY_BUDGETS,
  POINT_BUY_COST,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  pointBuyCostForScore,
  pointBuyTotal,
  rollAbilitySet,
  STANDARD_ARRAY,
} from "@/lib/rules/creation";
import { ABILITIES, type AbilityKey } from "@/lib/rules/types";

import { useWizard } from "../wizard-provider";
import { Field, sign } from "./field";

const METHODS: { value: AbilityMethod; label: string }[] = [
  { value: "manual", label: "Manual entry" },
  { value: "standard-array", label: "Standard array" },
  { value: "point-buy", label: "Point buy" },
  { value: "roll", label: "Roll 4d6" },
];

const STANDARD_POOL = Object.values(STANDARD_ARRAY).sort((a, b) => b - a);

export function AbilitiesStep() {
  const { state, update, apply, finalAbilities } = useWizard();

  const pool = useMemo<number[] | null>(() => {
    if (state.abilityMethod === "standard-array") return STANDARD_POOL;
    if (state.abilityMethod === "roll") return state.rolled;
    return null;
  }, [state.abilityMethod, state.rolled]);

  const remaining = useMemo(() => {
    if (!pool) return [];
    const counts = new Map<number, number>();
    pool.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
    ABILITIES.forEach((k) => {
      const v = state.abilities[k];
      if (counts.has(v)) counts.set(v, (counts.get(v) ?? 0) - 1);
    });
    return [...counts.entries()]
      .filter(([, n]) => n > 0)
      .flatMap(([v, n]) => Array.from({ length: n }, () => v))
      .sort((a, b) => b - a);
  }, [pool, state.abilities]);

  const pbSpent = pointBuyTotal(state.abilities);
  const pbOver = pbSpent > state.pointBuyBudget;

  function setScore(key: AbilityKey, value: number) {
    apply((s) => ({ abilities: { ...s.abilities, [key]: value } }));
  }

  function roll() {
    update({ rolled: rollAbilitySet() });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ability scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <Button
                key={m.value}
                type="button"
                size="sm"
                variant={
                  state.abilityMethod === m.value ? "default" : "outline"
                }
                onClick={() => update({ abilityMethod: m.value })}
              >
                {m.label}
              </Button>
            ))}
          </div>

          {state.abilityMethod === "point-buy" && (
            <div className="flex flex-wrap items-center gap-3">
              <Field label="Budget">
                <Select
                  value={String(state.pointBuyBudget)}
                  onValueChange={(v) =>
                    v && update({ pointBuyBudget: Number(v) })
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POINT_BUY_BUDGETS.map((b) => (
                      <SelectItem key={b.value} value={String(b.value)}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <span
                className={
                  pbOver
                    ? "text-destructive text-sm font-medium"
                    : "text-muted-foreground text-sm"
                }
              >
                {pbSpent} / {state.pointBuyBudget} points
              </span>
            </div>
          )}

          {state.abilityMethod === "roll" && (
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={roll}>
                {state.rolled ? "Reroll" : "Roll 4d6 (drop lowest) ×6"}
              </Button>
              {state.rolled && (
                <span className="text-muted-foreground text-sm tabular-nums">
                  Pool: {state.rolled.join(", ")}
                </span>
              )}
            </div>
          )}

          {state.abilityMethod === "standard-array" && (
            <p className="text-muted-foreground text-sm">
              Assign {STANDARD_POOL.join(", ")} to your six abilities.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ABILITIES.map((key) => {
              const score = state.abilities[key];
              return (
                <Field
                  key={key}
                  label={ABILITY_META[key].label}
                  hint={`mod ${sign(abilityModifier(score))} · total ${
                    finalAbilities[key]
                  } (${sign(abilityModifier(finalAbilities[key]))})`}
                >
                  {state.abilityMethod === "manual" && (
                    <Input
                      type="number"
                      min={1}
                      max={40}
                      value={score}
                      onChange={(e) =>
                        setScore(key, Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  )}

                  {state.abilityMethod === "point-buy" && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setScore(key, Math.max(POINT_BUY_MIN, score - 1))
                        }
                      >
                        −
                      </Button>
                      <span className="w-8 text-center tabular-nums">
                        {score}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setScore(key, Math.min(POINT_BUY_MAX, score + 1))
                        }
                      >
                        +
                      </Button>
                      <span className="text-muted-foreground text-xs">
                        cost {POINT_BUY_COST[score] ?? pointBuyCostForScore(score)}
                      </span>
                    </div>
                  )}

                  {(state.abilityMethod === "standard-array" ||
                    state.abilityMethod === "roll") && (
                    <Select
                      value={String(score)}
                      onValueChange={(v) => v && setScore(key, Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set([score, ...remaining]),
                        ]
                          .sort((a, b) => b - a)
                          .map((v, i) => (
                            <SelectItem key={`${v}-${i}`} value={String(v)}>
                              {v}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              );
            })}
          </div>

          {(state.abilityMethod === "standard-array" ||
            state.abilityMethod === "roll") &&
            pool && (
              <p className="text-muted-foreground text-sm">
                Unassigned:{" "}
                {remaining.length ? remaining.join(", ") : "none — all placed"}
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
