"use client";

import { useMemo, useState } from "react";

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
import {
  classifyTalentStepTitle,
  type TalentStepBucket,
} from "@/lib/rules/class-creation-steps";
import { parseRepeatable } from "@/lib/rules/repeatable";
import { allocateTalentSpend, type SpendBucket } from "@/lib/rules/talent-spend";

import { useWizard } from "../wizard-provider";
import { FacetDropdown } from "../facet-dropdown";
import { OptionPicker, type PickerOption } from "../option-picker";
import { FieldGroup } from "./field";

const BUCKET_LABEL: Record<TalentStepBucket, string> = {
  combat: "Combat talents",
  magic: "Magic talents",
  flex: "Flex talents",
  other: "Talents",
};
const BUCKET_ORDER: TalentStepBucket[] = ["combat", "magic", "flex", "other"];

/**
 * Gaining a sphere costs a talent of the matching type, same as picking a
 * talent from within it (2 magic talents buys the Destruction sphere + one
 * blast-type talent, say) — so a sphere's own type determines which spend
 * bucket it (and every talent picked from it) draws from. Guile spheres
 * have their own separate economy this app doesn't model, so they're
 * simply never costed here.
 */
function sphereCostBucket(
  sphereName: string,
  sphereTypeByName: Map<string, string>,
): SpendBucket | null {
  const type = sphereTypeByName.get(sphereName.trim().toLowerCase());
  if (type === "MAGIC") return "magic";
  if (type === "MIGHT") return "combat";
  return null;
}

/**
 * A sphere/talent tagged with one of these key prefixes was granted
 * automatically by another wizard step (a martial tradition's Equipment
 * sphere and its talents, a casting-tradition boon's grant, or a
 * sphere-specific drawback's bonus talent) — see tradition-picker.tsx,
 * tradition-builder.tsx and martial-tradition-builder.tsx, which are the
 * only places that write these prefixes. Shown read-only here, separate
 * from what you actively pick on this page, so the two don't get confused.
 */
function isGrantedKey(key: string): boolean {
  return (
    key.startsWith("martial:") ||
    key.startsWith("boon:") ||
    key.startsWith("sphere-drawback:")
  );
}

function originLabel(key: string): string {
  if (key.startsWith("martial:")) return "martial tradition";
  if (key.startsWith("boon:")) return "casting tradition boon";
  if (key.startsWith("sphere-drawback:")) return "sphere-specific drawback";
  return "";
}

