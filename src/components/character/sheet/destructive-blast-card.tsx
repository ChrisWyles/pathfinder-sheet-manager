"use client";

import { ChevronRightIcon } from "lucide-react";
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
  destructiveBlastAdmixtureSpellPointCost,
  destructiveBlastAdmixtureSplit,
  destructiveBlastBaseCost,
  destructiveBlastDamageType,
  destructiveBlastDice,
  destructiveBlastSaveDC,
  destructiveBlastSaveType,
  destructiveBlastTypeGroup,
  parseDestructiveBlastConfig,
} from "@/lib/rules/destructive-blast";
import { formatRange } from "@/lib/rules/sphere-range";
import type { DerivedStats } from "@/lib/rules/types";
import { cn } from "@/lib/utils";

import { Stat, sign } from "./stat";
import { StatTooltip } from "./stat-tooltip";
import type { CharacterWithRelations } from "./types";
import { useCharacterRoll } from "../use-character-roll";

type CharacterAction = CharacterWithRelations["actions"][number];

const NONE = "__none__";

/** Cascade Failure (http://spheresofpower.wikidot.com/destruction#toc5):
 * "When a creature receives damage from your destructive blast, it
 * suffers a -1 penalty on all saving throws against your destructive
 * blasts until the end of your next turn. This penalty stacks with
 * itself if a target is damaged by your destructive blast more than once
 * in a round." A passive reminder, not something this app computes
 * (there's no per-target save-penalty tracking) — just surfaced as text
 * when the character has the talent. */
const CASCADE_FAILURE_NOTE =
  "Target creature receives -1 on all saves against your destructive blasts until the end of your next turn. This can stack if hit multiple times in a single turn.";

function titleCase(word: string): string {
  return word[0] + word.slice(1).toLowerCase();
}

