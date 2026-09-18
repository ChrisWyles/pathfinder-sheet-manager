"use client";

import { useState } from "react";

import type { TraditionPreset } from "@/lib/rules/traditions";

import { MartialTraditionBuilder } from "./martial-tradition-builder";
import { OptionPicker, type PickerOption } from "./option-picker";
import { CollapsibleSection } from "./steps/collapsible-section";
import { TraditionBuilder } from "./tradition-builder";
import { useWizard } from "./wizard-provider";

const BUILD = "__build__";

/**
 * Top-level picker for a casting/martial tradition step: a curated preset or
 * "Build custom …", which expands the full builder inline beneath it. Used
 * by the dedicated casting-tradition and martial-tradition wizard pages.
 *
 * The picker itself is the page's first section and starts expanded; the
 * builder's own sections (below) start collapsed — see `TraditionBuilder` /
 * `MartialTraditionBuilder`.
 */
export function TraditionPicker({
  presets,
  value,
  onChange,
  noun,
  stepId,
  kind,
}: {
  presets: TraditionPreset[];
  value: string;
  onChange: (v: string) => void;
  noun: string;
  stepId: string;
  kind: "casting" | "martial";
}) {
  const { state, apply } = useWizard();
  const [pickerOpen, setPickerOpen] = useState(true);
  const buildActive =
    kind === "casting"
      ? state.customCastingTradition != null
      : state.customMartialTradition != null;
  const isPreset = presets.some((p) => p.name === value);
  const selected = buildActive ? BUILD : isPreset ? value : null;
  const options: PickerOption[] = [
    ...presets.map((p) => ({
      value: p.name,
      label: p.name,
      keywords: `${p.summary} ${p.grants}`,
      preview: (
        <>
          {p.summary}
          <span className="mt-0.5 block italic">{p.grants}</span>
        </>
      ),
    })),
    {
      value: BUILD,
      label: `Build custom ${noun}…`,
      preview:
        kind === "casting"
          ? "Pick real drawbacks and boons from the Spheres of Power rules."
          : "Gain the Equipment sphere, two Equipment talents, a base sphere, and a bonus.",
    },
  ];

  function pick(v: string) {
    if (v === BUILD) {
      const alreadyBuilding =
        kind === "casting" ? state.customCastingTradition : state.customMartialTradition;
      if (!alreadyBuilding) {
        // Collapse this picker in favor of the builder's own sections below
        // (it auto-expands "Your tradition" and "Equipment sphere").
        setPickerOpen(false);
      }
      apply((s) => {
        if (kind === "casting") {
          return {
            customCastingTradition: s.customCastingTradition ?? {
              drawbackIds: [],
              boonIds: [],
              sphereDrawbackIds: [],
            },
          };
        }
        if (s.customMartialTradition) return {};
        // Martial traditions always grant the Equipment sphere the moment
        // building starts.
        return {
          customMartialTradition: {
            disciplineTalentId: null,
            secondTalentId: null,
            baseSphere: null,
            bonusChoice: null,
            bonusSphere: null,
            bonusTalentId: null,
            bonusEquipmentTalentId: null,
          },
          spheres: [
            ...s.spheres,
            { key: "martial:equipment-sphere", name: "Equipment" },
          ],
        };
      });
      return;
    }
    if (buildActive) {
      apply((s) =>
        kind === "casting"
          ? { customCastingTradition: null }
          : {
              customMartialTradition: null,
              spheres: s.spheres.filter((sp) => !sp.key.startsWith("martial:")),
              talents: s.talents.filter((t) => !t.key.startsWith("martial:")),
            },
      );
    }
    onChange(v);
  }

  const summary = buildActive
    ? "Building a custom tradition"
    : isPreset
      ? value
      : undefined;

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title={`Choose a ${noun}`}
        summary={summary}
        open={pickerOpen}
        onToggle={() => setPickerOpen((o) => !o)}
      >
        <OptionPicker
          aria-label={noun}
          options={options}
          value={selected}
          onChange={pick}
        />
      </CollapsibleSection>
      {buildActive &&
        (kind === "casting" ? (
          <TraditionBuilder stepId={stepId} />
        ) : (
          <MartialTraditionBuilder stepId={stepId} />
        ))}
    </div>
  );
}
