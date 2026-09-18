"use client";

import { useMemo, useState } from "react";

import { parseRepeatable } from "@/lib/rules/repeatable";

import { FacetDropdown } from "./facet-dropdown";
import { OptionPicker, type PickerOption } from "./option-picker";
import { CollapsibleSection } from "./steps/collapsible-section";
import {
  useWizard,
  type MartialTraditionPick,
  type TalentLite,
} from "./wizard-provider";

const DEFAULT_PICK: MartialTraditionPick = {
  disciplineTalentId: null,
  secondTalentId: null,
  baseSphere: null,
  bonusChoice: null,
  bonusSphere: null,
  bonusTalentId: null,
  bonusEquipmentTalentId: null,
};

const DISCIPLINE_FACETS = [
  { value: "discipline", label: "Discipline" },
  { value: "standard", label: "Non-discipline" },
];

const BONUS_CHOICES: PickerOption[] = [
  {
    value: "sphere",
    label: "An additional base sphere",
    preview: "Gain a second base martial sphere.",
  },
  {
    value: "talent",
    label: "A talent from your base sphere",
    preview: "Gain a bonus talent from the base sphere you picked above.",
  },
  {
    value: "equipment",
    label: "A non-discipline Equipment talent",
    preview: "Gain one more standard (non-discipline) Equipment talent.",
  },
];

function talentOption(t: TalentLite): PickerOption {
  return {
    value: t.id,
    label: t.name,
    keywords: t.description,
    preview: t.description || "No description on file.",
  };
}

/**
 * Inline martial-tradition builder, following the Spheres of Might
 * "Creating New Martial Traditions" guideline: the Equipment sphere is
 * granted automatically, then the player picks an Equipment discipline
 * talent, a second (any) non-legendary Equipment talent, a base martial
 * sphere, and one thematic bonus. Each section is independently
 * collapsible; all start collapsed except the picker above them.
 */
