import type { DerivedStats } from "@/lib/rules/types";

import { ActionRow } from "./action-row";
import { CustomActionDialog } from "./custom-action-dialog";
import { DestructiveBlastCard } from "./destructive-blast-card";
import type { CharacterWithRelations } from "./types";

export function ActionsSection({
  character,
  derived,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
}) {
  const featNameById = new Map(character.feats.map((f) => [f.id, f.name]));
  const talentNameById = new Map(character.talents.map((t) => [t.id, t.name]));
  const levels = {
    totalLevel: derived.totalLevel,
    classLevels: Object.fromEntries(
      character.classes.map((c) => [c.name, c.levels]),
    ),
  };

  return (
    <div className="space-y-2">
      <CustomActionDialog character={character} />

      {character.actions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No actions added yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {character.actions.map((a) => {
            if (a.sphereName === "Destruction") {
              return (
                <DestructiveBlastCard
                  key={a.id}
                  character={character}
                  derived={derived}
                  action={a}
                />
              );
            }
            const linkedNames = [
              ...a.linkedFeatIds.map((id) => featNameById.get(id)),
              ...a.linkedTalentIds.map((id) => talentNameById.get(id)),
            ].filter((n): n is string => !!n);
            return (
              <ActionRow
                key={a.id}
                characterId={character.id}
                action={a}
                linkedNames={linkedNames}
                levels={levels}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
