import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CharacterSheetTabs } from "@/components/character/sheet/character-sheet-tabs";
import { DeleteCharacterButton } from "@/components/character/delete-character-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth-helpers";
import { RULES_SYSTEMS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  favoredClassBonusTalentsEarned,
  parseFavoredClassBonusMechanic,
} from "@/lib/rules/favored-class-bonus";
import { deriveCharacter } from "@/lib/rules/snapshot";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const character = await prisma.character.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: character?.name ?? "Character" };
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
      spheres: { orderBy: { name: "asc" } },
      talents: { include: { talent: true }, orderBy: { name: "asc" } },
      rollLogs: { orderBy: { createdAt: "desc" }, take: 10 },
      skillRanks: { include: { skill: true } },
      actions: { orderBy: { createdAt: "asc" } },
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

  type ClassData = {
    favoredBonusNote?: string | null;
    customCastingTradition?: {
      drawbacks: string[];
      boons: string[];
      bonusSpellPoints: number;
      sphereDrawbacks: { name: string; sphereName: string }[];
    } | null;
    customMartialTradition?: {
      equipmentSphere: string;
      disciplineTalent: string | null;
      secondTalent: string | null;
      baseSphere: string | null;
      bonus:
        | { type: "sphere"; name: string }
        | { type: "talent"; name: string; fromSphere: string | null }
        | { type: "equipment"; name: string }
        | null;
    } | null;
  };
  const classData = character.classes
    .map((c) => (c.data ?? null) as ClassData | null)
    .find(
      (d) => d?.customCastingTradition || d?.customMartialTradition,
    );
  const customCasting = classData?.customCastingTradition ?? null;
  const customMartial = classData?.customMartialTradition ?? null;

  const favoredClassRow =
    character.classes.find((c) => c.isFavoredClass) ?? character.classes[0] ?? null;
  const favoredBonusNote =
    ((favoredClassRow?.data ?? null) as ClassData | null)?.favoredBonusNote || "";
  const fcbMechanic = favoredBonusNote
    ? parseFavoredClassBonusMechanic(favoredBonusNote)
    : null;
  const fcbTalentsEarned =
    fcbMechanic && favoredClassRow
      ? favoredClassBonusTalentsEarned(fcbMechanic, favoredClassRow.levels)
      : 0;
  const fcbNextLevel = fcbMechanic ? (fcbTalentsEarned + 1) * fcbMechanic.every : null;

  const baseScores = {
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

      <CharacterSheetTabs
        character={character}
        derived={derived}
        baseScores={baseScores}
        customCasting={customCasting}
        customMartial={customMartial}
        favoredBonusNote={favoredBonusNote}
        favoredClassName={favoredClassRow?.name}
        fcbMechanic={fcbMechanic}
        fcbTalentsEarned={fcbTalentsEarned}
        fcbNextLevel={fcbNextLevel}
      />
    </div>
  );
}
