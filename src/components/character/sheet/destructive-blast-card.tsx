"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateDestructiveBlastConfig } from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  destructiveBlastBaseCost,
  destructiveBlastDamageType,
  destructiveBlastDice,
  destructiveBlastSaveDC,
  destructiveBlastSaveType,
  parseDestructiveBlastConfig,
} from "@/lib/rules/destructive-blast";
import { formatRange } from "@/lib/rules/sphere-range";
import type { DerivedStats } from "@/lib/rules/types";

import { Stat, sign } from "./stat";
import { StatTooltip } from "./stat-tooltip";
import type { CharacterWithRelations } from "./types";
import { useCharacterRoll } from "../use-character-roll";

type CharacterAction = CharacterWithRelations["actions"][number];

const NONE = "__none__";

/** Destruction sphere's base ability, auto-granted when the sphere is
 * taken (see src/lib/rules/sphere-abilities.ts). A compact bar picks one
 * known blast shape talent and one known blast type talent (the sphere's
 * own rule: at most one of each applies to a given blast); "Cast" opens a
 * popup with the full resolved details and the actual roll buttons — a
 * save-based blast shape (e.g. Sculpt Blast) swaps the touch attack rolls
 * for the computed save DC instead. */
export function DestructiveBlastCard({
  character,
  derived,
  action,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
  action: CharacterAction;
}) {
  const config = parseDestructiveBlastConfig(action.sphereConfig);
  const [castOpen, setCastOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const { roll, pending: rollPending } = useCharacterRoll(character.id);
  const pending = saving || rollPending;

  const destructionTalents = character.talents.filter(
    (t) => t.sphereName === "Destruction" && t.talent,
  );
  const blastShapes = destructionTalents.filter((t) =>
    t.talent!.talentTypes.includes("blast shape"),
  );
  const blastTypes = destructionTalents.filter((t) =>
    t.talent!.talentTypes.includes("blast type"),
  );

  const chosenShape = blastShapes.find(
    (t) => t.id === config.blastShapeTalentId,
  );
  const chosenType = blastTypes.find((t) => t.id === config.blastTypeTalentId);

  const casterLevel = derived.totalLevel;
  const { count, sides } = destructiveBlastDice(casterLevel, config.boosted);
  const damageType = destructiveBlastDamageType(
    chosenType?.talent ? { talentTypes: chosenType.talent.talentTypes } : null,
  );
  const spCost = destructiveBlastBaseCost(config.boosted);
  const range = formatRange({ kind: "CLOSE" }, casterLevel);
  const saveType = destructiveBlastSaveType(chosenShape?.name ?? null);
  const castingAbilityMod = character.castingAbility
    ? derived.abilityMods[character.castingAbility]
    : Math.max(derived.abilityMods.INT, derived.abilityMods.WIS, derived.abilityMods.CHA);
  const saveDC = destructiveBlastSaveDC(casterLevel, castingAbilityMod);

  const shapeItems: Record<string, string> = { [NONE]: "None (standard blast)" };
  for (const t of blastShapes) shapeItems[t.id] = t.name;
  const typeItems: Record<string, string> = { [NONE]: "None (bludgeoning)" };
  for (const t of blastTypes) typeItems[t.id] = t.name;

  function save(patch: Partial<typeof config>) {
    const next = { ...config, ...patch };
    startSaving(async () => {
      const result = await updateDestructiveBlastConfig({
        characterId: character.id,
        actionId: action.id,
        blastShapeTalentId: next.blastShapeTalentId,
        blastTypeTalentId: next.blastTypeTalentId,
        boosted: next.boosted,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function rollAttack(which: "melee" | "ranged") {
    roll({
      type: "attack",
      which,
      weaponName: `Destructive Blast (${which} touch)`,
    });
  }

  function rollDamage() {
    roll({
      type: "custom",
      label: `Destructive Blast damage (${damageType})`,
      dice: `${count}d${sides}`,
    });
  }

  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium">{action.name}</span>

        <Select
          items={shapeItems}
          value={config.blastShapeTalentId ?? NONE}
          onValueChange={(v) =>
            save({ blastShapeTalentId: v === NONE ? null : v })
          }
        >
          <SelectTrigger size="sm" className="max-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(shapeItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={typeItems}
          value={config.blastTypeTalentId ?? NONE}
          onValueChange={(v) =>
            save({ blastTypeTalentId: v === NONE ? null : v })
          }
        >
          <SelectTrigger size="sm" className="max-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
          <Checkbox
            checked={config.boosted}
            disabled={pending}
            onCheckedChange={(c) => save({ boosted: c === true })}
          />
          Boost (+1 SP)
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {range} · {count}d{sides} {damageType}
          {saveType ? ` · DC ${saveDC} ${saveType[0]}${saveType.slice(1).toLowerCase()}` : ""}
          {" · "}
          {spCost} SP
        </span>

        <Dialog open={castOpen} onOpenChange={setCastOpen}>
          <DialogTrigger render={<Button type="button" size="xs" variant="outline" />}>
            Cast
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{action.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1.5">
                <Stat label="Range" value={range} />
                <Stat label="Damage" value={`${count}d${sides} ${damageType}`} />
                <Stat label="Spell cost" value={`${spCost} SP`} />
                {!saveType && (
                  <>
                    <StatTooltip
                      lines={derived.breakdowns.meleeAttack}
                      total={derived.meleeAttack}
                    >
                      <Stat label="Melee touch" value={sign(derived.meleeAttack)} />
                    </StatTooltip>
                    <StatTooltip
                      lines={derived.breakdowns.rangedAttack}
                      total={derived.rangedAttack}
                    >
                      <Stat label="Ranged touch" value={sign(derived.rangedAttack)} />
                    </StatTooltip>
                  </>
                )}
                {saveType && (
                  <Stat
                    label={`${saveType[0]}${saveType.slice(1).toLowerCase()} DC`}
                    value={saveDC}
                  />
                )}
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {action.description}
              </p>
              {chosenShape && (
                <div className="text-xs">
                  <span className="font-medium">{chosenShape.name}: </span>
                  <span className="text-muted-foreground whitespace-pre-wrap">
                    {chosenShape.talent!.description}
                  </span>
                </div>
              )}
              {chosenType && (
                <div className="text-xs">
                  <span className="font-medium">{chosenType.name}: </span>
                  <span className="text-muted-foreground whitespace-pre-wrap">
                    {chosenType.talent!.description}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 border-t pt-3">
                {saveType ? (
                  <p className="text-muted-foreground text-xs">
                    No attack roll — the target rolls a DC {saveDC} {saveType[0]}
                    {saveType.slice(1).toLowerCase()} save. Just roll damage.
                  </p>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => rollAttack("melee")}
                    >
                      Melee Touch Attack
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => rollAttack("ranged")}
                    >
                      Ranged Touch Attack
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={rollDamage}
                >
                  Damage
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
