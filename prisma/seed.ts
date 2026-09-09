import "../load-env";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SRD = { source: "PFSRD", isSrd: true };

const SKILLS: {
  name: string;
  keyAbility: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
  trainedOnly?: boolean;
  armorCheckPenalty?: boolean;
}[] = [
  { name: "Acrobatics", keyAbility: "DEX", armorCheckPenalty: true },
  { name: "Appraise", keyAbility: "INT" },
  { name: "Bluff", keyAbility: "CHA" },
  { name: "Climb", keyAbility: "STR", armorCheckPenalty: true },
  { name: "Craft", keyAbility: "INT" },
  { name: "Diplomacy", keyAbility: "CHA" },
  {
    name: "Disable Device",
    keyAbility: "DEX",
    trainedOnly: true,
    armorCheckPenalty: true,
  },
  { name: "Disguise", keyAbility: "CHA" },
  { name: "Escape Artist", keyAbility: "DEX", armorCheckPenalty: true },
  { name: "Fly", keyAbility: "DEX", armorCheckPenalty: true },
  { name: "Handle Animal", keyAbility: "CHA", trainedOnly: true },
  { name: "Heal", keyAbility: "WIS" },
  { name: "Intimidate", keyAbility: "CHA" },
  { name: "Knowledge (arcana)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (dungeoneering)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (engineering)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (geography)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (history)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (local)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (nature)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (nobility)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (planes)", keyAbility: "INT", trainedOnly: true },
  { name: "Knowledge (religion)", keyAbility: "INT", trainedOnly: true },
  { name: "Linguistics", keyAbility: "INT", trainedOnly: true },
  { name: "Perception", keyAbility: "WIS" },
  { name: "Perform", keyAbility: "CHA" },
  { name: "Profession", keyAbility: "WIS", trainedOnly: true },
  { name: "Ride", keyAbility: "DEX", armorCheckPenalty: true },
  { name: "Sense Motive", keyAbility: "WIS" },
  {
    name: "Sleight of Hand",
    keyAbility: "DEX",
    trainedOnly: true,
    armorCheckPenalty: true,
  },
  { name: "Spellcraft", keyAbility: "INT", trainedOnly: true },
  { name: "Stealth", keyAbility: "DEX", armorCheckPenalty: true },
  { name: "Survival", keyAbility: "WIS" },
  { name: "Swim", keyAbility: "STR", armorCheckPenalty: true },
  { name: "Use Magic Device", keyAbility: "CHA", trainedOnly: true },
];

