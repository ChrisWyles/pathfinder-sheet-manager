"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  requiredSphereFromPrereq,
  summarizeCastingTradition,
} from "@/lib/rules/casting-tradition";

import { FacetDropdown } from "./facet-dropdown";
import { OptionPicker, type PickerOption } from "./option-picker";
import { CollapsibleSection } from "./steps/collapsible-section";
import { FieldGroup } from "./steps/field";
import {
  useWizard,
  type TraditionBoonLite,
  type TraditionDrawbackLite,
} from "./wizard-provider";

const COST_FACETS = [
  { value: "1", label: "1 drawback" },
  { value: "2", label: "2+ drawbacks" },
];

function drawbackBadges(d: TraditionDrawbackLite): string[] {
  return [
    d.costInDrawbacks > 1 ? `Counts as ${d.costInDrawbacks} drawbacks` : "1 drawback",
    ...d.prerequisites,
    ...d.incompatibleWith,
  ];
}
function sphereDrawbackBadges(d: TraditionDrawbackLite): string[] {
  return [d.sphereName, ...d.prerequisites, ...d.incompatibleWith];
}
function boonBadges(b: TraditionBoonLite): string[] {
  return [
    `Costs ${b.costInDrawbacks} drawbacks`,
    ...(b.repeatable ? ["Repeatable"] : []),
    ...b.prerequisites,
  ];
}
function matchesCostFacet(costInDrawbacks: number, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(costInDrawbacks >= 2 ? "2" : "1");
}
function matchesSphereReqFacet(prerequisites: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  return prerequisites.some((p) => {
    const sphere = requiredSphereFromPrereq(p);
    return sphere ? selected.includes(sphere) : false;
  });
}

/**
 * Inline casting-tradition builder — same visual language as the race step:
 * facet filters over browsable, multi-select drawback/boon lists, plus a
 * live summary/spell-point panel. Rendered directly on the dedicated
 * casting-tradition page (no modal) once the player chooses "Build custom
 * casting tradition…". Each section is independently collapsible; all start
 * collapsed except the picker above them.
 */
