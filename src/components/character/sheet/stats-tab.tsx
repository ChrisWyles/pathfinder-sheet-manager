"use client";

import { DiscordWebhookCard } from "@/components/character/discord-webhook-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ABILITY_META, SIZE_OPTIONS } from "@/lib/constants";
import { abilityBreakdown, parseAbilityAdjustments } from "@/lib/rules/abilities";
import type { AbilityKey, DerivedStats } from "@/lib/rules/types";
import { ABILITIES } from "@/lib/rules/types";

import { DamageReductionEditor } from "./damage-reduction-editor";
import { ClickableStat } from "./clickable-stat";
import { ResourceTracker } from "./resource-tracker";
import { SectionDiscordButton } from "./section-discord-button";
import { Stat, sign } from "./stat";
import { StatTooltip } from "./stat-tooltip";
import type { CharacterWithRelations } from "./types";
import { useCharacterRoll } from "../use-character-roll";

const SAVE_LABEL = { fort: "Fortitude", ref: "Reflex", will: "Will" } as const;

function SectionTitle({
  title,
  discord,
}: {
  title: string;
  discord?: { characterId: string; fields: { name: string; value: string }[] };
}) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{title}</span>
      {discord && (
        <SectionDiscordButton
          characterId={discord.characterId}
          title={title}
          fields={discord.fields}
        />
      )}
    </div>
  );
}

