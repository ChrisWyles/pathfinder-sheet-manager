"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CLASS_BLURBS } from "@/lib/constants";
import { casterTier, type CasterTier } from "@/lib/rules/class-creation-steps";
import { parseFavoredClassBonusMechanic } from "@/lib/rules/favored-class-bonus";

import { useWizard } from "../wizard-provider";
import { FacetDropdown } from "../facet-dropdown";
import { OptionPicker, StatBadges, type PickerOption } from "../option-picker";
import { CollapsibleSection } from "./collapsible-section";
import { Field, FieldGroup } from "./field";

function babLabel(p: string) {
  return p === "FULL" ? "full" : p === "THREE_QUARTER" ? "¾" : "½";
}
function saveLabel(p: string) {
  return p === "GOOD" ? "good" : "poor";
}

const CASTER_LABEL: Record<CasterTier, string> = {
  FULL: "full",
  THREE_QUARTER: "¾",
  HALF: "half",
  OTHER: "partial",
  NONE: "",
};

const GROUP_FACET_OPTIONS = [
  { value: "spherecaster", label: "Spherecaster" },
  { value: "practitioner", label: "Practitioner" },
  { value: "champion", label: "Champion" },
  { value: "operative", label: "Operative" },
];
const BAB_FACET_OPTIONS = [
  { value: "FULL", label: "Full" },
  { value: "THREE_QUARTER", label: "¾" },
  { value: "HALF", label: "Half" },
];
const CASTER_FACET_OPTIONS = [
  { value: "FULL", label: "Full" },
  { value: "THREE_QUARTER", label: "¾" },
  { value: "HALF", label: "Half" },
  { value: "OTHER", label: "Other" },
  { value: "NONE", label: "Non-caster" },
];

const BASE_ARCHETYPE = "__base__";
const CUSTOM_ARCHETYPE = "__custom__";

type SectionKey = "class" | "archetype" | "favored";