export function TraditionBuilder({ stepId }: { stepId: string }) {
  const { state, data, apply, setChoice } = useWizard();
  const [costFilter, setCostFilter] = useState<string[]>([]);
  const [sphereReqFilter, setSphereReqFilter] = useState<string[]>([]);
  const [sphereDrawbackFilter, setSphereDrawbackFilter] = useState<string[]>([]);
  // "Your tradition" and "Drawbacks" auto-expand the moment the builder is
  // opened (this component only mounts once "Build custom …" is picked).
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [drawbacksOpen, setDrawbacksOpen] = useState(true);
  const [sphereDrawbacksOpen, setSphereDrawbacksOpen] = useState(false);
  const [boonsOpen, setBoonsOpen] = useState(false);

  // General drawbacks (feed the boon/spell-point economy) and
  // sphere-specific drawbacks (a separate mechanic — each grants a bonus
  // talent in its magic sphere) share the same scraped table, split by
  // whether a sphere name is attached.
  const drawbackPool = useMemo(
    () => data.castingDrawbacks.filter((d) => !d.sphereName),
    [data.castingDrawbacks],
  );
  const sphereDrawbackPool = useMemo(
    () => data.castingDrawbacks.filter((d) => d.sphereName),
    [data.castingDrawbacks],
  );
  const boonPool = data.castingBoons;

  const selectedDrawbackIds = state.customCastingTradition?.drawbackIds ?? [];
  const selectedBoonIds = state.customCastingTradition?.boonIds ?? [];
  const selectedSphereDrawbackIds =
    state.customCastingTradition?.sphereDrawbackIds ?? [];

  // A handful of boons (and, in principle, drawbacks) are gated behind
  // already possessing a specific magic sphere. Only surfaced when the data
  // actually has one, so it stays invisible for content without it.
  const sphereReqFacets = useMemo(() => {
    const names = new Set<string>();
    for (const d of drawbackPool) {
      for (const p of d.prerequisites) {
        const s = requiredSphereFromPrereq(p);
        if (s) names.add(s);
      }
    }
    for (const b of boonPool) {
      for (const p of b.prerequisites) {
        const s = requiredSphereFromPrereq(p);
        if (s) names.add(s);
      }
    }
    return [...names].sort().map((s) => ({ value: s, label: s }));
  }, [drawbackPool, boonPool]);

  const sphereDrawbackFacets = useMemo(
    () =>
      [...new Set(sphereDrawbackPool.map((d) => d.sphereName))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    [sphereDrawbackPool],
  );

  const filteredDrawbacks = useMemo(
    () =>
      drawbackPool.filter((d) => {
        if (!matchesCostFacet(d.costInDrawbacks, costFilter)) return false;
        if (!matchesSphereReqFacet(d.prerequisites, sphereReqFilter))
          return false;
        return true;
      }),
    [drawbackPool, costFilter, sphereReqFilter],
  );

  const drawbackOptions = useMemo<PickerOption[]>(
    () =>
      filteredDrawbacks.map((d) => ({
        value: d.id,
        label: d.name,
        keywords: `${d.description} ${d.prerequisites.join(" ")} ${d.incompatibleWith.join(" ")}`,
        badges: drawbackBadges(d),
        preview: d.description,
      })),
    [filteredDrawbacks],
  );

  const filteredSphereDrawbacks = useMemo(
    () =>
      sphereDrawbackFilter.length === 0
        ? sphereDrawbackPool
        : sphereDrawbackPool.filter((d) => sphereDrawbackFilter.includes(d.sphereName)),
    [sphereDrawbackPool, sphereDrawbackFilter],
  );

  const sphereDrawbackOptions = useMemo<PickerOption[]>(
    () =>
      filteredSphereDrawbacks.map((d) => ({
        value: d.id,
        label: d.name,
        keywords: `${d.sphereName} ${d.description} ${d.prerequisites.join(" ")} ${d.incompatibleWith.join(" ")}`,
        badges: sphereDrawbackBadges(d),
        preview: d.description,
      })),
    [filteredSphereDrawbacks],
  );

  const filteredBoons = useMemo(
    () =>
      boonPool.filter((b) => matchesSphereReqFacet(b.prerequisites, sphereReqFilter)),
    [boonPool, sphereReqFilter],
  );

  const boonOptions = useMemo<PickerOption[]>(
    () =>
      filteredBoons.map((b) => ({
        value: b.id,
        label: b.name,
        keywords: `${b.description} ${b.prerequisites.join(" ")}`,
        badges: boonBadges(b),
        preview: b.description,
      })),
    [filteredBoons],
  );

  const selectedDrawbacks = selectedDrawbackIds
    .map((id) => drawbackPool.find((d) => d.id === id))
    .filter((d): d is TraditionDrawbackLite => !!d);
  const selectedBoons = selectedBoonIds
    .map((id) => boonPool.find((b) => b.id === id))
    .filter((b): b is TraditionBoonLite => !!b);
  const selectedSphereDrawbacks = selectedSphereDrawbackIds
    .map((id) => sphereDrawbackPool.find((d) => d.id === id))
    .filter((d): d is TraditionDrawbackLite => !!d);

  const summary = summarizeCastingTradition({
    drawbackCosts: selectedDrawbacks.map((d) => d.costInDrawbacks),
    boonCount: selectedBoons.length,
    casterLevel: state.level,
  });

  function syncLabel(drawbackIds: string[], boonIds: string[], sphereDrawbackIds: string[]) {
    const drawbacks = drawbackIds
      .map((id) => drawbackPool.find((d) => d.id === id))
      .filter((d): d is TraditionDrawbackLite => !!d);
    const boons = boonIds
      .map((id) => boonPool.find((b) => b.id === id))
      .filter((b): b is TraditionBoonLite => !!b);
    const sphereDrawbacks = sphereDrawbackIds
      .map((id) => sphereDrawbackPool.find((d) => d.id === id))
      .filter((d): d is TraditionDrawbackLite => !!d);
    if (drawbacks.length === 0 && boons.length === 0 && sphereDrawbacks.length === 0) {
      setChoice(stepId, []);
      return;
    }
    const s = summarizeCastingTradition({
      drawbackCosts: drawbacks.map((d) => d.costInDrawbacks),
      boonCount: boons.length,
      casterLevel: state.level,
    });
    const parts = [
      `${drawbacks.length} drawback${drawbacks.length === 1 ? "" : "s"}`,
      `${boons.length} boon${boons.length === 1 ? "" : "s"}`,
    ];
    if (sphereDrawbacks.length > 0) {
      parts.push(
        `${sphereDrawbacks.length} sphere drawback${sphereDrawbacks.length === 1 ? "" : "s"}`,
      );
    }
    if (s.bonusSpellPoints) parts.push(`+${s.bonusSpellPoints} SP`);
    setChoice(stepId, [`Custom (${parts.join(", ")})`]);
  }

  function handleDrawbackToggle(nextIds: string[]) {
    apply((s) => {
      const cur = s.customCastingTradition ?? {
        drawbackIds: [],
        boonIds: [],
        sphereDrawbackIds: [],
      };
      return { customCastingTradition: { ...cur, drawbackIds: nextIds } };
    });
    syncLabel(nextIds, selectedBoonIds, selectedSphereDrawbackIds);
  }

  function handleBoonToggle(nextIds: string[]) {
    const added = nextIds.filter((id) => !selectedBoonIds.includes(id));
    const removed = selectedBoonIds.filter((id) => !nextIds.includes(id));
    apply((s) => {
      const cur = s.customCastingTradition ?? {
        drawbackIds: [],
        boonIds: [],
        sphereDrawbackIds: [],
      };
      let spheres = s.spheres;
      let talents = s.talents;
      let feats = s.feats;
      for (const id of removed) {
        const prefix = `boon:${id}:`;
        spheres = spheres.filter((x) => !x.key.startsWith(prefix));
        talents = talents.filter((x) => !x.key.startsWith(prefix));
        feats = feats.filter((x) => !x.key.startsWith(prefix));
      }
      for (const id of added) {
        const boon = boonPool.find((b) => b.id === id);
        boon?.grants.forEach((g, i) => {
          const key = `boon:${id}:${i}`;
          if (g.type === "sphere") spheres = [...spheres, { key, name: g.name }];
          else if (g.type === "talent")
            talents = [...talents, { key, name: g.name, sphereName: "" }];
          else if (g.type === "feat")
            feats = [...feats, { key, name: g.name, level: s.level }];
        });
      }
      return {
        customCastingTradition: { ...cur, boonIds: nextIds },
        spheres,
        talents,
        feats,
      };
    });
    syncLabel(selectedDrawbackIds, nextIds, selectedSphereDrawbackIds);
  }

  function handleSphereDrawbackToggle(nextIds: string[]) {
    const added = nextIds.filter((id) => !selectedSphereDrawbackIds.includes(id));
    const removed = selectedSphereDrawbackIds.filter((id) => !nextIds.includes(id));
    apply((s) => {
      const cur = s.customCastingTradition ?? {
        drawbackIds: [],
        boonIds: [],
        sphereDrawbackIds: [],
      };
      let talents = s.talents;
      for (const id of removed) {
        const key = `sphere-drawback:${id}`;
        talents = talents.filter((t) => t.key !== key);
      }
      for (const id of added) {
        const d = sphereDrawbackPool.find((x) => x.id === id);
        if (d) {
          talents = [
            ...talents,
            {
              key: `sphere-drawback:${id}`,
              name: `Bonus talent (${d.sphereName})`,
              sphereName: d.sphereName,
            },
          ];
        }
      }
      return {
        customCastingTradition: { ...cur, sphereDrawbackIds: nextIds },
        talents,
      };
    });
    syncLabel(selectedDrawbackIds, selectedBoonIds, nextIds);
  }

  const filtersActive = costFilter.length > 0 || sphereReqFilter.length > 0;
  function clearFilters() {
    setCostFilter([]);
    setSphereReqFilter([]);
  }

  const summaryLabel =
    selectedDrawbacks.length === 0 &&
    selectedBoons.length === 0 &&
    selectedSphereDrawbacks.length === 0
      ? undefined
      : [
          `${selectedDrawbacks.length} drawback${selectedDrawbacks.length === 1 ? "" : "s"}`,
          `${selectedBoons.length} boon${selectedBoons.length === 1 ? "" : "s"}`,
          ...(selectedSphereDrawbacks.length > 0
            ? [
                `${selectedSphereDrawbacks.length} sphere drawback${selectedSphereDrawbacks.length === 1 ? "" : "s"}`,
              ]
            : []),
          ...(summary.bonusSpellPoints ? [`+${summary.bonusSpellPoints} SP`] : []),
        ].join(", ");

  return (
    <div className="space-y-4">
      {/* Selection + spell-point bonus stay pinned at the top, above the
          browsable lists, so they're visible while filtering/scrolling. */}
      <CollapsibleSection
        title="Your tradition"
        summary={summaryLabel}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((o) => !o)}
      >
        <div className="space-y-3">
          {selectedDrawbacks.length === 0 &&
          selectedBoons.length === 0 &&
          selectedSphereDrawbacks.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing selected yet — check off drawbacks (and boons) below.
            </p>
          ) : (
            <>
              <div>
                <div className="mb-1 text-sm font-medium">Drawbacks</div>
                {selectedDrawbacks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None.</p>
                ) : (
                  <ul className="list-inside list-disc text-sm">
                    {selectedDrawbacks.map((d) => (
                      <li key={d.id}>{d.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">Boons</div>
                {selectedBoons.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None.</p>
                ) : (
                  <ul className="list-inside list-disc text-sm">
                    {selectedBoons.map((b) => (
                      <li key={b.id}>{b.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">Sphere-specific drawbacks</div>
                {selectedSphereDrawbacks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None.</p>
                ) : (
                  <ul className="list-inside list-disc text-sm">
                    {selectedSphereDrawbacks.map((d) => (
                      <li key={d.id}>
                        {d.name} ({d.sphereName})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm">
            <span>
              Drawback points: <strong>{summary.totalDrawbackCost}</strong>
            </span>
            <span>
              Spent on boons: <strong>{summary.boonCost}</strong>
            </span>
            <span>
              Unspent: <strong>{summary.unspent}</strong>
            </span>
            <span>
              Bonus spell points: <strong>+{summary.bonusSpellPoints}</strong>{" "}
              (level {state.level})
            </span>
          </div>
          {summary.unspent > 0 && (
            <p className="text-muted-foreground text-xs">
              {summary.bonusSpellPointsProgression}
            </p>
          )}
          {summary.totalDrawbackCost < summary.boonCost && (
            <p className="text-destructive text-xs">
              Not enough drawback points for the selected boons yet.
            </p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Drawbacks"
        summary={
          selectedDrawbackIds.length > 0
            ? `${selectedDrawbackIds.length} selected`
            : undefined
        }
        open={drawbacksOpen}
        onToggle={() => setDrawbacksOpen((o) => !o)}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Each drawback is worth 1 point (some count as 2). Points left
            unspent after buying boons become bonus spell points.
          </p>
          <FieldGroup label="Filter drawbacks">
            <div className="flex flex-wrap items-center gap-2">
              <FacetDropdown
                label="Cost"
                options={COST_FACETS}
                selected={costFilter}
                onChange={setCostFilter}
              />
              {sphereReqFacets.length > 0 && (
                <FacetDropdown
                  label="Requires sphere"
                  options={sphereReqFacets}
                  selected={sphereReqFilter}
                  onChange={setSphereReqFilter}
                />
              )}
              {filtersActive && (
                <>
                  <span className="text-muted-foreground text-xs">
                    {filteredDrawbacks.length} of {drawbackPool.length}
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

          <OptionPicker
            multiple
            aria-label="drawbacks"
            options={drawbackOptions}
            value={selectedDrawbackIds}
            onChange={handleDrawbackToggle}
            emptyText="No drawbacks match these filters."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Sphere-specific drawbacks"
        summary={
          selectedSphereDrawbackIds.length > 0
            ? `${selectedSphereDrawbackIds.length} selected`
            : undefined
        }
        open={sphereDrawbacksOpen}
        onToggle={() => setSphereDrawbacksOpen((o) => !o)}
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Separate from the general drawbacks above: each sphere-specific
            drawback grants one bonus magic talent in its sphere instead of
            feeding the spell-point economy. Filter by sphere below.
          </p>
          <FieldGroup label="Filter drawbacks">
            <div className="flex flex-wrap items-center gap-2">
              <FacetDropdown
                label="Sphere"
                options={sphereDrawbackFacets}
                selected={sphereDrawbackFilter}
                onChange={setSphereDrawbackFilter}
              />
              {sphereDrawbackFilter.length > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">
                    {filteredSphereDrawbacks.length} of {sphereDrawbackPool.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSphereDrawbackFilter([])}
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          </FieldGroup>

          <OptionPicker
            multiple
            aria-label="sphere-specific drawbacks"
            options={sphereDrawbackOptions}
            value={selectedSphereDrawbackIds}
            onChange={handleSphereDrawbackToggle}
            emptyText="No drawbacks match these filters."
            groupBy={(o) =>
              sphereDrawbackPool.find((d) => d.id === o.value)?.sphereName ?? ""
            }
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Boons"
        summary={
          selectedBoonIds.length > 0
            ? `${selectedBoonIds.length} selected`
            : undefined
        }
        open={boonsOpen}
        onToggle={() => setBoonsOpen((o) => !o)}
      >
        <div className="space-y-4">
          {sphereReqFacets.length > 0 && (
            <FieldGroup label="Filter boons">
              <div className="flex flex-wrap items-center gap-2">
                <FacetDropdown
                  label="Requires sphere"
                  options={sphereReqFacets}
                  selected={sphereReqFilter}
                  onChange={setSphereReqFilter}
                />
                {sphereReqFilter.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {filteredBoons.length} of {boonPool.length}
                  </span>
                )}
              </div>
            </FieldGroup>
          )}
          <OptionPicker
            multiple
            aria-label="boons"
            options={boonOptions}
            value={selectedBoonIds}
            onChange={handleBoonToggle}
            emptyText="No boons match your search."
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
