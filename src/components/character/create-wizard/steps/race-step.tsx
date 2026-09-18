"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ABILITY_META, SIZE_OPTIONS } from "@/lib/constants";
import {
  CORE_RACES,
  RACE_SIZES,
  raceMatchesFacets,
  type RacePreset,
} from "@/lib/rules/races";
import { ABILITIES, type AbilityKey } from "@/lib/rules/types";

import { useWizard } from "../wizard-provider";
import { FacetDropdown } from "../facet-dropdown";
import { OptionPicker, type PickerOption } from "../option-picker";
import { CollapsibleSection } from "./collapsible-section";
import { Field, FieldGroup, sign } from "./field";

const CUSTOM = "__custom__";

const ABILITY_OPTIONS = ABILITIES.map((k) => ({
  value: k,
  label: ABILITY_META[k].label,
}));
const SIZE_FACET_OPTIONS = RACE_SIZES.map((v) => ({
  value: v,
  label: SIZE_OPTIONS.find((s) => s.value === v)?.label ?? v,
}));

function adjSummary(r: Pick<RacePreset, "abilityAdjustments">) {
  const parts = ABILITIES.filter((k) => r.abilityAdjustments[k]).map(
    (k) => `${ABILITY_META[k].short} ${sign(r.abilityAdjustments[k]!)}`,
  );
  return parts.length ? parts.join(", ") : "flexible +2";
}