export function ClassStep() {
  const { state, data, update, apply, selectedClass } = useWizard();
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [babFilter, setBabFilter] = useState<string[]>([]);
  const [casterFilter, setCasterFilter] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<SectionKey | null>("class");

  // TEMP: Spheres of Power only, per request — drop this filter (and the
  // empty-state branch below) to restore Pathfinder 1e classes on this page.
  const spheresClasses = useMemo(
    () => data.classes.filter((c) => c.system === "SPHERES_OF_POWER"),
    [data.classes],
  );

  const filteredClasses = useMemo(
    () =>
      spheresClasses.filter((c) => {
        if (groupFilter.length && !groupFilter.includes(c.groupKey)) return false;
        if (babFilter.length && !babFilter.includes(c.babProgression))
          return false;
        if (
          casterFilter.length &&
          !casterFilter.includes(casterTier(c.classData))
        )
          return false;
        return true;
      }),
    [spheresClasses, groupFilter, babFilter, casterFilter],
  );

  // Keep the selection valid when the player goes back and picks Spheres of
  // Power (filters only narrow what's shown, never force a re-pick).
  useEffect(() => {
    if (state.system !== "SPHERES_OF_POWER") return;
    if (
      spheresClasses.length > 0 &&
      !spheresClasses.some((c) => c.name === state.classKey)
    ) {
      const first = spheresClasses[0];
      update({ classKey: first.name, className: first.name, archetype: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.system, spheresClasses]);

  const classOptions = useMemo<PickerOption[]>(
    () =>
      filteredClasses.map((c) => {
        const tier = casterTier(c.classData);
        const badges = [
          `HD d${c.hitDie}`,
          `BAB ${babLabel(c.babProgression)}`,
          `Fort ${saveLabel(c.fortProgression)}`,
          `Ref ${saveLabel(c.refProgression)}`,
          `Will ${saveLabel(c.willProgression)}`,
        ];
        if (tier !== "NONE") badges.push(`Caster ${CASTER_LABEL[tier]}`);
        return {
          value: c.name,
          label: c.name,
          keywords: `${c.group} ${c.description}`,
          badges,
          preview:
            c.description || CLASS_BLURBS[c.name] || `${c.group} class.`,
        };
      }),
    [filteredClasses],
  );

  const filtersActive =
    groupFilter.length > 0 || babFilter.length > 0 || casterFilter.length > 0;

  const archetypes = useMemo(
    () => selectedClass.classData?.archetypes ?? [],
    [selectedClass],
  );
  const archetypeOptions = useMemo<PickerOption[]>(
    () => [
      {
        value: BASE_ARCHETYPE,
        label: "Base class (no archetype)",
        preview: "Play the class as written.",
      },
      ...archetypes.map((a) => ({
        value: a.name,
        label: a.name,
        preview: a.summary || "No summary on file.",
      })),
      {
        value: CUSTOM_ARCHETYPE,
        label: "Custom…",
        preview: "Type an archetype name.",
      },
    ],
    [archetypes],
  );
  const trimmedArchetype = state.archetype.trim();
  const isKnownArchetype = archetypes.some((a) => a.name === trimmedArchetype);
  const archetypeSelected = !trimmedArchetype
    ? BASE_ARCHETYPE
    : isKnownArchetype
      ? trimmedArchetype
      : CUSTOM_ARCHETYPE;

  const fcbEntries = useMemo(() => {
    const all = selectedClass.classData?.favoredClassBonuses ?? [];
    const race = state.race.trim().toLowerCase();
    const rank = (r: string) => {
      const rl = r.toLowerCase();
      if (race && (rl === race || rl.startsWith(race) || race.startsWith(rl)))
        return 0;
      if (rl === "any") return 1;
      return 2;
    };
    return [...all].sort((a, b) => rank(a.race) - rank(b.race));
  }, [selectedClass, state.race]);
  const fcbOptions = useMemo<PickerOption[]>(
    () => [
      { value: "", label: "None", preview: "No flavor bonus recorded." },
      ...fcbEntries.map((f) => {
        const mechanic = parseFavoredClassBonusMechanic(f.bonus);
        return {
          // Keyed by race, not bonus text — two races occasionally share
          // identical bonus wording (e.g. Mountebank's Changeling and
          // Gnome), and bonus text also has to double as the persisted
          // wizard-state value below.
          value: f.race,
          label: f.race,
          keywords: f.bonus,
          preview: f.bonus,
          badges: mechanic
            ? [
                `Every ${mechanic.every} levels`,
                ...(mechanic.spheres.length
                  ? mechanic.spheres.map((s) => `${s} sphere`)
                  : ["talent"]),
              ]
            : undefined,
        };
      }),
    ],
    [fcbEntries],
  );
  // `favoredBonusNote` persists the bonus *text* (what the rest of the app
  // reads), so recover which race is currently picked by matching it back —
  // deterministically the first entry with that text, for the rare case two
  // races share identical wording.
  const fcbSelectedEntry = state.favoredBonusNote
    ? fcbEntries.find((f) => f.bonus === state.favoredBonusNote)
    : null;
  const fcbSelectedValue = fcbSelectedEntry?.race ?? "";
  const fcbLabel = fcbSelectedEntry?.race ?? "None";

  // De-duplicate recurring features (e.g. a talent gained every 2 levels) to
  // one entry, shown at the level it's first gained.
  const uniqueFeatures = useMemo(() => {
    const byName = new Map<string, (typeof selectedClass.features)[number]>();
    for (const f of selectedClass.features) {
      const existing = byName.get(f.name);
      if (!existing || f.level < existing.level) byName.set(f.name, f);
    }
    return [...byName.values()].sort((a, b) => a.level - b.level);
  }, [selectedClass]);

  // Only one collapsible section that has a further step to auto-advance to.
  const sections = useMemo<SectionKey[]>(
    () => (fcbEntries.length > 0 ? ["class", "archetype", "favored"] : ["class", "archetype"]),
    [fcbEntries.length],
  );
  function advanceFrom(key: SectionKey) {
    const idx = sections.indexOf(key);
    setOpenSection(sections[idx + 1] ?? null);
  }
  function toggle(key: SectionKey) {
    setOpenSection((cur) => (cur === key ? null : key));
  }

  function pickClass(v: string) {
    apply(() => ({
      classKey: v,
      className: v,
      archetype: "",
      favoredBonusNote: "",
    }));
    advanceFrom("class");
  }

  function pickArchetype(v: string) {
    if (v === BASE_ARCHETYPE) update({ archetype: "" });
    else if (v === CUSTOM_ARCHETYPE) update({ archetype: " " });
    else update({ archetype: v });
    advanceFrom("archetype");
  }

  function pickFavoredBonus(race: string) {
    const entry = fcbEntries.find((f) => f.race === race);
    update({ favoredBonusNote: entry?.bonus ?? "" });
    advanceFrom("favored");
  }

  if (state.system !== "SPHERES_OF_POWER") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No classes available for Pathfinder 1e right now — Spheres of
            Power only, temporarily. Go back to System and pick Spheres of
            Power to continue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title="Class"
        summary={selectedClass.name}
        open={openSection === "class"}
        onToggle={() => toggle("class")}
      >
        <div className="space-y-4">
          <FieldGroup label="Filter classes">
            <div className="flex flex-wrap items-center gap-2">
              <FacetDropdown
                label="Casting"
                options={CASTER_FACET_OPTIONS}
                selected={casterFilter}
                onChange={setCasterFilter}
              />
              <FacetDropdown
                label="BAB"
                options={BAB_FACET_OPTIONS}
                selected={babFilter}
                onChange={setBabFilter}
              />
              <FacetDropdown
                label="Group"
                options={GROUP_FACET_OPTIONS}
                selected={groupFilter}
                onChange={setGroupFilter}
              />
              {filtersActive && (
                <>
                  <span className="text-muted-foreground text-xs">
                    {filteredClasses.length} of {spheresClasses.length} classes
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGroupFilter([]);
                      setBabFilter([]);
                      setCasterFilter([]);
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          </FieldGroup>

          <OptionPicker
            aria-label="class"
            options={classOptions}
            value={state.classKey}
            onChange={pickClass}
            groupBy={(o) =>
              filteredClasses.find((c) => c.name === o.value)?.group ?? ""
            }
            searchable
            emptyText="No classes match these filters."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class name on the sheet">
              <Input
                value={state.className}
                onChange={(e) => update({ className: e.target.value })}
              />
            </Field>
            <Field
              label="Level"
              hint="Guided choices are generated for each level."
            >
              <Input
                type="number"
                min={1}
                max={20}
                value={state.level}
                onChange={(e) =>
                  update({
                    level: Math.min(
                      20,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </Field>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Archetype"
        summary={trimmedArchetype || "Base class"}
        open={openSection === "archetype"}
        onToggle={() => toggle("archetype")}
      >
        <OptionPicker
          aria-label="archetype"
          options={archetypeOptions}
          value={archetypeSelected}
          onChange={pickArchetype}
        />
        {archetypeSelected === CUSTOM_ARCHETYPE && (
          <Input
            className="mt-2"
            value={trimmedArchetype}
            onChange={(e) => update({ archetype: e.target.value })}
            placeholder="Archetype name"
          />
        )}
      </CollapsibleSection>

      {fcbEntries.length > 0 && (
        <CollapsibleSection
          title="Favored class bonus"
          summary={fcbLabel}
          open={openSection === "favored"}
          onToggle={() => toggle("favored")}
        >
          <p className="text-muted-foreground mb-2 text-sm">
            Recorded for your sheet — not auto-applied to derived stats.
          </p>
          <OptionPicker
            aria-label="favored class bonus"
            options={fcbOptions}
            value={fcbSelectedValue}
            onChange={pickFavoredBonus}
            searchable
          />
        </CollapsibleSection>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{selectedClass.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {selectedClass.description ||
              CLASS_BLURBS[selectedClass.name] ||
              "No description on file."}
          </p>

          {uniqueFeatures.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-medium">Abilities</div>
              <ul className="max-h-64 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                {uniqueFeatures.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span className="font-medium">
                      Lvl {f.level} — {f.name}
                    </span>
                    {f.description ? `: ${f.description}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-1 text-sm font-medium">Stat changes</div>
            <StatBadges
              items={[
                `HD d${selectedClass.hitDie}`,
                `BAB ${babLabel(selectedClass.babProgression)}`,
                `Fort ${saveLabel(selectedClass.fortProgression)}`,
                `Ref ${saveLabel(selectedClass.refProgression)}`,
                `Will ${saveLabel(selectedClass.willProgression)}`,
                ...(casterTier(selectedClass.classData) !== "NONE"
                  ? [`Caster ${CASTER_LABEL[casterTier(selectedClass.classData)]}`]
                  : []),
              ]}
            />
            {trimmedArchetype && (
              <p className="text-muted-foreground mt-2 text-sm">
                Archetype:{" "}
                <span className="text-foreground font-medium">
                  {trimmedArchetype}
                </span>
                {isKnownArchetype
                  ? ` — ${archetypes.find((a) => a.name === trimmedArchetype)?.summary ?? ""}`
                  : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
