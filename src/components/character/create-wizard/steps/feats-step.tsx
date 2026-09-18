"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { featSlotCount } from "@/lib/rules/creation";
import { parseRepeatable } from "@/lib/rules/repeatable";

import { useWizard, type FeatPick } from "../wizard-provider";
import { FacetDropdown } from "../facet-dropdown";
import { OptionPicker, type PickerOption } from "../option-picker";
import { CollapsibleSection } from "./collapsible-section";
import { FieldGroup } from "./field";

const CUSTOM = "__custom__";

export function FeatsStep() {
  const { state, data, stepPlan, apply, isHuman } = useWizard();
  const [sphereFilter, setSphereFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  // Only one row's picker is expanded at a time — picking a feat (not typing
  // a custom name, which needs the field to stay open) collapses that row
  // and hands off to the next empty one, same pattern as class-step.tsx.
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const featSteps = useMemo(
    () => stepPlan.filter((s) => s.kind === "pick-feat"),
    [stepPlan],
  );
  const filledSlotCount = featSteps.filter(
    (_, i) => Boolean(state.feats[i]?.name?.trim()) || Boolean(state.feats[i]?.tradedFor),
  ).length;
  const tradedSlotCount = featSteps.filter((_, i) =>
    Boolean(state.feats[i]?.tradedFor),
  ).length;

  const sphereFacets = useMemo(
    () =>
      [...new Set(data.feats.flatMap((f) => f.sphereNames))]
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
        if (
          sphereFilter.length > 0 &&
          !f.sphereNames.some((s) => sphereFilter.includes(s))
        )
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
        keywords: `${f.featTypes.join(" ")} ${f.sphereNames.join(" ")} ${f.prerequisites} ${f.benefit}`,
        badges: [
          ...f.featTypes,
          ...f.sphereNames.map((s) => `${s} sphere`),
        ],
        preview: (
          <>
            {f.prerequisites ? (
              <span className="block">Prereq: {f.prerequisites}</span>
            ) : null}
            {f.benefit || "No summary on file."}
          </>
        ),
        href: f.sourceUrl || undefined,
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

  // A feat already picked in another row can't be picked again, unless it's
  // explicitly repeatable (e.g. Extra Magic Talent: "you may take this feat
  // multiple times") and hasn't hit its stated cap — filtered out of every
  // other row's options rather than validated after the fact.
  const chosenCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of state.feats) {
      const name = f.name.trim().toLowerCase();
      if (!name) continue;
      m.set(name, (m.get(name) ?? 0) + 1);
    }
    return m;
  }, [state.feats]);

  function optionsForRow(currentName: string): PickerOption[] {
    const own = currentName.trim().toLowerCase();
    return options.filter((o) => {
      if (o.value === CUSTOM || o.value.toLowerCase() === own) return true;
      const count = chosenCounts.get(o.value.toLowerCase()) ?? 0;
      if (count === 0) return true;
      const feat = byName.get(o.value.toLowerCase());
      const repeat = feat
        ? parseRepeatable(feat.benefit, "feat")
        : { repeatable: false, maxTakes: null };
      if (!repeat.repeatable) return false;
      return repeat.maxTakes == null || count < repeat.maxTakes;
    });
  }

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
        tradedFor: state.feats[i]?.tradedFor,
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

  // Per the SoP "trade a bonus feat for a talent" rule — this slot grants
  // an extra magic/combat talent slot instead of a feat. The actual talent
  // is picked on the Spheres & Talents step (see spheres-step.tsx, which
  // folds tradedFor picks into the matching bucket's total).
  function setTrade(index: number, tradedFor: "magic" | "combat" | undefined) {
    const next = [...state.feats];
    while (next.length <= index)
      next.push({ key: `row-${next.length}`, name: "", level: 1 });
    next[index] = {
      key: next[index]?.key ?? `row-${index}`,
      name: tradedFor ? "" : (next[index]?.name ?? ""),
      featId: tradedFor ? undefined : next[index]?.featId,
      level:
        index < featSteps.length
          ? featSteps[index].classLevel
          : (next[index]?.level ?? 1),
      tradedFor,
    };
    apply(() => ({ feats: next }));
    if (tradedFor) {
      setOpenIndex((cur) => (cur === index ? index + 1 : cur));
    }
  }

  function addExtra() {
    setOpenIndex(state.feats.length);
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
          <p className="text-sm font-medium">
            Feats: {filledSlotCount} of {featSteps.length}
            {tradedSlotCount > 0 &&
              ` (${tradedSlotCount} traded for a talent)`}
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
          const tradeSummary =
            row.tradedFor === "magic"
              ? "Traded for a magic talent"
              : row.tradedFor === "combat"
                ? "Traded for a combat talent"
                : undefined;
          return (
            <CollapsibleSection
              key={row.key}
              title={row.label}
              summary={tradeSummary ?? (row.name.trim() || undefined)}
              open={openIndex === row.index}
              onToggle={() =>
                setOpenIndex((cur) => (cur === row.index ? null : row.index))
              }
            >
              <div className="space-y-3">
                {!row.planned && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.index)}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!row.tradedFor ? "default" : "outline"}
                    onClick={() => setTrade(row.index, undefined)}
                  >
                    Feat
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.tradedFor === "magic" ? "default" : "outline"}
                    onClick={() => setTrade(row.index, "magic")}
                  >
                    Magic talent
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.tradedFor === "combat" ? "default" : "outline"}
                    onClick={() => setTrade(row.index, "combat")}
                  >
                    Combat talent
                  </Button>
                </div>

                {row.tradedFor ? (
                  <p className="text-muted-foreground text-sm">
                    This slot grants an extra{" "}
                    {row.tradedFor === "magic" ? "magic" : "combat"} talent
                    instead of a feat — pick the actual talent on the{" "}
                    <Link
                      href="/characters/new/spheres"
                      className="underline"
                    >
                      Spheres &amp; Talents
                    </Link>{" "}
                    step.
                  </p>
                ) : (
                  <>
                    <OptionPicker
                      aria-label="feat"
                      options={optionsForRow(row.name)}
                      value={selected}
                      onChange={(v) => {
                        writeRow(row.index, v === CUSTOM ? " " : v);
                        if (v !== CUSTOM) {
                          setOpenIndex((cur) =>
                            cur === row.index ? row.index + 1 : cur,
                          );
                        }
                      }}
                      emptyText="No feats match these filters."
                    />
                    {selected === CUSTOM && (
                      <Input
                        className="mt-2"
                        value={row.name.trim()}
                        onChange={(e) => writeRow(row.index, e.target.value)}
                        placeholder="Feat name"
                        autoFocus
                      />
                    )}
                  </>
                )}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addExtra}>
        Add another feat
      </Button>
    </div>
  );
}