export function MartialTraditionBuilder({ stepId }: { stepId: string }) {
  const { state, data, apply } = useWizard();
  const [secondTalentFilter, setSecondTalentFilter] = useState<string[]>([]);
  // "Your tradition" and "Equipment sphere" auto-expand the moment the
  // builder is opened (this component only mounts once "Build custom …" is
  // picked).
  const [equipmentOpen, setEquipmentOpen] = useState(true);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [secondOpen, setSecondOpen] = useState(false);
  const [baseSphereOpen, setBaseSphereOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const pick = state.customMartialTradition ?? DEFAULT_PICK;

  const equipmentTalents = useMemo(
    () => data.talents.filter((t) => t.sphereName === "Equipment"),
    [data.talents],
  );
  const disciplineTalents = useMemo(
    () => equipmentTalents.filter((t) => t.talentTypes.includes("discipline")),
    [equipmentTalents],
  );
  const standardTalents = useMemo(
    () => equipmentTalents.filter((t) => !t.talentTypes.includes("discipline")),
    [equipmentTalents],
  );

  const baseSphereOptions = useMemo(
    () =>
      [...new Set(data.martialDrawbacks.map((d) => d.sphereName).filter(Boolean))].sort(),
    [data.martialDrawbacks],
  );

  // A talent already used elsewhere in this tradition is excluded from a
  // pool by default — unless it's explicitly repeatable (e.g. Armor
  // Training: "up to two times") and hasn't hit its stated cap yet, in
  // which case it stays pickable again.
  function blockedElsewhere(t: TalentLite, usedCount: number): boolean {
    if (usedCount === 0) return false;
    const repeat = parseRepeatable(t.description, "talent");
    if (!repeat.repeatable) return true;
    return repeat.maxTakes != null && usedCount >= repeat.maxTakes;
  }

  const secondTalentPool = useMemo(
    () =>
      equipmentTalents.filter((t) => {
        const usedCount = t.id === pick.disciplineTalentId ? 1 : 0;
        if (blockedElsewhere(t, usedCount)) return false;
        if (secondTalentFilter.length === 0) return true;
        const isDiscipline = t.talentTypes.includes("discipline");
        return secondTalentFilter.includes(isDiscipline ? "discipline" : "standard");
      }),
    [equipmentTalents, pick.disciplineTalentId, secondTalentFilter],
  );

  const bonusEquipmentPool = useMemo(
    () =>
      standardTalents.filter((t) => {
        const usedCount =
          (t.id === pick.disciplineTalentId ? 1 : 0) +
          (t.id === pick.secondTalentId ? 1 : 0);
        return !blockedElsewhere(t, usedCount);
      }),
    [standardTalents, pick.disciplineTalentId, pick.secondTalentId],
  );

  const bonusSphereOptions = useMemo(
    () => baseSphereOptions.filter((s) => s !== pick.baseSphere),
    [baseSphereOptions, pick.baseSphere],
  );

  // Every talent scraped from the chosen base sphere's own page — the pool
  // for the "talent from your base sphere" bonus.
  const baseSphereTalents = useMemo(
    () => (pick.baseSphere ? data.talents.filter((t) => t.sphereName === pick.baseSphere) : []),
    [data.talents, pick.baseSphere],
  );

  const talentById = (id: string | null) =>
    id ? (data.talents.find((t) => t.id === id) ?? null) : null;

  /** Re-derives every "martial:*" tagged sphere/talent from `next`, replacing
   * whatever was there before, and writes the running choice-summary label —
   * all in one dispatch so the character sheet stays in sync automatically. */
  function commit(patch: Partial<MartialTraditionPick>) {
    apply((s) => {
      const next: MartialTraditionPick = { ...(s.customMartialTradition ?? DEFAULT_PICK), ...patch };

      let spheres = s.spheres.filter((sp) => !sp.key.startsWith("martial:"));
      let talents = s.talents.filter((t) => !t.key.startsWith("martial:"));

      spheres = [...spheres, { key: "martial:equipment-sphere", name: "Equipment" }];

      const discipline = talentById(next.disciplineTalentId);
      if (discipline) {
        talents = [
          ...talents,
          { key: "martial:discipline-talent", name: discipline.name, sphereName: "Equipment" },
        ];
      }
      const second = talentById(next.secondTalentId);
      if (second) {
        talents = [
          ...talents,
          { key: "martial:second-talent", name: second.name, sphereName: "Equipment" },
        ];
      }
      if (next.baseSphere) {
        spheres = [...spheres, { key: "martial:base-sphere", name: next.baseSphere }];
      }
      if (next.bonusChoice === "sphere" && next.bonusSphere) {
        spheres = [...spheres, { key: "martial:bonus-sphere", name: next.bonusSphere }];
      }
      if (next.bonusChoice === "talent" && next.bonusTalentId) {
        const bt = talentById(next.bonusTalentId);
        if (bt) {
          talents = [
            ...talents,
            { key: "martial:bonus-talent", name: bt.name, sphereName: bt.sphereName },
          ];
        }
      }
      if (next.bonusChoice === "equipment" && next.bonusEquipmentTalentId) {
        const bt = equipmentTalents.find((t) => t.id === next.bonusEquipmentTalentId);
        if (bt) {
          talents = [
            ...talents,
            { key: "martial:bonus-equipment-talent", name: bt.name, sphereName: "Equipment" },
          ];
        }
      }

      const bonusTalent = talentById(next.bonusTalentId);
      const parts: string[] = [];
      if (discipline) parts.push(discipline.name);
      if (second) parts.push(second.name);
      if (next.baseSphere) parts.push(`${next.baseSphere} sphere`);
      if (next.bonusChoice === "sphere" && next.bonusSphere)
        parts.push(`+${next.bonusSphere} sphere`);
      if (next.bonusChoice === "talent" && bonusTalent) parts.push(`+${bonusTalent.name}`);
      if (next.bonusChoice === "equipment" && next.bonusEquipmentTalentId) {
        const bt = equipmentTalents.find((t) => t.id === next.bonusEquipmentTalentId);
        if (bt) parts.push(`+${bt.name}`);
      }
      const label = parts.length ? `Custom (${parts.join(", ")})` : "";

      return {
        customMartialTradition: next,
        spheres,
        talents,
        choices: { ...s.choices, [stepId]: label ? [label] : [] },
      };
    });
  }

  const discipline = talentById(pick.disciplineTalentId);
  const second = talentById(pick.secondTalentId);
  const bonusEquipment = talentById(pick.bonusEquipmentTalentId);
  const bonusTalent = talentById(pick.bonusTalentId);

  const summaryLabel = (() => {
    const parts: string[] = [];
    if (discipline) parts.push(discipline.name);
    if (second) parts.push(second.name);
    if (pick.baseSphere) parts.push(`${pick.baseSphere} sphere`);
    if (pick.bonusChoice === "sphere" && pick.bonusSphere) parts.push(`+${pick.bonusSphere}`);
    if (pick.bonusChoice === "talent" && bonusTalent) parts.push(`+${bonusTalent.name}`);
    if (pick.bonusChoice === "equipment" && bonusEquipment) parts.push(`+${bonusEquipment.name}`);
    return parts.length ? parts.join(", ") : undefined;
  })();

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title="Your tradition"
        summary={summaryLabel}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((o) => !o)}
      >
        <ul className="list-inside list-disc text-sm">
          <li>Equipment sphere (automatic)</li>
          <li>
            Discipline talent:{" "}
            {discipline ? discipline.name : <span className="text-muted-foreground">none yet</span>}
          </li>
          <li>
            Second talent:{" "}
            {second ? second.name : <span className="text-muted-foreground">none yet</span>}
          </li>
          <li>
            Base sphere:{" "}
            {pick.baseSphere ?? <span className="text-muted-foreground">none yet</span>}
          </li>
          <li>
            Bonus:{" "}
            {pick.bonusChoice === "sphere" && pick.bonusSphere
              ? `Additional base sphere — ${pick.bonusSphere}`
              : pick.bonusChoice === "talent" && bonusTalent
                ? `Talent from ${pick.baseSphere ?? "base sphere"} — ${bonusTalent.name}`
                : pick.bonusChoice === "equipment" && bonusEquipment
                  ? `Equipment talent — ${bonusEquipment.name}`
                  : <span className="text-muted-foreground">none yet</span>}
          </li>
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        title="Equipment sphere"
        summary="Granted automatically"
        open={equipmentOpen}
        onToggle={() => setEquipmentOpen((o) => !o)}
      >
        <p className="text-muted-foreground text-sm">
          Every martial tradition automatically grants the Equipment sphere —
          it determines the weapons, armor, and other gear your character can
          use. It&apos;s already been added to your Spheres tab.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="Discipline talent"
        summary={discipline?.name}
        open={disciplineOpen}
        onToggle={() => setDisciplineOpen((o) => !o)}
      >
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Gain one Equipment sphere discipline talent — these set the
            weapons, armor, or training style your tradition is built around.
          </p>
          <OptionPicker
            aria-label="discipline talent"
            options={disciplineTalents.map(talentOption)}
            value={pick.disciplineTalentId}
            onChange={(id) => commit({ disciplineTalentId: id })}
            emptyText="No discipline talents on file."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Second Equipment talent"
        summary={second?.name}
        open={secondOpen}
        onToggle={() => setSecondOpen((o) => !o)}
      >
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Gain one additional, non-legendary Equipment sphere talent. This
            can be another discipline talent or a standard one — filter by
            type below. It&apos;s recommended to take an armor- or
            shield-based talent, such as Armor Training or Shield Training,
            if you didn&apos;t already pick one above.
          </p>
          <FacetDropdown
            label="Type"
            options={DISCIPLINE_FACETS}
            selected={secondTalentFilter}
            onChange={setSecondTalentFilter}
          />
          <OptionPicker
            aria-label="second equipment talent"
            options={secondTalentPool.map((t) => ({
              ...talentOption(t),
              badges: t.talentTypes.includes("discipline") ? ["Discipline"] : undefined,
            }))}
            value={pick.secondTalentId}
            onChange={(id) => commit({ secondTalentId: id })}
            emptyText="No talents match this filter."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Base sphere"
        summary={pick.baseSphere ?? undefined}
        open={baseSphereOpen}
        onToggle={() => setBaseSphereOpen((o) => !o)}
      >
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Choose a base martial sphere that fits your tradition&apos;s
            concept — this becomes your primary combat specialty.
          </p>
          <OptionPicker
            aria-label="base sphere"
            options={baseSphereOptions.map((s) => ({ value: s, label: s }))}
            value={pick.baseSphere}
            onChange={(s) =>
              commit({
                baseSphere: s,
                // A stale bonus pick that referenced the old base sphere no
                // longer makes sense — clear it.
                bonusSphere: pick.bonusChoice === "sphere" ? pick.bonusSphere : null,
                bonusTalentId: pick.bonusChoice === "talent" ? null : pick.bonusTalentId,
              })
            }
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Bonus talent"
        summary={
          pick.bonusChoice
            ? BONUS_CHOICES.find((c) => c.value === pick.bonusChoice)?.label
            : undefined
        }
        open={bonusOpen}
        onToggle={() => setBonusOpen((o) => !o)}
      >
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Choose one additional, thematic bonus: a second base sphere, a
            bonus talent from the base sphere you picked above, or a
            non-discipline Equipment talent.
          </p>
          <OptionPicker
            aria-label="bonus type"
            options={BONUS_CHOICES}
            value={pick.bonusChoice}
            onChange={(v) =>
              commit({ bonusChoice: v as MartialTraditionPick["bonusChoice"] })
            }
          />

          {pick.bonusChoice === "sphere" && (
            <OptionPicker
              aria-label="bonus sphere"
              options={bonusSphereOptions.map((s) => ({ value: s, label: s }))}
              value={pick.bonusSphere}
              onChange={(s) => commit({ bonusSphere: s })}
              emptyText="Pick a base sphere above first."
            />
          )}
          {pick.bonusChoice === "talent" && (
            <OptionPicker
              aria-label="bonus talent from base sphere"
              options={baseSphereTalents.map(talentOption)}
              value={pick.bonusTalentId}
              onChange={(id) => commit({ bonusTalentId: id })}
              emptyText={
                pick.baseSphere
                  ? "No talents on file for that sphere."
                  : "Pick a base sphere above first."
              }
            />
          )}
          {pick.bonusChoice === "equipment" && (
            <OptionPicker
              aria-label="bonus equipment talent"
              options={bonusEquipmentPool.map(talentOption)}
              value={pick.bonusEquipmentTalentId}
              onChange={(id) => commit({ bonusEquipmentTalentId: id })}
              emptyText="No non-discipline talents left to pick."
            />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
