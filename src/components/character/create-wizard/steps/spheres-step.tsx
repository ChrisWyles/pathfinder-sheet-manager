"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useWizard } from "../wizard-provider";
import { OptionPicker, type PickerOption } from "../option-picker";

const CUSTOM = "__custom__";

export function SpheresStep() {
  const { state, data, stepPlan, apply } = useWizard();

  const suggested = useMemo(() => {
    let talents = 0;
    let spheres = 0;
    for (const s of stepPlan) {
      if (s.kind === "pick-talent") talents += s.count;
      if (s.kind === "pick-sphere") spheres += s.count;
    }
    return { talents, spheres };
  }, [stepPlan]);

  const sphereOptions = useMemo<PickerOption[]>(
    () => [
      ...data.spheres.map((s) => ({
        value: s.name,
        label: s.name,
        keywords: `${s.type} ${s.description}`,
        badges: [s.type.toLowerCase()],
        preview: s.description || "No description on file.",
      })),
      { value: CUSTOM, label: "Custom sphere…", preview: "Type any name." },
    ],
    [data.spheres],
  );

  const talentOptions = useMemo<PickerOption[]>(
    () => [
      ...data.talents.map((t) => ({
        value: t.name,
        label: t.name,
        keywords: `${t.sphereName} ${t.description}`,
        badges: t.sphereName ? [t.sphereName] : undefined,
        preview: t.description || "No description on file.",
      })),
      { value: CUSTOM, label: "Custom talent…", preview: "Type any name." },
    ],
    [data.talents],
  );

  const sphereByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of data.spheres) m.set(s.name.toLowerCase(), s.id);
    return m;
  }, [data.spheres]);
  const talentByName = useMemo(() => {
    const m = new Map<string, (typeof data.talents)[number]>();
    for (const t of data.talents) m.set(t.name.toLowerCase(), t);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.talents]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Spheres &amp; talents</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This build suggests {suggested.talents} talent
          {suggested.talents === 1 ? "" : "s"}
          {suggested.spheres
            ? ` and ${suggested.spheres} sphere${suggested.spheres === 1 ? "" : "s"}`
            : ""}{" "}
          at your current level — including the 2 free starting magic
          talents every spherecaster gets at 1st level, if this class casts.
          Counts aren&apos;t enforced.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spheres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.spheres.length === 0 && (
            <p className="text-muted-foreground text-sm">None added.</p>
          )}
          {state.spheres.map((sp, i) => {
            const known = sphereByName.has(sp.name.trim().toLowerCase());
            const selected = known ? sp.name : sp.name ? CUSTOM : null;
            return (
              <div key={sp.key} className="rounded-md border p-3">
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      apply((s) => ({
                        spheres: s.spheres.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
                <OptionPicker
                  aria-label="sphere"
                  options={sphereOptions}
                  value={selected}
                  onChange={(v) =>
                    apply((s) => {
                      const next = [...s.spheres];
                      const name = v === CUSTOM ? " " : v;
                      next[i] = {
                        ...next[i],
                        name,
                        sphereId: sphereByName.get(name.toLowerCase()),
                      };
                      return { spheres: next };
                    })
                  }
                />
                {selected === CUSTOM && (
                  <Input
                    className="mt-2"
                    value={sp.name.trim()}
                    placeholder="Sphere name"
                    onChange={(e) =>
                      apply((s) => {
                        const next = [...s.spheres];
                        next[i] = {
                          ...next[i],
                          name: e.target.value,
                          sphereId: sphereByName.get(
                            e.target.value.toLowerCase(),
                          ),
                        };
                        return { spheres: next };
                      })
                    }
                  />
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              apply((s) => ({
                spheres: [...s.spheres, { key: `s-${Date.now()}`, name: "" }],
              }))
            }
          >
            Add sphere
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Talents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.talents.length === 0 && (
            <p className="text-muted-foreground text-sm">None added.</p>
          )}
          {state.talents.map((t, i) => {
            const known = talentByName.has(t.name.trim().toLowerCase());
            const selected = known ? t.name : t.name ? CUSTOM : null;
            return (
              <div key={t.key} className="rounded-md border p-3">
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      apply((s) => ({
                        talents: s.talents.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
                <OptionPicker
                  aria-label="talent"
                  options={talentOptions}
                  value={selected}
                  onChange={(v) =>
                    apply((s) => {
                      const next = [...s.talents];
                      const name = v === CUSTOM ? " " : v;
                      const match = talentByName.get(name.toLowerCase());
                      next[i] = {
                        ...next[i],
                        name,
                        talentId: match?.id,
                        sphereName: match?.sphereName ?? next[i].sphereName,
                      };
                      return { talents: next };
                    })
                  }
                />
                {selected === CUSTOM && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={t.name.trim()}
                      placeholder="Talent name"
                      onChange={(e) =>
                        apply((s) => {
                          const next = [...s.talents];
                          next[i] = { ...next[i], name: e.target.value };
                          return { talents: next };
                        })
                      }
                    />
                    <Input
                      className="w-40"
                      value={t.sphereName}
                      placeholder="Sphere"
                      onChange={(e) =>
                        apply((s) => {
                          const next = [...s.talents];
                          next[i] = { ...next[i], sphereName: e.target.value };
                          return { talents: next };
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              apply((s) => ({
                talents: [
                  ...s.talents,
                  { key: `t-${Date.now()}`, name: "", sphereName: "" },
                ],
              }))
            }
          >
            Add talent
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