const CLASSES: {
  name: string;
  hitDie: number;
  babProgression: "FULL" | "THREE_QUARTER" | "HALF";
  fortProgression: "GOOD" | "POOR";
  refProgression: "GOOD" | "POOR";
  willProgression: "GOOD" | "POOR";
  skillRanksPerLevel: number;
  classSkills: string[];
  system?: "PATHFINDER_1E" | "SPHERES_OF_POWER";
  features: { name: string; level: number; description: string }[];
}[] = [
  {
    name: "Fighter",
    hitDie: 10,
    babProgression: "FULL",
    fortProgression: "GOOD",
    refProgression: "POOR",
    willProgression: "POOR",
    skillRanksPerLevel: 2,
    classSkills: [
      "Climb",
      "Craft",
      "Handle Animal",
      "Intimidate",
      "Ride",
      "Survival",
      "Swim",
    ],
    features: [
      {
        name: "Bonus Feat",
        level: 1,
        description: "A bonus combat feat, and another every even level.",
      },
      {
        name: "Bravery",
        level: 2,
        description: "+1 to Will saves vs. fear, improving every 4 levels.",
      },
      {
        name: "Armor Training",
        level: 3,
        description: "Reduce armor check penalty and increase max Dex bonus.",
      },
      {
        name: "Weapon Training",
        level: 5,
        description: "+1 attack and damage with a chosen weapon group.",
      },
    ],
  },
  {
    name: "Rogue",
    hitDie: 8,
    babProgression: "THREE_QUARTER",
    fortProgression: "POOR",
    refProgression: "GOOD",
    willProgression: "POOR",
    skillRanksPerLevel: 8,
    classSkills: [
      "Acrobatics",
      "Appraise",
      "Bluff",
      "Climb",
      "Diplomacy",
      "Disable Device",
      "Disguise",
      "Escape Artist",
      "Perception",
      "Sense Motive",
      "Sleight of Hand",
      "Stealth",
      "Use Magic Device",
    ],
    features: [
      {
        name: "Sneak Attack",
        level: 1,
        description:
          "+1d6 damage vs. flat-footed or flanked targets, +1d6 every 2 levels.",
      },
      {
        name: "Trapfinding",
        level: 1,
        description:
          "Add 1/2 level to Perception to find traps and to Disable Device.",
      },
      {
        name: "Evasion",
        level: 2,
        description: "No damage on a successful Reflex save for half.",
      },
      {
        name: "Rogue Talent",
        level: 2,
        description: "Choose a rogue talent, and another every 2 levels.",
      },
    ],
  },
  {
    name: "Cleric",
    hitDie: 8,
    babProgression: "THREE_QUARTER",
    fortProgression: "GOOD",
    refProgression: "POOR",
    willProgression: "GOOD",
    skillRanksPerLevel: 2,
    classSkills: [
      "Appraise",
      "Diplomacy",
      "Heal",
      "Knowledge (arcana)",
      "Knowledge (history)",
      "Knowledge (nobility)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Linguistics",
      "Profession",
      "Sense Motive",
      "Spellcraft",
    ],
    features: [
      {
        name: "Spellcasting",
        level: 1,
        description:
          "Prepared divine spellcasting from the cleric list, Wisdom-based.",
      },
      {
        name: "Channel Energy",
        level: 1,
        description:
          "Release positive or negative energy to heal or harm, 1d6 per 2 levels.",
      },
      {
        name: "Domains",
        level: 1,
        description: "Two domains granting powers and bonus spells.",
      },
    ],
  },
  {
    name: "Wizard",
    hitDie: 6,
    babProgression: "HALF",
    fortProgression: "POOR",
    refProgression: "POOR",
    willProgression: "GOOD",
    skillRanksPerLevel: 2,
    classSkills: [
      "Appraise",
      "Craft",
      "Fly",
      "Knowledge (arcana)",
      "Knowledge (dungeoneering)",
      "Knowledge (engineering)",
      "Knowledge (geography)",
      "Knowledge (history)",
      "Knowledge (local)",
      "Knowledge (nature)",
      "Knowledge (nobility)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Linguistics",
      "Profession",
      "Spellcraft",
    ],
    features: [
      {
        name: "Spellcasting",
        level: 1,
        description:
          "Prepared arcane spellcasting from a spellbook, Intelligence-based.",
      },
      {
        name: "Arcane Bond",
        level: 1,
        description: "A bonded object or a familiar.",
      },
      {
        name: "Arcane School",
        level: 1,
        description: "Specialize in one school for bonus spells and powers.",
      },
      {
        name: "Bonus Feat",
        level: 5,
        description:
          "A metamagic, item creation, or Spell Mastery feat every 5 levels.",
      },
    ],
  },
  {
    name: "Ranger",
    hitDie: 10,
    babProgression: "FULL",
    fortProgression: "GOOD",
    refProgression: "GOOD",
    willProgression: "POOR",
    skillRanksPerLevel: 6,
    classSkills: [
      "Climb",
      "Craft",
      "Handle Animal",
      "Heal",
      "Intimidate",
      "Knowledge (dungeoneering)",
      "Knowledge (geography)",
      "Knowledge (nature)",
      "Perception",
      "Profession",
      "Ride",
      "Stealth",
      "Survival",
      "Swim",
    ],
    features: [
      {
        name: "Favored Enemy",
        level: 1,
        description:
          "+2 to attack, damage and several skills vs. a chosen creature type.",
      },
      {
        name: "Track",
        level: 1,
        description: "Add 1/2 level to Survival checks to follow tracks.",
      },
      {
        name: "Combat Style",
        level: 2,
        description: "Bonus feats from archery or two-weapon fighting.",
      },
      {
        name: "Hunter's Bond",
        level: 4,
        description: "An animal companion or a bond with your allies.",
      },
    ],
  },
  {
    name: "Incanter",
    system: "SPHERES_OF_POWER",
    hitDie: 8,
    babProgression: "THREE_QUARTER",
    fortProgression: "POOR",
    refProgression: "POOR",
    willProgression: "GOOD",
    skillRanksPerLevel: 4,
    classSkills: [
      "Appraise",
      "Craft",
      "Fly",
      "Knowledge (arcana)",
      "Knowledge (planes)",
      "Knowledge (religion)",
      "Profession",
      "Sense Motive",
      "Spellcraft",
      "Use Magic Device",
    ],
    features: [
      {
        name: "Casting",
        level: 1,
        description:
          "High Caster: caster level equals class level, spell points equal to level + casting modifier.",
      },
      {
        name: "Magic Talents",
        level: 1,
        description:
          "Gain a magic talent at 1st level and every level thereafter.",
      },
      {
        name: "Spell Points",
        level: 1,
        description:
          "A pool used to power sphere effects, refreshed after a full rest.",
      },
      {
        name: "Improved Focus",
        level: 2,
        description:
          "Reduced penalties while maintaining concentration on sphere effects.",
      },
    ],
  },
];

