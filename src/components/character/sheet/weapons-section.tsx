import { effectiveItemType } from "@/lib/rules/inventory-item";
import type { DerivedStats } from "@/lib/rules/types";

import type { CharacterWithRelations } from "./types";
import { WeaponAttackRow } from "./weapon-attack-row";

export function WeaponsSection({
  character,
  derived,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
}) {
  const weapons = character.inventory.filter(
    (i) => i.equipped && effectiveItemType(i) === "WEAPON",
  );

  if (weapons.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No weapons equipped — equip one from the Equipment tab.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {weapons.map((w) => (
        <WeaponAttackRow
          key={w.id}
          characterId={character.id}
          item={w}
          derived={derived}
        />
      ))}
    </div>
  );
}
