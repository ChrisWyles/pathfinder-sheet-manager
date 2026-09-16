"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { featSlotCount } from "@/lib/rules/creation";

import { useWizard, type FeatPick } from "../wizard-provider";
import { FacetDropdown } from "../facet-dropdown";
import { OptionPicker, type PickerOption } from "../option-picker";
import { FieldGroup } from "./field";

const CUSTOM = "__custom__";

export function FeatsStep() {
  const { state, data, stepPlan, apply, isHuman } = useWizard();
  const [sphereFilter, setSphereFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const featSteps = useMemo(
    () => stepPlan.filter((s) => s.kind === "pick-feat"),
    [stepPlan],
  );

  const sphereFacets = useMemo(
    () =>
      [...new Set(data.feats.map((f) => f.sphereName).filter(Boolean))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    [data.feats],
  );
  const categoryFacets = useMemo(
    () =>
      [...new Set(data.feats.flatMap((f) => f.featTypes))]
        .sort()
        .map((t) => ({ value: t, label: t })),
    [data.feats],
  );

  const filteredFeats = useMemo(
    () =>
      data.feats.filter((f) => {
        if (sphereFilter.length > 0 && !sphereFilter.includes(f.sphereName))
          return false;
        if (
          categoryFilter.length > 0 &&
          !f.featTypes.some((t) => categoryFilter.includes(t))
        )
          return false;
        return true;
      }),
    [data.feats, sphereFilter, categoryFilter],
  );
  const filtersActive = sphereFilter.length > 0 || categoryFilter.length > 0;
  function clearFilters() {
    setSphereFilter([]);
    setCategoryFilter([]);
  }

  const options = useMemo<PickerOption[]>(
    () => [
      ...filteredFeats.map((f) => ({
        value: f.name,
        label: f.name,
        keywords: `${f.featTypes.join(" ")} ${f.sphereName} ${f.prerequisites} ${f.benefit}`,
        badges: f.sphereName ? [...f.featTypes, `${f.sphereName} sphere`] : f.featTypes,
        preview: (
          <>
            {f.prerequisites ? (
              <span className="block">Prereq: {f.prerequisites}</span>
            ) : null}
            {f.benefit || "No summary on file."}
          </>
        ),
      })),
      { value: CUSTOM, label: "Custom feat…", preview: "Type any feat name." },
    ],
    [filteredFeats],
  );

  // Feat lookup for already-chosen rows always searches the *full* list —
  // filtering only narrows what's browsable, not what a row can display.
  const byName = useMemo(() => {
    const m = new Map<string, (typeof data.feats)[number]>();
    for (const f of data.feats) m.set(f.name.toLowerCase(), f);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.feats]);

  const rows: (FeatPick & { label: string; planned: boolean; index: number })[] =
    [
      ...featSteps.map((s, i) => ({
        key: s.id,
        label: `Level ${s.classLevel} · ${s.title}`,
        planned: true,
        index: i,
        name: state.feats[i]?.name ?? "",
        featId: state.feats[i]?.featId,
        level: s.classLevel,
      })),
      ...state.feats.slice(featSteps.length).map((f, i) => ({
        ...f,
        key: f.key || `extra-${i}`,
        label: "Extra feat",
        planned: false,
        index: featSteps.length + i,
      })),
    ];

  function writeRow(index: number, name: string) {
    const match = byName.get(name.trim().toLowerCase());
    const next = [...state.feats];
    while (next.length <= index)
      next.push({ key: `row-${next.length}`, name: "", level: 1 });
    next[index] = {
      key: next[index]?.key ?? `row-${index}`,
      name,
      featId: match?.id,
      level:
        index < featSteps.length
          ? featSteps[index].classLevel
          : (next[index]?.level ?? 1),
    };
    apply(() => ({ feats: next }));
  }

  function addExtra() {
    apply((s) => ({
      feats: [
        ...s.feats,
        { key: `extra-${s.feats.length}-${Date.now()}`, name: "", level: 1 },
      ],
    }));
  }

  function removeRow(index: number) {
    apply((s) => ({ feats: s.feats.filter((_, i) => i !== index) }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Feats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {featSteps.length} slot{featSteps.length === 1 ? "" : "s"} for this
            build ({featSlotCount({ level: state.level, human: isHuman })}{" "}
            general + class bonuses). Prerequisites aren&apos;t enforced.
          </p>
          {(sphereFacets.length > 0 || categoryFacets.length > 0) && (
            <FieldGroup label="Filter feats">
              <div className="flex flex-wrap items-center gap-2">
                {sphereFacets.length > 0 && (
                  <FacetDropdown
                    label="Sphere"
                    options={sphereFacets}
                    selected={sphereFilter}
                    onChange={setSphereFilter}
                  />
                )}
                {categoryFacets.length > 0 && (
                  <FacetDropdown
                    label="Category"
                    options={categoryFacets}
                    selected={categoryFilter}
                    onChange={setCategoryFilter}
                  />
                )}
                {filtersActive && (
                  <>
                    <span className="text-muted-foreground text-xs">
                      {filteredFeats.length} of {data.feats.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  </>
                )}
              </div>
            </FieldGroup>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {rows.map((row) => {
          const isKnown = byName.has(row.name.trim().toLowerCase());
          const selected = isKnown ? row.name : row.name ? CUSTOM : null;
          return (
            <div key={row.key} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{row.label}</span>
                {!row.planned && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <OptionPicker
                aria-label="feat"
                options={options}
                value={selected}
                onChange={(v) =>
                  writeRow(row.index, v === CUSTOM ? " " : v)
                }
                emptyText="No feats match these filters."
              />
              {selected === CUSTOM && (
                <Input
                  className="mt-2"
                  value={row.name.trim()}
                  onChange={(e) => writeRow(row.index, e.target.value)}
                  placeholder="Feat name"
                />
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addExtra}>
        Add another feat
      </Button>
    </div>
  );
}