const FEATS: {
  name: string;
  featTypes: string[];
  prerequisites: string;
  benefit: string;
}[] = [
  {
    name: "Power Attack",
    featTypes: ["Combat"],
    prerequisites: "Str 13, base attack bonus +1",
    benefit: "Take -1 to melee attack for +2 damage (scaling with BAB).",
  },
  {
    name: "Combat Expertise",
    featTypes: ["Combat"],
    prerequisites: "Int 13",
    benefit: "Take a penalty to attack for a dodge bonus to AC.",
  },
  {
    name: "Weapon Finesse",
    featTypes: ["Combat"],
    prerequisites: "—",
    benefit: "Use Dex instead of Str on attack rolls with light weapons.",
  },
  {
    name: "Point-Blank Shot",
    featTypes: ["Combat"],
    prerequisites: "—",
    benefit: "+1 attack and damage with ranged attacks within 30 ft.",
  },
  {
    name: "Precise Shot",
    featTypes: ["Combat"],
    prerequisites: "Point-Blank Shot",
    benefit: "No -4 penalty for shooting into melee.",
  },
  {
    name: "Dodge",
    featTypes: ["Combat"],
    prerequisites: "Dex 13",
    benefit: "+1 dodge bonus to AC.",
  },
  {
    name: "Improved Initiative",
    featTypes: ["Combat"],
    prerequisites: "—",
    benefit: "+4 bonus on initiative checks.",
  },
  {
    name: "Toughness",
    featTypes: [],
    prerequisites: "—",
    benefit: "+3 hit points, +1 per Hit Die beyond 3.",
  },
  {
    name: "Skill Focus",
    featTypes: [],
    prerequisites: "—",
    benefit: "+3 on a chosen skill (+6 with 10+ ranks).",
  },
  {
    name: "Extra Magic Talent",
    featTypes: ["Spheres"],
    prerequisites: "Magic talent class feature",
    benefit: "Gain one additional magic talent.",
  },
];

const SPELLS: {
  name: string;
  school: string;
  levels: Record<string, number>;
  castingTime: string;
  components: string;
  range: string;
  duration: string;
  savingThrow: string;
  description: string;
}[] = [
  {
    name: "Magic Missile",
    school: "evocation",
    levels: { wizard: 1, sorcerer: 1 },
    castingTime: "1 standard action",
    components: "V, S",
    range: "medium",
    duration: "instantaneous",
    savingThrow: "none",
    description:
      "A dart of force deals 1d4+1 damage; +1 missile per two caster levels (max 5).",
  },
  {
    name: "Cure Light Wounds",
    school: "conjuration (healing)",
    levels: { cleric: 1, druid: 1, bard: 1 },
    castingTime: "1 standard action",
    components: "V, S",
    range: "touch",
    duration: "instantaneous",
    savingThrow: "Will half (harmless)",
    description: "Heals 1d8 + caster level (max +5).",
  },
  {
    name: "Shield",
    school: "abjuration",
    levels: { wizard: 1, sorcerer: 1 },
    castingTime: "1 standard action",
    components: "V, S",
    range: "personal",
    duration: "1 min/level",
    savingThrow: "none",
    description: "+4 shield bonus to AC and negates magic missile.",
  },
  {
    name: "Fireball",
    school: "evocation",
    levels: { wizard: 3, sorcerer: 3 },
    castingTime: "1 standard action",
    components: "V, S, M",
    range: "long",
    duration: "instantaneous",
    savingThrow: "Reflex half",
    description: "1d6 fire per caster level (max 10d6) in a 20-ft. radius.",
  },
  {
    name: "Bless",
    school: "enchantment",
    levels: { cleric: 1, paladin: 1 },
    castingTime: "1 standard action",
    components: "V, S, DF",
    range: "50 ft.",
    duration: "1 min/level",
    savingThrow: "none",
    description: "Allies gain +1 on attack rolls and saves vs. fear.",
  },
];