export function RaceStep() {
  const { state, update, apply } = useWizard();
  const [bonus, setBonus] = useState<AbilityKey[]>([]);
  const [malus, setMalus] = useState<AbilityKey[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [raceSectionOpen, setRaceSectionOpen] = useState(true);
  const [detailsSectionOpen, setDetailsSectionOpen] = useState(false);

  const selectedRace = useMemo(
    () => CORE_RACES.find((r) => r.name === state.raceKey) ?? null,
    [state.raceKey],
  );
  const isCustom = state.raceKey === CUSTOM;

  const filteredRaces = useMemo(
    () =>
      CORE_RACES.filter((r) =>
        raceMatchesFacets(r, {
          bonus,
          malus,
          sizes: sizes as typeof RACE_SIZES,
        }),
      ),
    [bonus, malus, sizes],
  );

  const raceOptions = useMemo<PickerOption[]>(
    () => [
      ...filteredRaces.map((r) => ({
        value: r.name,
        label: r.name,
        keywords: `${r.description} ${r.traits.join(" ")}`,
        badges: [
          adjSummary(r),
          SIZE_OPTIONS.find((s) => s.value === r.size)?.label ?? r.size,
          `${r.speed} ft.`,
        ],
        preview: r.description,
      })),
      {
        value: CUSTOM,
        label: "Custom / other race…",
        preview: "Enter a race name and set its size, speed and adjustments by hand.",
      },
    ],
    [filteredRaces],
  );

  function pickRace(value: string) {
    if (value === CUSTOM) {
      update({ raceKey: CUSTOM, race: "" });
      setRaceSectionOpen(false);
      setDetailsSectionOpen(true);
      return;
    }
    const r = CORE_RACES.find((x) => x.name === value);
    if (!r) return;
    apply(() => ({
      raceKey: r.name,
      race: r.name,
      size: r.size,
      baseSpeed: r.speed,
      racial: { ...r.abilityAdjustments },
    }));
    setRaceSectionOpen(false);
    setDetailsSectionOpen(true);
  }

  function setRacial(key: AbilityKey, value: number) {
    apply((s) => {
      const next = { ...s.racial };
      if (value === 0) delete next[key];
      else next[key] = value;
      return { racial: next };
    });
  }

  function chooseFlexibleBonus(key: AbilityKey) {
    update({ racial: { [key]: 2 } });
  }

  const filtersActive = bonus.length > 0 || malus.length > 0 || sizes.length > 0;
  const chosenFlexible = ABILITIES.find((k) => state.racial[k] === 2);

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title="Race"
        summary={state.race || undefined}
        open={raceSectionOpen}
        onToggle={() => setRaceSectionOpen((o) => !o)}
      >
        <div className="space-y-4">
          <FieldGroup label="Filter races">
            <div className="flex flex-wrap items-center gap-2">
              <FacetDropdown
                label="Bonus"
                options={ABILITY_OPTIONS}
                selected={bonus}
                onChange={(v) => setBonus(v as AbilityKey[])}
              />
              <FacetDropdown
                label="Malus"
                options={ABILITY_OPTIONS}
                selected={malus}
                onChange={(v) => setMalus(v as AbilityKey[])}
              />
              <FacetDropdown
                label="Size"
                options={SIZE_FACET_OPTIONS}
                selected={sizes}
                onChange={setSizes}
              />
              {filtersActive && (
                <>
                  <span className="text-muted-foreground text-xs">
                    {filteredRaces.length} of {CORE_RACES.length} races
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBonus([]);
                      setMalus([]);
                      setSizes([]);
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          </FieldGroup>

          <OptionPicker
            aria-label="race"
            options={raceOptions}
            value={state.raceKey || null}
            onChange={pickRace}
            emptyText="No races match these filters."
          />
        </div>
      </CollapsibleSection>

      {isCustom && (
        <CollapsibleSection
          title="Custom race details"
          summary={state.race.trim() || undefined}
          open={detailsSectionOpen}
          onToggle={() => setDetailsSectionOpen((o) => !o)}
        >
          <div className="space-y-4">
            <Field label="Race name">
              <Input
                value={state.race}
                onChange={(e) => update({ race: e.target.value })}
                placeholder="e.g. Kobold, Catfolk, Custom lineage"
                autoFocus
              />
            </Field>
            <FieldGroup label="Size">
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    type="button"
                    size="sm"
                    variant={state.size === o.value ? "default" : "outline"}
                    onClick={() => update({ size: o.value })}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </FieldGroup>
            <Field label="Base speed (ft.)">
              <Input
                type="number"
                min={0}
                max={240}
                step={5}
                value={state.baseSpeed}
                onChange={(e) =>
                  update({ baseSpeed: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <FieldGroup
              label="Ability adjustments"
              hint="Stored separately from your rolled or bought scores."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {ABILITIES.map((key) => (
                  <Field key={key} label={ABILITY_META[key].short}>
                    <Input
                      type="number"
                      min={-10}
                      max={10}
                      value={state.racial[key] ?? 0}
                      onChange={(e) =>
                        setRacial(key, Number(e.target.value) || 0)
                      }
                    />
                  </Field>
                ))}
              </div>
            </FieldGroup>
          </div>
        </CollapsibleSection>
      )}

      {selectedRace && (
        <CollapsibleSection
          title={selectedRace.name}
          summary={adjSummary(selectedRace)}
          open={detailsSectionOpen}
          onToggle={() => setDetailsSectionOpen((o) => !o)}
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {selectedRace.description}
            </p>

            <div>
              <div className="mb-1 text-sm font-medium">Abilities</div>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {selectedRace.traits.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium">Stat changes</div>
              {selectedRace.hasChoiceAdjustment ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    Choose the ability that gets this race&apos;s +2.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ABILITIES.map((k) => (
                      <Button
                        key={k}
                        type="button"
                        size="sm"
                        variant={chosenFlexible === k ? "default" : "outline"}
                        onClick={() => chooseFlexibleBonus(k)}
                      >
                        {ABILITY_META[k].short} +2
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm">{adjSummary(selectedRace)}</p>
              )}
              <p className="text-muted-foreground mt-2 text-sm">
                Size{" "}
                {SIZE_OPTIONS.find((s) => s.value === selectedRace.size)
                  ?.label ?? selectedRace.size}{" "}
                · Speed {selectedRace.speed} ft.
              </p>
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
