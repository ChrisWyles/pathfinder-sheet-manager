import type { Prisma } from "@prisma/client";

/** Matches the `include` shape used by the character sheet page's query —
 * keep in sync with `[id]/page.tsx`. */
export type CharacterWithRelations = Prisma.CharacterGetPayload<{
  include: {
    classes: true;
    inventory: { include: { item: true } };
    feats: true;
    spheres: true;
    talents: { include: { talent: true } };
    rollLogs: true;
    skillRanks: { include: { skill: true } };
    actions: true;
  };
}>;
