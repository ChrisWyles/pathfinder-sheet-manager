"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  attackIterationOffsets,
  damageExpression,
  isCriticalThreat,
} from "@/lib/dice/weapon-attack";
import { formatCritical, resolveItemStats } from "@/lib/rules/inventory-item";
import type { DerivedStats } from "@/lib/rules/types";

import { Stat, sign } from "./stat";
import { StatTooltip } from "./stat-tooltip";
import type { CharacterWithRelations } from "./types";
import { useCharacterRoll } from "../use-character-roll";

type InventoryItem = CharacterWithRelations["inventory"][number];

/** One equipped weapon's stat line plus Attack / Full Attack buttons.
 *
 * Attack: one roll at the character's full (unreduced) attack bonus, then
 * an automatic damage roll — doubled/tripled/etc. if the natural d20
 * landed in the weapon's threat range.
 *
 * Full Attack: one roll per iterative in the BAB sequence (1-4, each 5
 * lower than the last), each immediately followed by its own damage roll
 * with the same crit handling. */
export function WeaponAttackRow({
  characterId,
  item,
  derived,
}: {
  characterId: string;
  item: InventoryItem;
  derived: DerivedStats;
}) {
  const { roll, pending: rollPending } = useCharacterRoll(characterId);
  const [busy, setBusy] = useState<"single" | "full" | null>(null);

  const stats = resolveItemStats(item);
  const isRanged = stats.rangeIncrement != null;
  const which = isRanged ? "ranged" : "melee";
  const abilityMod = isRanged ? 0 : derived.abilityMods.STR;
  const attackCount = derived.attackSequence.length;
  const critical = formatCritical(stats.critRange, stats.critMultiplier);
  const attackBonus = isRanged ? derived.rangedAttack : derived.meleeAttack;
  const attackBreakdown = isRanged
    ? derived.breakdowns.rangedAttack
    : derived.breakdowns.meleeAttack;

  async function fireAttackAndDamage(
    situational: { source: string; value: number }[],
    label: string,
  ) {
    const attack = await roll({
      type: "attack",
      which,
      weaponName: label,
      situational,
    });
    if (!attack || !stats.damage) return;

    const natural = attack.result.dice[0];
    const isCrit = isCriticalThreat(natural, stats.critRange);
    const dice = damageExpression(
      stats.damage,
      abilityMod,
      isCrit,
      stats.critMultiplier,
    );
    await roll({
      type: "custom",
      label: `${item.name} damage${isCrit ? " (crit!)" : ""}`,
      dice,
    });
  }

  async function attackOnce() {
    setBusy("single");
    await fireAttackAndDamage([], `${item.name} attack`);
    setBusy(null);
  }

  async function fullAttack() {
    setBusy("full");
    const offsets = attackIterationOffsets(attackCount);
    for (let i = 0; i < offsets.length; i++) {
      const situational =
        offsets[i] === 0
          ? []
          : [{ source: "Iterative", value: offsets[i] }];
      await fireAttackAndDamage(
        situational,
        `${item.name} attack ${i + 1}/${offsets.length}`,
      );
    }
    setBusy(null);
  }

  const disabled = rollPending || busy !== null;

  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{item.name}</span>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={attackOnce}
          >
            {busy === "single" ? "Rolling…" : "Attack"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={fullAttack}
          >
            {busy === "full" ? "Rolling…" : "Full Attack"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatTooltip lines={attackBreakdown} total={attackBonus}>
          <Stat label="Attack bonus" value={sign(attackBonus)} />
        </StatTooltip>
        {stats.damage && <Stat label="Damage" value={stats.damage} />}
        {critical && <Stat label="Crit" value={critical} />}
        <Stat
          label="Range"
          value={isRanged ? `${stats.rangeIncrement} ft.` : "Melee"}
        />
        {stats.special && <Stat label="Special" value={stats.special} />}
      </div>
    </div>
  );
}
