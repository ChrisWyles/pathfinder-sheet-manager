"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DerivedStats } from "@/lib/rules/types";

import { CombatManeuverDialog } from "./combat-maneuver-dialog";
import type { CharacterWithRelations } from "./types";
import { WeaponsSection } from "./weapons-section";
import { useCharacterRoll } from "../use-character-roll";

const SAVE_LABEL = { fort: "Fortitude", ref: "Reflex", will: "Will" } as const;

export function CombatTab({
  character,
  derived,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
}) {
  const { roll, pending } = useCharacterRoll(character.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Card size="sm" className="min-w-[160px] flex-1">
          <CardHeader>
            <CardTitle>Initiative</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => roll({ type: "initiative" })}
            >
              Roll Initiative
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="min-w-[260px] flex-[2]">
          <CardHeader>
            <CardTitle>Saves</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(["fort", "ref", "will"] as const).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => roll({ type: "save", save: s })}
              >
                {SAVE_LABEL[s]}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card size="sm" className="min-w-[200px] flex-1">
          <CardHeader>
            <CardTitle>Combat Maneuvers</CardTitle>
          </CardHeader>
          <CardContent>
            <CombatManeuverDialog character={character} derived={derived} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weapons</CardTitle>
        </CardHeader>
        <CardContent>
          <WeaponsSection character={character} derived={derived} />
        </CardContent>
      </Card>
    </div>
  );
}