/**
 * Destruction sphere's base ability, auto-granted when the sphere is taken
 * (see src/lib/rules/sphere-abilities.ts). Collapsed, the row shows the
 * blast shape/type picks, the boost toggle, and the resolved
 * range/damage/DC/cost, plus a "Cast" popup with the roll buttons — a
 * save-based blast shape (e.g. Sculpt Blast) swaps the touch attack rolls
 * for the computed save DC instead. Expanding the row surfaces a
 * "Description" popup (the base ability text plus whatever the current
 * shape/type picks add) and, below it, every optional Destruction talent
 * that isn't itself a (blast shape) or (blast type) pick — talents with
 * their own configuration, not just flavor text (Admixture today; more
 * get added here as they're modeled). Each only appears once the
 * character has actually taken it.
 */
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
  const [open, setOpen] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
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
  const chosenType2 = blastTypes.find((t) => t.id === config.blastTypeTalentId2);

  const hasAdmixture = destructionTalents.some((t) => t.name === "Admixture");
  const hasCascadeFailure = destructionTalents.some(
    (t) => t.name === "Cascade Failure",
  );
  const admixtureActive = hasAdmixture && config.admixture && !!chosenType2;
  const sameGroup =
    admixtureActive &&
    destructiveBlastTypeGroup(
      chosenType?.talent ? { talentTypes: chosenType.talent.talentTypes } : null,
    ) ===
      destructiveBlastTypeGroup({
        talentTypes: chosenType2!.talent!.talentTypes,
      });

  const casterLevel = derived.totalLevel;
  const { count, sides } = destructiveBlastDice(casterLevel, config.boosted);
  const [count1, count2] = admixtureActive
    ? destructiveBlastAdmixtureSplit(count)
    : [count, 0];
  const damageType = destructiveBlastDamageType(
    chosenType?.talent ? { talentTypes: chosenType.talent.talentTypes } : null,
  );
  const damageType2 = admixtureActive
    ? destructiveBlastDamageType({ talentTypes: chosenType2!.talent!.talentTypes })
    : null;
  const admixtureCost = destructiveBlastAdmixtureSpellPointCost(
    admixtureActive,
    sameGroup,
    config.admixtureExtraSpellPoint,
  );
  const spCost = destructiveBlastBaseCost(config.boosted) + admixtureCost;
  const damageSummary =
    admixtureActive && damageType2
      ? `${count1}d${sides} ${damageType} + ${count2}d${sides} ${damageType2}`
      : `${count}d${sides} ${damageType}`;
  const range = formatRange({ kind: "CLOSE" }, casterLevel);
  const saveType = destructiveBlastSaveType(chosenShape?.name ?? null);
  const castingAbilityMod = character.castingAbility
    ? derived.abilityMods[character.castingAbility]
    : Math.max(derived.abilityMods.INT, derived.abilityMods.WIS, derived.abilityMods.CHA);
  const saveDC = destructiveBlastSaveDC(casterLevel, castingAbilityMod);
  const dcLabel = `DC ${saveDC}${saveType ? ` ${titleCase(saveType)}` : ""}`;

  const shapeItems: Record<string, string> = { [NONE]: "None (standard blast)" };
  for (const t of blastShapes) shapeItems[t.id] = t.name;
  const typeItems: Record<string, string> = { [NONE]: "None (bludgeoning)" };
  for (const t of blastTypes) typeItems[t.id] = t.name;
  const type2Items: Record<string, string> = { [NONE]: "None" };
  for (const t of blastTypes) {
    if (t.id !== config.blastTypeTalentId) type2Items[t.id] = t.name;
  }

  function save(patch: Partial<typeof config>) {
    const next = { ...config, ...patch };
    startSaving(async () => {
      const result = await updateDestructiveBlastConfig({
        characterId: character.id,
        actionId: action.id,
        blastShapeTalentId: next.blastShapeTalentId,
        blastTypeTalentId: next.blastTypeTalentId,
        blastTypeTalentId2: next.blastTypeTalentId2,
        admixture: next.admixture,
        admixtureExtraSpellPoint: next.admixtureExtraSpellPoint,
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
    if (admixtureActive && damageType2) {
      roll({
        type: "custom",
        label: `Destructive Blast damage (${damageType})`,
        dice: `${count1}d${sides}`,
      });
      roll({
        type: "custom",
        label: `Destructive Blast damage (${damageType2})`,
        dice: `${count2}d${sides}`,
      });
      return;
    }
    roll({
      type: "custom",
      label: `Destructive Blast damage (${damageType})`,
      dice: `${count}d${sides}`,
    });
  }

  return (
    <div className="rounded-md border text-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex cursor-pointer flex-wrap items-center gap-1.5 p-2"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="font-medium">{action.name}</span>
        </span>

        <span
          className="flex flex-wrap items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
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

          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {range} · {damageSummary} · {dcLabel} · {spCost} SP
            {admixtureActive && sameGroup ? " (admixture free)" : ""}
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
                  <Stat label="Damage" value={damageSummary} />
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
                  {saveType && <Stat label={`${titleCase(saveType)} DC`} value={saveDC} />}
                </div>

                <div className="flex flex-wrap gap-1.5 border-t pt-3">
                  {saveType ? (
                    <p className="text-muted-foreground text-xs">
                      No attack roll — the target rolls a {dcLabel} save. Just
                      roll damage.
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
        </span>
      </div>

      {open && (
        <div
          className="space-y-3 border-t p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Dialog open={descOpen} onOpenChange={setDescOpen}>
            <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
              Description
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{action.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
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
                {admixtureActive && chosenType2 && (
                  <div className="text-xs">
                    <span className="font-medium">{chosenType2.name}: </span>
                    <span className="text-muted-foreground whitespace-pre-wrap">
                      {chosenType2.talent!.description}
                    </span>
                  </div>
                )}
                {hasCascadeFailure && (
                  <div className="text-xs">
                    <span className="font-medium">Cascade Failure: </span>
                    <span className="text-muted-foreground whitespace-pre-wrap">
                      {CASCADE_FAILURE_NOTE}
                    </span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Optional Destruction talents with their own configuration —
              i.e. anything beyond a plain (blast shape)/(blast type) pick.
              Each block is gated on the character actually having that
              talent; add new ones here the same way as talents get
              modeled. */}
          {hasAdmixture && (
            <div className="space-y-1.5 rounded-md border p-2">
              <div className="text-xs font-medium">Admixture</div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <Checkbox
                    checked={config.admixture}
                    disabled={pending}
                    onCheckedChange={(c) =>
                      save({
                        admixture: c === true,
                        ...(c !== true ? { blastTypeTalentId2: null } : {}),
                      })
                    }
                  />
                  Apply a second blast type
                </label>

                {config.admixture && (
                  <Select
                    items={type2Items}
                    value={config.blastTypeTalentId2 ?? NONE}
                    onValueChange={(v) =>
                      save({ blastTypeTalentId2: v === NONE ? null : v })
                    }
                  >
                    <SelectTrigger size="sm" className="max-w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(type2Items).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {admixtureActive && !sameGroup && (
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <Checkbox
                      checked={config.admixtureExtraSpellPoint}
                      disabled={pending}
                      onCheckedChange={(c) =>
                        save({ admixtureExtraSpellPoint: c === true })
                      }
                    />
                    Pay +1 SP (uncheck: +1 casting time step)
                  </label>
                )}

                {admixtureActive && sameGroup && (
                  <span className="text-muted-foreground text-xs">
                    Free — same blast type group
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