export function StatsTab({
  character,
  derived,
  baseScores,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
  baseScores: Record<AbilityKey, number>;
}) {
  const { roll, pending } = useCharacterRoll(character.id);
  const abilityAdjustments = parseAbilityAdjustments(character.abilityModifiers);

  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Bio</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          <Stat label="Race" value={character.race || "—"} />
          <Stat label="Alignment" value={character.alignment || "—"} />
          <Stat label="Deity" value={character.deity || "—"} />
          <Stat label="Gender" value={character.gender || "—"} />
          <Stat label="Age" value={character.age ?? "—"} />
          <Stat
            label="Size"
            value={
              SIZE_OPTIONS.find((s) => s.value === character.size)?.label ??
              character.size
            }
          />
          <Stat label="XP" value={character.xp} />
          {character.notes && (
            <div className="w-full basis-full rounded-md border px-2 py-1.5">
              <div className="text-muted-foreground text-[10px] leading-tight">
                Notes
              </div>
              <p className="text-sm whitespace-pre-wrap">{character.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Ability scores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {ABILITIES.map((key) => {
            const total = derived.abilityScores[key];
            const delta = total - baseScores[key];
            return (
              <StatTooltip
                key={key}
                lines={abilityBreakdown(key, baseScores[key], abilityAdjustments)}
                total={total}
              >
                <ClickableStat
                  label={ABILITY_META[key].label}
                  pending={pending}
                  onClick={() => roll({ type: "ability-check", ability: key })}
                  value={
                    <span className="flex items-baseline justify-center gap-1">
                      <span>{total}</span>
                      <span className="text-muted-foreground text-xs">
                        ({sign(derived.abilityMods[key])})
                      </span>
                      {delta !== 0 && (
                        <span className="text-muted-foreground text-[10px]">
                          {sign(delta)}
                        </span>
                      )}
                    </span>
                  }
                  className="text-center"
                />
              </StatTooltip>
            );
          })}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Derived stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1 rounded-md border p-2">
              <SectionTitle
                title="Positioning"
                discord={{
                  characterId: character.id,
                  fields: [
                    { name: "Initiative", value: sign(derived.initiative) },
                    { name: "Speed", value: `${derived.speed} ft.` },
                  ],
                }}
              />
              <div className="flex flex-wrap gap-1.5">
                <StatTooltip
                  lines={derived.breakdowns.initiative}
                  total={derived.initiative}
                >
                  <ClickableStat
                    label="Initiative"
                    value={sign(derived.initiative)}
                    pending={pending}
                    onClick={() => roll({ type: "initiative" })}
                  />
                </StatTooltip>
                <StatTooltip lines={derived.breakdowns.speed} total={derived.speed}>
                  <Stat label="Speed" value={`${derived.speed} ft.`} />
                </StatTooltip>
              </div>
            </div>

            <div className="min-w-[220px] flex-1 rounded-md border p-2">
              <div className="text-muted-foreground mb-1 text-xs font-medium">
                Attack
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Stat label="BAB" value={sign(derived.baseAttackBonus)} />
                <StatTooltip
                  lines={derived.breakdowns.meleeAttack}
                  total={derived.meleeAttack}
                >
                  <ClickableStat
                    label="Melee"
                    value={sign(derived.meleeAttack)}
                    pending={pending}
                    onClick={() =>
                      roll({ type: "attack", which: "melee", weaponName: "Melee" })
                    }
                  />
                </StatTooltip>
                <StatTooltip
                  lines={derived.breakdowns.rangedAttack}
                  total={derived.rangedAttack}
                >
                  <ClickableStat
                    label="Ranged"
                    value={sign(derived.rangedAttack)}
                    pending={pending}
                    onClick={() =>
                      roll({ type: "attack", which: "ranged", weaponName: "Ranged" })
                    }
                  />
                </StatTooltip>
                <StatTooltip lines={derived.breakdowns.cmb} total={derived.cmb}>
                  <Stat label="CMB" value={sign(derived.cmb)} />
                </StatTooltip>
                <Stat
                  label="Sequence"
                  value={derived.attackSequence.map(sign).join("/")}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1 rounded-md border p-2">
              <SectionTitle
                title="Hit points"
                discord={{
                  characterId: character.id,
                  fields: [
                    {
                      name: "Hit points",
                      value: `${character.currentHp} / ${character.maxHp}`,
                    },
                    { name: "Temp HP", value: `${character.tempHp}` },
                    ...(character.maxSpellPoints != null
                      ? [
                          {
                            name: "Spell points",
                            value: `${character.spellPoints ?? 0} / ${character.maxSpellPoints}`,
                          },
                        ]
                      : []),
                  ],
                }}
              />
              <ResourceTracker
                characterId={character.id}
                currentHp={character.currentHp}
                maxHp={character.maxHp}
                tempHp={character.tempHp}
                spellPoints={character.spellPoints}
                maxSpellPoints={character.maxSpellPoints}
              />
            </div>

            <div className="min-w-[220px] flex-1 rounded-md border p-2">
              <div className="text-muted-foreground mb-1 text-xs font-medium">
                Saves
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["fort", "ref", "will"] as const).map((s) => (
                  <StatTooltip
                    key={s}
                    lines={derived.breakdowns.saves[s]}
                    total={derived.saves[s]}
                  >
                    <ClickableStat
                      label={SAVE_LABEL[s]}
                      value={sign(derived.saves[s])}
                      pending={pending}
                      onClick={() => roll({ type: "save", save: s })}
                    />
                  </StatTooltip>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-2">
            <SectionTitle
              title="Defense"
              discord={{
                characterId: character.id,
                fields: [
                  { name: "AC", value: `${derived.ac}` },
                  { name: "Touch AC", value: `${derived.touchAc}` },
                  { name: "Flat-footed", value: `${derived.flatFootedAc}` },
                  { name: "CMD", value: `${derived.cmd}` },
                  { name: "DR", value: character.damageReduction || "—" },
                  {
                    name: "Check penalty",
                    value: `-${derived.armorCheckPenalty}`,
                  },
                ],
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              <StatTooltip lines={derived.breakdowns.ac} total={derived.ac}>
                <Stat label="AC" value={derived.ac} />
              </StatTooltip>
              <StatTooltip lines={derived.breakdowns.touchAc} total={derived.touchAc}>
                <Stat label="Touch AC" value={derived.touchAc} />
              </StatTooltip>
              <StatTooltip
                lines={derived.breakdowns.flatFootedAc}
                total={derived.flatFootedAc}
              >
                <Stat label="Flat-footed" value={derived.flatFootedAc} />
              </StatTooltip>
              <StatTooltip lines={derived.breakdowns.cmd} total={derived.cmd}>
                <Stat label="CMD" value={derived.cmd} />
              </StatTooltip>
              <DamageReductionEditor
                characterId={character.id}
                value={character.damageReduction}
              />
              <StatTooltip
                lines={derived.breakdowns.armorCheckPenalty.map((l) => ({
                  ...l,
                  value: -l.value,
                }))}
                total={-derived.armorCheckPenalty}
              >
                <Stat label="Check penalty" value={`-${derived.armorCheckPenalty}`} />
              </StatTooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      <DiscordWebhookCard
        characterId={character.id}
        current={character.discordWebhookUrl}
      />
    </div>
  );
}