const SPHERES: {
  name: string;
  type: "MAGIC" | "MIGHT";
  description: string;
}[] = [
  {
    name: "Destruction",
    type: "MAGIC",
    description:
      "Channel raw energy into destructive blasts. Base ability: a ranged touch attack dealing 1d6 damage per two caster levels.",
  },
  {
    name: "Life",
    type: "MAGIC",
    description:
      "Restore health and cure conditions. Base ability: cure damage equal to your caster level with a touch.",
  },
  {
    name: "Telekinesis",
    type: "MAGIC",
    description:
      "Move objects and creatures at range with force. Base ability: bull rush, trip, reposition or grapple at range.",
  },
  {
    name: "Alteration",
    type: "MAGIC",
    description:
      "Reshape creatures with traits and forms. Base ability: grant a creature one shapeshift trait.",
  },
];

const TALENTS: {
  name: string;
  sphereName: string;
  talentTypes: string[];
  prerequisites: string;
  description: string;
}[] = [
  {
    name: "Energy Blast",
    sphereName: "Destruction",
    talentTypes: ["blast type"],
    prerequisites: "Destruction sphere",
    description:
      "Choose an energy type; your destructive blast deals that energy damage.",
  },
  {
    name: "Extended Range",
    sphereName: "Destruction",
    talentTypes: [],
    prerequisites: "Destruction sphere",
    description: "Increase the range increment of your destructive blast.",
  },
  {
    name: "Restore Health",
    sphereName: "Life",
    talentTypes: [],
    prerequisites: "Life sphere",
    description:
      "Spend a spell point to remove one negative condition when you cure.",
  },
  {
    name: "Greater Telekinesis",
    sphereName: "Telekinesis",
    talentTypes: [],
    prerequisites: "Telekinesis sphere",
    description:
      "Increase the weight you can affect and add a second telekinetic maneuver.",
  },
];

