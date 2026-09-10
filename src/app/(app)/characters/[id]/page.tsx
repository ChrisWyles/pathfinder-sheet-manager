import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteCharacterButton } from "@/components/character/delete-character-button";
import { DiscordWebhookCard } from "@/components/character/discord-webhook-card";
import { RollPanel } from "@/components/character/roll-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth-helpers";
import { ABILITY_META, RULES_SYSTEMS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { deriveCharacter } from "@/lib/rules/snapshot";
import { ABILITIES } from "@/lib/rules/types";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const character = await prisma.character.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: character?.name ?? "Character" };
}

function sign(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

export default async function CharacterSheetPage({ params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const character = await prisma.character.findFirst({
    where: { id, userId: session.user.id },
    include: {
      classes: true,
      inventory: { include: { item: true }, orderBy: { name: "asc" } },
      feats: { orderBy: { takenAtLevel: "asc" } },
      rollLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!character) notFound();

  const derived = deriveCharacter(character);
  const systemLabel =
    RULES_SYSTEMS.find((s) => s.value === character.system)?.label ??
    character.system;
  const classLine =
    character.classes.map((c) => `${c.name} ${c.levels}`).join(" / ") ||
    "No class";

  const scores: Record<string, number> = {
    STR: character.strength,
    DEX: character.dexterity,
    CON: character.constitution,
    INT: character.intelligence,
    WIS: character.wisdom,
    CHA: character.charisma,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{character.name}</h1>
            <Badge variant="secondary">{systemLabel}</Badge>
          </div>
          <p className="text-muted-foreground">
            {character.race ? `${character.race} · ` : ""}
            {classLine} · Level {derived.totalLevel || 1}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/characters/${character.id}/level-up`}
            className={buttonVariants({ variant: "outline" })}
          >
            Level up
          </Link>
          <DeleteCharacterButton
            characterId={character.id}
            name={character.name}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ability scores</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {ABILITIES.map((key) => (
                <div
                  key={key}
                  className="rounded-md border p-3 text-center"
                  title={ABILITY_META[key].label}
                >
                  <div className="text-muted-foreground text-xs">{key}</div>
                  <div className="text-xl font-semibold tabular-nums">
                    {scores[key]}
                  </div>
                  <div className="text-muted-foreground text-sm tabular-nums">
                    {sign(derived.abilityMods[key])}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Derived stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat
                label="Hit points"
                value={`${character.currentHp} / ${character.maxHp}`}
              />
              <Stat label="Initiative" value={sign(derived.initiative)} />
              <Stat label="Speed" value={`${derived.speed} ft.`} />
              <Stat label="AC" value={derived.ac} />
              <Stat label="Touch AC" value={derived.touchAc} />
              <Stat label="Flat-footed" value={derived.flatFootedAc} />
              <Stat label="Fortitude" value={sign(derived.saves.fort)} />
              <Stat label="Reflex" value={sign(derived.saves.ref)} />
              <Stat label="Will" value={sign(derived.saves.will)} />
              <Stat label="BAB" value={sign(derived.baseAttackBonus)} />
              <Stat
                label="Attack sequence"
                value={derived.attackSequence.map(sign).join(" / ")}
              />
              <Stat
                label="Melee / Ranged"
                value={`${sign(derived.meleeAttack)} / ${sign(derived.rangedAttack)}`}
              />
              <Stat label="CMB" value={sign(derived.cmb)} />
              <Stat label="CMD" value={derived.cmd} />
              <Stat
                label="Armor check penalty"
                value={`-${derived.armorCheckPenalty}`}
              />
            </CardContent>
          </Card>

          <RollPanel characterId={character.id} />

          <Card>
            <CardHeader>
              <CardTitle>Recent rolls</CardTitle>
            </CardHeader>
            <CardContent>
              {character.rollLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No rolls yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {character.rollLogs.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-4 py-2"
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {r.expression} → {r.total}
                        {r.discordDelivered ? " · sent" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <DiscordWebhookCard
            characterId={character.id}
            current={character.discordWebhookUrl}
          />

          <Card>
            <CardHeader>
              <CardTitle>Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              {character.inventory.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nothing carried yet.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {character.inventory.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>
                        {i.name}
                        {i.quantity > 1 ? ` ×${i.quantity}` : ""}
                      </span>
                      {i.equipped && (
                        <span className="text-muted-foreground">equipped</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feats</CardTitle>
            </CardHeader>
            <CardContent>
              {character.feats.length === 0 ? (
                <p className="text-muted-foreground text-sm">None recorded.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {character.feats.map((f) => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
