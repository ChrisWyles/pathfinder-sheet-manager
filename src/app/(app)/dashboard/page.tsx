import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth-helpers";
import { RULES_SYSTEMS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your characters" };

function systemLabel(system: string) {
  return RULES_SYSTEMS.find((s) => s.value === system)?.label ?? system;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { classes: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your characters</h1>
        <Link href="/characters/new" className={buttonVariants()}>
          New character
        </Link>
      </div>

      {characters.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No characters yet</CardTitle>
            <CardDescription>
              Create your first Pathfinder 1e or Spheres of Power character to
              get a live sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/characters/new" className={buttonVariants()}>
              Start one
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {characters.map((c) => {
            const level = c.classes.reduce((s, cl) => s + cl.levels, 0);
            const classLine = c.classes
              .map((cl) => `${cl.name} ${cl.levels}`)
              .join(" / ");
            return (
              <li key={c.id}>
                <Link href={`/characters/${c.id}`} className="block">
                  <Card className="hover:border-foreground/30 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle>{c.name}</CardTitle>
                        <Badge variant="secondary">
                          {systemLabel(c.system)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {c.race ? `${c.race} · ` : ""}
                        {classLine || "No class"} · Level {level || 1}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground text-sm">
                      {c.discordWebhookUrl
                        ? "Discord delivery on"
                        : "No Discord webhook set"}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