const ITEMS: {
  name: string;
  type: "WEAPON" | "ARMOR" | "SHIELD" | "GEAR" | "CONSUMABLE" | "AMMUNITION";
  costCp: number;
  weight: number;
  description?: string;
  weaponCategory?: "SIMPLE" | "MARTIAL" | "EXOTIC";
  damage?: string;
  damageType?: string;
  critRange?: number;
  critMultiplier?: number;
  rangeIncrement?: number;
  armorCategory?: "LIGHT" | "MEDIUM" | "HEAVY";
  acBonus?: number;
  maxDexBonus?: number;
  armorCheckPenalty?: number;
  spellFailure?: number;
}[] = [
  {
    name: "Dagger",
    type: "WEAPON",
    costCp: 200,
    weight: 1,
    weaponCategory: "SIMPLE",
    damage: "1d4",
    damageType: "P or S",
    critRange: 19,
    critMultiplier: 2,
    rangeIncrement: 10,
  },
  {
    name: "Longsword",
    type: "WEAPON",
    costCp: 1500,
    weight: 4,
    weaponCategory: "MARTIAL",
    damage: "1d8",
    damageType: "S",
    critRange: 19,
    critMultiplier: 2,
  },
  {
    name: "Greatsword",
    type: "WEAPON",
    costCp: 5000,
    weight: 8,
    weaponCategory: "MARTIAL",
    damage: "2d6",
    damageType: "S",
    critRange: 19,
    critMultiplier: 2,
  },
  {
    name: "Shortbow",
    type: "WEAPON",
    costCp: 3000,
    weight: 2,
    weaponCategory: "MARTIAL",
    damage: "1d6",
    damageType: "P",
    critRange: 20,
    critMultiplier: 3,
    rangeIncrement: 60,
  },
  {
    name: "Quarterstaff",
    type: "WEAPON",
    costCp: 0,
    weight: 4,
    weaponCategory: "SIMPLE",
    damage: "1d6",
    damageType: "B",
    critRange: 20,
    critMultiplier: 2,
  },
  {
    name: "Padded Armor",
    type: "ARMOR",
    costCp: 500,
    weight: 10,
    armorCategory: "LIGHT",
    acBonus: 1,
    maxDexBonus: 8,
    armorCheckPenalty: 0,
    spellFailure: 5,
  },
  {
    name: "Leather Armor",
    type: "ARMOR",
    costCp: 1000,
    weight: 15,
    armorCategory: "LIGHT",
    acBonus: 2,
    maxDexBonus: 6,
    armorCheckPenalty: 0,
    spellFailure: 10,
  },
  {
    name: "Chain Shirt",
    type: "ARMOR",
    costCp: 10000,
    weight: 25,
    armorCategory: "LIGHT",
    acBonus: 4,
    maxDexBonus: 4,
    armorCheckPenalty: 2,
    spellFailure: 20,
  },
  {
    name: "Breastplate",
    type: "ARMOR",
    costCp: 20000,
    weight: 30,
    armorCategory: "MEDIUM",
    acBonus: 6,
    maxDexBonus: 3,
    armorCheckPenalty: 4,
    spellFailure: 25,
  },
  {
    name: "Full Plate",
    type: "ARMOR",
    costCp: 150000,
    weight: 50,
    armorCategory: "HEAVY",
    acBonus: 9,
    maxDexBonus: 1,
    armorCheckPenalty: 6,
    spellFailure: 35,
  },
  {
    name: "Heavy Steel Shield",
    type: "SHIELD",
    costCp: 2000,
    weight: 15,
    acBonus: 2,
    armorCheckPenalty: 2,
    spellFailure: 15,
  },
  {
    name: "Light Wooden Shield",
    type: "SHIELD",
    costCp: 300,
    weight: 5,
    acBonus: 1,
    armorCheckPenalty: 1,
    spellFailure: 5,
  },
  { name: "Backpack", type: "GEAR", costCp: 200, weight: 2 },
  { name: "Bedroll", type: "GEAR", costCp: 10, weight: 5 },
  { name: "Rope, hemp (50 ft.)", type: "GEAR", costCp: 100, weight: 10 },
  { name: "Torch", type: "GEAR", costCp: 1, weight: 1 },
  {
    name: "Rations, trail (per day)",
    type: "CONSUMABLE",
    costCp: 50,
    weight: 1,
  },
  {
    name: "Potion of Cure Light Wounds",
    type: "CONSUMABLE",
    costCp: 5000,
    weight: 0,
    description: "Drink to heal 1d8+1 hit points.",
  },
  { name: "Arrows (20)", type: "AMMUNITION", costCp: 100, weight: 3 },
];

