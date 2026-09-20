"use client";

import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  COMBAT_MANEUVERS,
  COMBAT_MANEUVERS_OVERVIEW,
  resolveManeuverFeat,
  type CombatManeuver,
} from "@/lib/rules/combat-maneuvers";
import { findSkillTotal } from "@/lib/rules/skills";
import type { DerivedStats } from "@/lib/rules/types";
import { cn } from "@/lib/utils";

import { Stat, sign } from "./stat";
import type { CharacterWithRelations } from "./types";
import { useCharacterRoll, type RollIntent } from "../use-character-roll";

function ManeuverRow({
  character,
  maneuver,
  derived,
  roll,
  pending,
}: {
  character: CharacterWithRelations;
  maneuver: CombatManeuver;
  derived: DerivedStats;
  roll: (intent: RollIntent) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  const resolved = resolveManeuverFeat(
    maneuver.name,
    character.feats.map((f) => f.name),
  );
  const displayName = resolved
    ? `${resolved.tier === "greater" ? "Greater" : "Improved"} ${maneuver.name}`
    : maneuver.name;
  const description = resolved
    ? [
        maneuver.description,
        ...resolved.feats.map((f) => `**${f.name}**: ${f.benefit}`),
      ].join("\n\n")
    : maneuver.description;

  const bluffTotal = maneuver.isCmbBased
    ? null
    : findSkillTotal("Bluff", "CHA", character.skillRanks, {
        abilityScores: derived.abilityScores,
        armorCheckPenalty: derived.armorCheckPenalty,
      });

  function rollManeuver() {
    if (maneuver.isCmbBased) {
      roll({
        type: "custom",
        label: `${displayName} (CMB)`,
        dice: "1d20",
        modifiers: [{ source: "CMB", value: derived.cmb }],
      });
    } else {
      roll({
        type: "skill",
        skillName: displayName,
        total: bluffTotal ?? 0,
      });
    }
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
        className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-2 py-1.5"
      >
        <span className="flex items-center gap-1">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          {displayName}
        </span>
        <span
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Stat
            label={maneuver.isCmbBased ? "CMB" : "Bluff"}
            value={sign(maneuver.isCmbBased ? derived.cmb : (bluffTotal ?? 0))}
          />
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={rollManeuver}
          >
            Roll
          </Button>
        </span>
      </div>
      {open && (
        <p className="text-muted-foreground border-t px-2 py-2 text-xs leading-relaxed whitespace-pre-line">
          {description}
        </p>
      )}
    </div>
  );
}

/** "Perform Maneuver" button + popup listing Bull Rush through Trip plus
 * Feint (scraped from d20pfsrd — see scripts/scrape-combat-maneuvers.ts).
 * Each row shows and rolls the character's bonus for that maneuver — CMB
 * for the 10 real combat maneuvers, Bluff for Feint (which uses a Bluff
 * check, not a CMB attack roll) — and, when the character has taken the
 * matching "Improved X"/"Greater X" feat (scraped separately — see
 * scripts/scrape-maneuver-feats.ts), renames the row to that feat's name
 * and appends its actual benefit text in place of the generic "unless you
 * have the feat" caveat the base rules text would otherwise show. */
export function CombatManeuverDialog({
  character,
  derived,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
}) {
  const [open, setOpen] = useState(false);
  const { roll, pending } = useCharacterRoll(character.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        Perform Maneuver
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Combat Maneuvers</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {COMBAT_MANEUVERS_OVERVIEW.split("\n\n")[0]}
        </p>
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {COMBAT_MANEUVERS.map((m) => (
            <ManeuverRow
              key={m.slug}
              character={character}
              maneuver={m}
              derived={derived}
              roll={roll}
              pending={pending}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
