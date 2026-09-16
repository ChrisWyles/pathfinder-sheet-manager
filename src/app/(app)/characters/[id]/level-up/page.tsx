import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  favoredClassBonusTalentsEarned,
  parseFavoredClassBonusMechanic,
} from "@/lib/rules/favored-class-bonus";
import { deriveCharacter } from "@/lib/rules/snapshot";

export const metadata: Metadata = { title: "Level up" };

export default async function LevelUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const character = await prisma.character.findFirst({
    where: { id, userId: session.user.id },
    include: { classes: true, inventory: { include: { item: true } } },
  });
  if (!character) notFound();

  const derived = deriveCharacter(character);
  const nextLevel = derived.totalLevel + 1;

  const favoredClassRow =
    character.classes.find((c) => c.isFavoredClass) ?? character.classes[0] ?? null;
  const favoredBonusNote =
    ((favoredClassRow?.data ?? null) as { favoredBonusNote?: string | null } | null)
      ?.favoredBonusNote || "";
  const fcbMechanic = favoredBonusNote
    ? parseFavoredClassBonusMechanic(favoredBonusNote)
    : null;
  const nextClassLevel = (favoredClassRow?.levels ?? 0) + 1;
  const fcbGrantsTalentThisLevel =
    fcbMechanic != null &&
    favoredClassBonusTalentsEarned(fcbMechanic, nextClassLevel) >
      favoredClassBonusTalentsEarned(fcbMechanic, favoredClassRow?.levels ?? 0);

  const steps = [
    "Choose the class for this level (existing class or a new multiclass).",
    "Roll or take average hit points, add your Constitution modifier.",
    "Apply the class features gained at this level.",
    "Add skill ranks (class ranks + Intelligence modifier).",
    nextLevel % 2 === 1 ? "Select a feat (odd levels)." : null,
    nextLevel % 4 === 0
      ? "Increase one ability score by 1 (every 4th level)."
      : null,
    character.system === "SPHERES_OF_POWER"
      ? "Update caster level, spell points and any new spheres or talents."
      : "Update spells known / prepared and other per-level resources.",
    fcbGrantsTalentThisLevel && fcbMechanic
      ? `Favored class bonus: add 1 bonus ${fcbMechanic.spheres.length ? `${fcbMechanic.spheres.join("/")} sphere ` : ""}talent (${favoredBonusNote}).`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {character.name}: level {derived.totalLevel} → {nextLevel}
          </h1>
          <p className="text-muted-foreground">
            The guided flow is coming next. For now, here&apos;s the checklist.
          </p>
        </div>
        <Link
          href={`/characters/${character.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to sheet
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Level {nextLevel} checklist</CardTitle>
          <CardDescription>
            Based on{" "}
            {character.classes
              .map((c) => `${c.name} ${c.levels}`)
              .join(" / ") || "no class yet"}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