async function main() {
  console.log("Seeding skills…");
  for (const s of SKILLS) {
    await prisma.skill.upsert({
      where: { system_name: { system: "PATHFINDER_1E", name: s.name } },
      create: {
        name: s.name,
        keyAbility: s.keyAbility,
        trainedOnly: s.trainedOnly ?? false,
        armorCheckPenalty: s.armorCheckPenalty ?? false,
        ...SRD,
      },
      update: {
        keyAbility: s.keyAbility,
        trainedOnly: s.trainedOnly ?? false,
        armorCheckPenalty: s.armorCheckPenalty ?? false,
      },
    });
  }

  console.log("Seeding classes…");
  for (const c of CLASSES) {
    const system = c.system ?? "PATHFINDER_1E";
    const gameClass = await prisma.gameClass.upsert({
      where: {
        system_name_source: { system, name: c.name, source: SRD.source },
      },
      create: {
        system,
        name: c.name,
        hitDie: c.hitDie,
        babProgression: c.babProgression,
        fortProgression: c.fortProgression,
        refProgression: c.refProgression,
        willProgression: c.willProgression,
        skillRanksPerLevel: c.skillRanksPerLevel,
        classSkills: c.classSkills,
        ...SRD,
      },
      update: {
        hitDie: c.hitDie,
        babProgression: c.babProgression,
        skillRanksPerLevel: c.skillRanksPerLevel,
        classSkills: c.classSkills,
      },
    });
    await prisma.classFeature.deleteMany({ where: { classId: gameClass.id } });
    await prisma.classFeature.createMany({
      data: c.features.map((f) => ({
        classId: gameClass.id,
        name: f.name,
        level: f.level,
        description: f.description,
      })),
    });
  }

  console.log("Seeding feats…");
  for (const f of FEATS) {
    await prisma.feat.upsert({
      where: { name_source: { name: f.name, source: SRD.source } },
      create: {
        name: f.name,
        featTypes: f.featTypes,
        prerequisites: f.prerequisites,
        benefit: f.benefit,
        ...SRD,
      },
      update: { featTypes: f.featTypes, benefit: f.benefit },
    });
  }

  console.log("Seeding spells…");
  for (const sp of SPELLS) {
    await prisma.spell.upsert({
      where: { name_source: { name: sp.name, source: SRD.source } },
      create: {
        name: sp.name,
        school: sp.school,
        levels: sp.levels,
        castingTime: sp.castingTime,
        components: sp.components,
        range: sp.range,
        duration: sp.duration,
        savingThrow: sp.savingThrow,
        description: sp.description,
        ...SRD,
      },
      update: { levels: sp.levels, description: sp.description },
    });
  }

  console.log("Seeding spheres and talents…");
  for (const s of SPHERES) {
    await prisma.sphere.upsert({
      where: { name_source: { name: s.name, source: "Spheres of Power" } },
      create: {
        name: s.name,
        type: s.type,
        description: s.description,
        source: "Spheres of Power",
        isSrd: true,
      },
      update: { description: s.description },
    });
  }
  for (const t of TALENTS) {
    const sphere = await prisma.sphere.findFirst({
      where: { name: t.sphereName },
    });
    await prisma.talent.upsert({
      where: { name_source: { name: t.name, source: "Spheres of Power" } },
      create: {
        name: t.name,
        sphereId: sphere?.id ?? null,
        sphereName: t.sphereName,
        talentTypes: t.talentTypes,
        prerequisites: t.prerequisites,
        description: t.description,
        source: "Spheres of Power",
        isSrd: true,
      },
      update: { description: t.description, sphereId: sphere?.id ?? null },
    });
  }

  console.log("Seeding equipment…");
  for (const it of ITEMS) {
    await prisma.item.upsert({
      where: {
        system_name_source: {
          system: "PATHFINDER_1E",
          name: it.name,
          source: SRD.source,
        },
      },
      create: {
        name: it.name,
        type: it.type,
        costCp: it.costCp,
        weight: it.weight,
        description: it.description ?? "",
        weaponCategory: it.weaponCategory ?? null,
        damage: it.damage ?? null,
        damageType: it.damageType ?? null,
        critRange: it.critRange ?? null,
        critMultiplier: it.critMultiplier ?? null,
        rangeIncrement: it.rangeIncrement ?? null,
        armorCategory: it.armorCategory ?? null,
        acBonus: it.acBonus ?? null,
        maxDexBonus: it.maxDexBonus ?? null,
        armorCheckPenalty: it.armorCheckPenalty ?? null,
        spellFailure: it.spellFailure ?? null,
        ...SRD,
      },
      update: { costCp: it.costCp, weight: it.weight },
    });
  }

  const counts = {
    skills: await prisma.skill.count(),
    classes: await prisma.gameClass.count(),
    feats: await prisma.feat.count(),
    spells: await prisma.spell.count(),
    spheres: await prisma.sphere.count(),
    talents: await prisma.talent.count(),
    items: await prisma.item.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