export function SpheresStep() {
  const { state, data, stepPlan, apply } = useWizard();
  const [talentSphereFilter, setTalentSphereFilter] = useState<string[]>([]);
  const [customSphereName, setCustomSphereName] = useState("");
  const [customTalentName, setCustomTalentName] = useState("");
  const [customTalentSphere, setCustomTalentSphere] = useState("");

  const suggested = useMemo(() => {
    let talents = 0;
    let spheres = 0;
    for (const s of stepPlan) {
      if (s.kind === "pick-talent") talents += s.count;
      if (s.kind === "pick-sphere") spheres += s.count;
    }
    return { talents, spheres };
  }, [stepPlan]);

  const tradedFeatSlotCount = state.feats.filter(
    (f) => f.tradedFor === "magic" || f.tradedFor === "combat",
  ).length;

  const grantedSpheres = useMemo(
    () => state.spheres.filter((sp) => isGrantedKey(sp.key)),
    [state.spheres],
  );
  const manualSpheres = useMemo(
    () => state.spheres.filter((sp) => !isGrantedKey(sp.key)),
    [state.spheres],
  );
  const grantedTalents = useMemo(
    () => state.talents.filter((t) => isGrantedKey(t.key)),
    [state.talents],
  );
  const manualTalents = useMemo(
    () => state.talents.filter((t) => !isGrantedKey(t.key)),
    [state.talents],
  );

  // Each pick-talent step's `count` expands into that many ordered slots,
  // tagged with its bucket — mirroring how the feats step maps
  // state.feats[i] to stepPlan slot i positionally. Only your own picks
  // (not granted talents, which aren't part of this class-level pool) fill
  // these; picks beyond the slot count are "extra" and don't count. A feat
  // slot traded for a talent (feats-step.tsx) adds one more slot of the
  // matching type, per the SoP "trade a bonus feat for a talent" rule.
  const talentSlotBuckets = useMemo(() => {
    const slots: TalentStepBucket[] = [];
    for (const s of stepPlan) {
      if (s.kind !== "pick-talent") continue;
      const bucket = classifyTalentStepTitle(s.title);
      for (let i = 0; i < s.count; i++) slots.push(bucket);
    }
    for (const f of state.feats) {
      if (f.tradedFor === "magic" || f.tradedFor === "combat") {
        slots.push(f.tradedFor);
      }
    }
    return slots;
  }, [stepPlan, state.feats]);

  const talentCounts = useMemo(() => {
    const total: Record<TalentStepBucket, number> = {
      combat: 0,
      magic: 0,
      flex: 0,
      other: 0,
    };
    const filled: Record<TalentStepBucket, number> = {
      combat: 0,
      magic: 0,
      flex: 0,
      other: 0,
    };
    talentSlotBuckets.forEach((bucket, i) => {
      total[bucket]++;
      if (manualTalents[i]?.name.trim()) filled[bucket]++;
    });
    return { total, filled };
  }, [talentSlotBuckets, manualTalents]);

  const sphereByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of data.spheres) m.set(s.name.toLowerCase(), s.id);
    return m;
  }, [data.spheres]);
  const sphereTypeByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of data.spheres) m.set(s.name.toLowerCase(), s.type);
    return m;
  }, [data.spheres]);

  // Every manually-added sphere, plus every manually-picked talent (via its
  // own sphere), spends one talent of the matching type — see
  // sphereCostBucket. Spend order is specific-type slots first, then flex.
  const spend = useMemo(() => {
    const items: SpendBucket[] = [];
    for (const sp of manualSpheres) {
      const bucket = sphereCostBucket(sp.name, sphereTypeByName);
      if (bucket) items.push(bucket);
    }
    for (const t of manualTalents) {
      const bucket = sphereCostBucket(t.sphereName, sphereTypeByName);
      if (bucket) items.push(bucket);
    }
    return allocateTalentSpend(items, {
      combat: talentCounts.total.combat,
      magic: talentCounts.total.magic,
      flex: talentCounts.total.flex,
    });
  }, [manualSpheres, manualTalents, sphereTypeByName, talentCounts.total]);
  const talentByName = useMemo(() => {
    const m = new Map<string, (typeof data.talents)[number]>();
    for (const t of data.talents) m.set(t.name.toLowerCase(), t);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.talents]);

  // Every sphere the character currently has, granted or picked — this is
  // what gates which talents are even offered below.
  const knownSphereNames = useMemo(
    () => new Set(state.spheres.map((sp) => sp.name.trim().toLowerCase())),
    [state.spheres],
  );
  const knownSphereList = useMemo(
    () => [...new Set(state.spheres.map((sp) => sp.name.trim()).filter(Boolean))].sort(),
    [state.spheres],
  );

  const manualSphereNames = manualSpheres.map((sp) => sp.name);
  const grantedSphereNameSet = useMemo(
    () => new Set(grantedSpheres.map((sp) => sp.name.trim().toLowerCase())),
    [grantedSpheres],
  );

  const sphereOptions = useMemo<PickerOption[]>(
    () =>
      data.spheres
        .filter((s) => !grantedSphereNameSet.has(s.name.toLowerCase()))
        .map((s) => ({
          value: s.name,
          label: s.name,
          keywords: `${s.type} ${s.description}`,
          badges: [s.type.toLowerCase()],
          preview: s.description || "No description on file.",
        })),
    [data.spheres, grantedSphereNameSet],
  );

  function setManualSphereNames(nextNames: string[]) {
    apply((s) => {
      const granted = s.spheres.filter((sp) => isGrantedKey(sp.key));
      const kept = s.spheres.filter(
        (sp) => !isGrantedKey(sp.key) && nextNames.includes(sp.name),
      );
      const keptNames = new Set(kept.map((sp) => sp.name));
      const added = nextNames
        .filter((n) => !keptNames.has(n))
        .map((n) => ({
          key: `sphere:${n}`,
          name: n,
          sphereId: sphereByName.get(n.toLowerCase()),
        }));
      const nextSpheres = [...granted, ...kept, ...added];
      const nextKnown = new Set(
        nextSpheres.map((sp) => sp.name.trim().toLowerCase()),
      );
      // A talent you picked for a sphere you just un-checked above isn't
      // yours anymore either — drop it rather than leave it selected but
      // invisible (filtered out of the talent list below).
      const talents = s.talents.filter(
        (t) => isGrantedKey(t.key) || nextKnown.has(t.sphereName.trim().toLowerCase()),
      );
      return { spheres: nextSpheres, talents };
    });
  }

  function addCustomSphere() {
    const name = customSphereName.trim();
    if (!name || knownSphereNames.has(name.toLowerCase())) return;
    apply((s) => ({
      spheres: [
        ...s.spheres,
        { key: `sphere:${name}`, name, sphereId: sphereByName.get(name.toLowerCase()) },
      ],
    }));
    setCustomSphereName("");
  }

  const grantedTalentNameSet = useMemo(
    () => new Set(grantedTalents.map((t) => t.name.trim().toLowerCase())),
    [grantedTalents],
  );

  // Talents are only ever offered for a sphere you already have — no
  // browsing the full catalog of every sphere's talents at once.
  const availableTalents = useMemo(
    () =>
      data.talents.filter(
        (t) =>
          knownSphereNames.has(t.sphereName.trim().toLowerCase()) &&
          !grantedTalentNameSet.has(t.name.toLowerCase()),
      ),
    [data.talents, knownSphereNames, grantedTalentNameSet],
  );

  const talentSphereFacets = useMemo(
    () =>
      [...new Set(availableTalents.map((t) => t.sphereName))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    [availableTalents],
  );

  const filteredTalents = useMemo(
    () =>
      talentSphereFilter.length === 0
        ? availableTalents
        : availableTalents.filter((t) => talentSphereFilter.includes(t.sphereName)),
    [availableTalents, talentSphereFilter],
  );

  const talentOptions = useMemo<PickerOption[]>(
    () =>
      filteredTalents.map((t) => ({
        value: t.name,
        label: t.name,
        keywords: `${t.sphereName} ${t.description}`,
        badges: [t.sphereName, ...t.talentTypes],
        preview: t.description || "No description on file.",
        href: t.sourceUrl || undefined,
      })),
    [filteredTalents],
  );

  const manualTalentNames = manualTalents.map((t) => t.name);

  function setManualTalentNames(nextNames: string[]) {
    apply((s) => {
      const granted = s.talents.filter((t) => isGrantedKey(t.key));
      const kept = s.talents.filter(
        (t) => !isGrantedKey(t.key) && nextNames.includes(t.name),
      );
      const keptNames = new Set(kept.map((t) => t.name));
      const added = nextNames
        .filter((n) => !keptNames.has(n))
        .map((n) => {
          const match = talentByName.get(n.toLowerCase());
          return {
            key: `talent:${n}`,
            name: n,
            talentId: match?.id,
            sphereName: match?.sphereName ?? "",
          };
        });
      return { talents: [...granted, ...kept, ...added] };
    });
  }

  function addCustomTalent() {
    const name = customTalentName.trim();
    const sphereName = customTalentSphere.trim();
    if (!name || !sphereName) return;
    const already = state.talents.some(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (already) return;
    apply((s) => ({
      talents: [
        ...s.talents,
        {
          key: `talent:${name}`,
          name,
          sphereName,
          talentId: talentByName.get(name.toLowerCase())?.id,
        },
      ],
    }));
    setCustomTalentName("");
  }

  // Grouped view of your manual talents, one row per distinct name, so a
  // repeatable talent (e.g. Armor Training: "up to two times") can show a
  // count and a stepper — the picker above only tracks "have it or not",
  // it can't represent taking the same talent more than once.
  const manualTalentGroups = useMemo(() => {
    const byName = new Map<
      string,
      { name: string; sphereName: string; count: number }
    >();
    for (const t of manualTalents) {
      const key = t.name.toLowerCase();
      const g = byName.get(key) ?? { name: t.name, sphereName: t.sphereName, count: 0 };
      g.count++;
      byName.set(key, g);
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [manualTalents]);

  function incrementTalent(name: string) {
    const match = talentByName.get(name.toLowerCase());
    apply((s) => ({
      talents: [
        ...s.talents,
        {
          key: `talent:${name}:${Date.now()}`,
          name,
          talentId: match?.id,
          sphereName: match?.sphereName ?? "",
        },
      ],
    }));
  }

  function decrementTalent(name: string) {
    apply((s) => {
      const idx = s.talents.findLastIndex(
        (t) => !isGrantedKey(t.key) && t.name.toLowerCase() === name.toLowerCase(),
      );
      if (idx === -1) return {};
      return { talents: s.talents.filter((_, i) => i !== idx) };
    });
  }

  function removeAllTalent(name: string) {
    apply((s) => ({
      talents: s.talents.filter(
        (t) => isGrantedKey(t.key) || t.name.toLowerCase() !== name.toLowerCase(),
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Spheres &amp; talents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            This build suggests {suggested.talents} talent
            {suggested.talents === 1 ? "" : "s"}
            {suggested.spheres
              ? ` and ${suggested.spheres} sphere${suggested.spheres === 1 ? "" : "s"}`
              : ""}{" "}
            at your current level — including the 2 free starting magic
            talents every spherecaster gets at 1st level, if this class casts.
            Counts aren&apos;t enforced.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            {suggested.spheres > 0 && (
              <span>
                Spheres: {manualSpheres.length} of {suggested.spheres}
              </span>
            )}
            {BUCKET_ORDER.filter((b) => talentCounts.total[b] > 0).map((b) => {
              const filledForBucket =
                b === "flex"
                  ? spend.flexUsed
                  : b === "other"
                    ? talentCounts.filled.other
                    : spend.specificUsed[b];
              return (
                <span key={b}>
                  {BUCKET_LABEL[b]}: {filledForBucket} of {talentCounts.total[b]}
                </span>
              );
            })}
          </div>
          {spend.overBudget > 0 && (
            <p className="text-destructive text-xs">
              {spend.overBudget} sphere/talent pick
              {spend.overBudget === 1 ? "" : "s"} more than you have talents
              for — a sphere costs a talent of its type, same as a talent
              from within it.
            </p>
          )}
          {tradedFeatSlotCount > 0 && (
            <p className="text-muted-foreground text-xs">
              Includes {tradedFeatSlotCount} talent slot
              {tradedFeatSlotCount === 1 ? "" : "s"} traded from a bonus feat
              on the Feats step.
            </p>
          )}
        </CardContent>
      </Card>

      {(grantedSpheres.length > 0 || grantedTalents.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Granted automatically</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Already yours from choices made on earlier steps — nothing to do
              here, shown for reference only.
            </p>
            <ul className="space-y-1 text-sm">
              {[...grantedSpheres, ...grantedTalents].map((g) => (
                <li key={g.key} className="flex items-center gap-2">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted-foreground text-xs">
                    from {originLabel(g.key)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spheres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Add every sphere you know. Talents below only show up once their
            sphere is added here.
          </p>
          <OptionPicker
            multiple
            aria-label="spheres"
            options={sphereOptions}
            value={manualSphereNames}
            onChange={setManualSphereNames}
            emptyText="No spheres match your search."
          />
          <div className="flex gap-2">
            <Input
              value={customSphereName}
              placeholder="Sphere not in the list…"
              onChange={(e) => setCustomSphereName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSphere();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustomSphere}
              disabled={!customSphereName.trim()}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Talents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {knownSphereList.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Add a sphere above to see its talents here.
            </p>
          ) : (
            <>
              {talentSphereFacets.length > 1 && (
                <FieldGroup label="Filter talents">
                  <FacetDropdown
                    label="Sphere"
                    options={talentSphereFacets}
                    selected={talentSphereFilter}
                    onChange={setTalentSphereFilter}
                  />
                </FieldGroup>
              )}
              <OptionPicker
                multiple
                aria-label="talents"
                options={talentOptions}
                value={manualTalentNames}
                onChange={setManualTalentNames}
                groupBy={(o) =>
                  talentByName.get(o.value.toLowerCase())?.sphereName ?? ""
                }
                emptyText="No talents match these filters."
              />

              {manualTalentGroups.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-sm font-medium">Your talents</div>
                  <ul className="space-y-1.5">
                    {manualTalentGroups.map((g) => {
                      const repeat = parseRepeatable(
                        talentByName.get(g.name.toLowerCase())?.description ?? "",
                        "talent",
                      );
                      const atMax =
                        repeat.maxTakes != null && g.count >= repeat.maxTakes;
                      return (
                        <li
                          key={g.name}
                          className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                        >
                          <span>
                            <span className="font-medium">{g.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {g.sphereName}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            {repeat.repeatable && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => decrementTalent(g.name)}
                                >
                                  −
                                </Button>
                                <span className="w-5 text-center tabular-nums">
                                  {g.count}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => incrementTalent(g.name)}
                                  disabled={atMax}
                                >
                                  +
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAllTalent(g.name)}
                            >
                              Remove
                            </Button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Input
                  className="flex-1"
                  value={customTalentName}
                  placeholder="Talent not in the list…"
                  onChange={(e) => setCustomTalentName(e.target.value)}
                />
                <Select
                  value={customTalentSphere}
                  onValueChange={(v) => v && setCustomTalentSphere(v)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sphere" />
                  </SelectTrigger>
                  <SelectContent>
                    {knownSphereList.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomTalent}
                  disabled={!customTalentName.trim() || !customTalentSphere.trim()}
                >
                  Add
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
