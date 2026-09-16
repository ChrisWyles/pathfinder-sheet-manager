import "../load-env";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { normalizePgUrl } from "../src/lib/pg-url";

/**
 * One-off seed for the PF1e core skill list's short hover-tooltip
 * descriptions (Skill.description was never populated). Paraphrased
 * one-liners, not verbatim SRD text.
 *
 *   npm run seed:skill-descriptions
 */

const DESCRIPTIONS: Record<string, string> = {
  Acrobatics: "Keep your balance, tumble past foes, and make running jumps.",
  Appraise: "Estimate the value of objects, especially gems, art, and magic items.",
  Bluff: "Convincingly lie, feint in combat, or pass secret messages.",
  Climb: "Scale walls, cliffs, and other steep or slippery surfaces.",
  Craft: "Create and repair items in a chosen trade, such as weapons or alchemy.",
  Diplomacy: "Negotiate, gather information, and improve others' attitudes toward you.",
  "Disable Device": "Disarm traps and pick locks.",
  Disguise: "Alter your appearance to pass as someone else.",
  "Escape Artist": "Slip out of ropes, manacles, and grapples, or squeeze through tight spaces.",
  Fly: "Maneuver while flying, including in adverse conditions.",
  "Handle Animal": "Train, teach tricks to, and calm domesticated animals.",
  Heal: "Treat wounds, poison, and disease, and stabilize the dying.",
  Intimidate: "Frighten or coerce others through threats.",
  "Knowledge (arcana)": "Recall lore about magic, magic items, and constructs.",
  "Knowledge (dungeoneering)": "Recall lore about aberrations, oozes, and underground hazards.",
  "Knowledge (engineering)": "Recall lore about buildings, bridges, and other structures.",
  "Knowledge (geography)": "Recall lore about terrain, climate, and distant lands.",
  "Knowledge (history)": "Recall lore about past events, dynasties, and wars.",
  "Knowledge (local)": "Recall lore about local personalities, laws, customs, and legends.",
  "Knowledge (nature)": "Recall lore about animals, plants, weather, and natural hazards.",
  "Knowledge (nobility)": "Recall lore about heraldry, royalty, and noble lineages.",
  "Knowledge (planes)": "Recall lore about the Inner and Outer Planes and their denizens.",
  "Knowledge (religion)": "Recall lore about deities, undead, and religious rites.",
  Linguistics: "Learn new languages and detect or create forgeries.",
  Perception: "Notice hidden creatures, objects, and details.",
  Perform: "Entertain an audience through acting, dance, music, or oratory.",
  Profession: "Earn a living and apply specialized knowledge in a trade.",
  Ride: "Control a mount in and out of combat.",
  "Sense Motive": "Detect lies and discern others' intentions.",
  "Sleight of Hand": "Palm objects, pick pockets, and conceal small items.",
  Spellcraft: "Identify spells and magic items as they're cast or examined.",
  Stealth: "Hide and move without being noticed.",
  Survival: "Track creatures, avoid hazards, and live off the land.",
  Swim: "Move through and function in water.",
  "Use Magic Device": "Activate magic items you couldn't normally use.",
};

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    let updated = 0;
    const missed: string[] = [];
    for (const [name, description] of Object.entries(DESCRIPTIONS)) {
      const { count } = await prisma.skill.updateMany({
        where: { name },
        data: { description },
      });
      updated += count;
      if (count === 0) missed.push(name);
    }
    console.log(`Updated ${updated} skill row(s).`);
    if (missed.length) console.log("No matching row for:", missed.join(", "));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
