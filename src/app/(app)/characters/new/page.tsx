import type { Metadata } from "next";

import {
  CreateCharacterForm,
  type ClassOption,
} from "@/components/character/create-form";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New character" };

const GROUP_LABEL: Record<string, string> = {
  spherecaster: "Spherecaster",
  practitioner: "Practitioner",
  champion: "Champion",
};

const GROUP_ORDER = [
  "Pathfinder 1e",
  "Spherecaster",
  "Practitioner",
  "Champion",
  "Spheres of Power",
];

export default async function NewCharacterPage() {
  await requireSession();

  const rows = await prisma.gameClass.findMany({
    orderBy: [{ system: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      system: true,
      hitDie: true,
      babProgression: true,
      fortProgression: true,
      refProgression: true,
      willProgression: true,
      skillRanksPerLevel: true,
      data: true,
    },
  });

  const classes: ClassOption[] = rows
    .map((r) => {
      const group =
        r.system === "SPHERES_OF_POWER"
          ? (GROUP_LABEL[
              (r.data as { group?: string } | null)?.group ?? ""
            ] ?? "Spheres of Power")
          : "Pathfinder 1e";
      return {
        id: r.id,
        name: r.name,
        system: r.system,
        group,
        hitDie: r.hitDie,
        babProgression: r.babProgression,
        fortProgression: r.fortProgression,
        refProgression: r.refProgression,
        willProgression: r.willProgression,
        skillRanksPerLevel: r.skillRanksPerLevel,
      };
    })
    .sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.group);
      const gb = GROUP_ORDER.indexOf(b.group);
      return ga !== gb ? ga - gb : a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New character</h1>
        <p className="text-muted-foreground">
          The essentials now; feats, skills, spells and gear are edited on the
          sheet. Derived stats calculate automatically.
        </p>
      </div>
      <CreateCharacterForm classes={classes} />
    </div>
  );
}
