-- CreateEnum
CREATE TYPE "RulesSystem" AS ENUM ('PATHFINDER_1E', 'SPHERES_OF_POWER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Ability" AS ENUM ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA');

-- CreateEnum
CREATE TYPE "CreatureSize" AS ENUM ('FINE', 'DIMINUTIVE', 'TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN', 'COLOSSAL');

-- CreateEnum
CREATE TYPE "Progression" AS ENUM ('GOOD', 'POOR');

-- CreateEnum
CREATE TYPE "BabProgression" AS ENUM ('FULL', 'THREE_QUARTER', 'HALF');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'SHIELD', 'GEAR', 'CONSUMABLE', 'TOOL', 'WONDROUS', 'RING', 'ROD', 'STAFF', 'WAND', 'POTION', 'SCROLL', 'AMMUNITION', 'TREASURE', 'OTHER');

-- CreateEnum
CREATE TYPE "WeaponCategory" AS ENUM ('SIMPLE', 'MARTIAL', 'EXOTIC', 'NATURAL');

-- CreateEnum
CREATE TYPE "ArmorCategory" AS ENUM ('NONE', 'LIGHT', 'MEDIUM', 'HEAVY');

-- CreateEnum
CREATE TYPE "SphereType" AS ENUM ('MAGIC', 'MIGHT');

-- CreateEnum
CREATE TYPE "RollKind" AS ENUM ('ATTACK', 'DAMAGE', 'SAVE', 'SKILL', 'ABILITY_CHECK', 'INITIATIVE', 'CONCENTRATION', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system" "RulesSystem" NOT NULL,
    "race" TEXT NOT NULL DEFAULT '',
    "alignment" TEXT NOT NULL DEFAULT '',
    "deity" TEXT NOT NULL DEFAULT '',
    "size" "CreatureSize" NOT NULL DEFAULT 'MEDIUM',
    "gender" TEXT NOT NULL DEFAULT '',
    "age" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "baseSpeed" INTEGER NOT NULL DEFAULT 30,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "constitution" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "wisdom" INTEGER NOT NULL DEFAULT 10,
    "charisma" INTEGER NOT NULL DEFAULT 10,
    "abilityModifiers" JSONB NOT NULL DEFAULT '{}',
    "maxHp" INTEGER NOT NULL DEFAULT 0,
    "currentHp" INTEGER NOT NULL DEFAULT 0,
    "tempHp" INTEGER NOT NULL DEFAULT 0,
    "nonlethal" INTEGER NOT NULL DEFAULT 0,
    "hpRolls" JSONB NOT NULL DEFAULT '[]',
    "modifiers" JSONB NOT NULL DEFAULT '{}',
    "spellPoints" INTEGER,
    "maxSpellPoints" INTEGER,
    "discordWebhookUrl" TEXT,
    "discordWebhookLabel" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterClass" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "gameClassId" TEXT,
    "name" TEXT NOT NULL,
    "levels" INTEGER NOT NULL DEFAULT 1,
    "archetype" TEXT NOT NULL DEFAULT '',
    "isFavoredClass" BOOLEAN NOT NULL DEFAULT false,
    "hitDie" INTEGER NOT NULL DEFAULT 8,
    "skillRanksPerLevel" INTEGER NOT NULL DEFAULT 2,
    "babProgression" "BabProgression" NOT NULL DEFAULT 'THREE_QUARTER',
    "fortProgression" "Progression" NOT NULL DEFAULT 'POOR',
    "refProgression" "Progression" NOT NULL DEFAULT 'POOR',
    "willProgression" "Progression" NOT NULL DEFAULT 'POOR',
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CharacterClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkillRank" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "ranks" INTEGER NOT NULL DEFAULT 0,
    "isClassSkill" BOOLEAN NOT NULL DEFAULT false,
    "miscMod" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CharacterSkillRank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterFeat" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "featId" TEXT,
    "name" TEXT NOT NULL,
    "takenAtLevel" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CharacterFeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSpell" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "spellId" TEXT,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "known" BOOLEAN NOT NULL DEFAULT true,
    "prepared" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CharacterSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSphere" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "sphereId" TEXT,
    "name" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CharacterSphere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterTalent" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "talentId" TEXT,
    "name" TEXT NOT NULL,
    "sphereName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CharacterTalent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costCp" INTEGER NOT NULL DEFAULT 0,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "slot" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "customData" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameClass" (
    "id" TEXT NOT NULL,
    "system" "RulesSystem" NOT NULL DEFAULT 'PATHFINDER_1E',
    "name" TEXT NOT NULL,
    "hitDie" INTEGER NOT NULL DEFAULT 8,
    "babProgression" "BabProgression" NOT NULL DEFAULT 'THREE_QUARTER',
    "fortProgression" "Progression" NOT NULL DEFAULT 'POOR',
    "refProgression" "Progression" NOT NULL DEFAULT 'POOR',
    "willProgression" "Progression" NOT NULL DEFAULT 'POOR',
    "skillRanksPerLevel" INTEGER NOT NULL DEFAULT 2,
    "classSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassFeature" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ClassFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "system" "RulesSystem" NOT NULL DEFAULT 'PATHFINDER_1E',
    "name" TEXT NOT NULL,
    "keyAbility" "Ability" NOT NULL,
    "trainedOnly" BOOLEAN NOT NULL DEFAULT false,
    "armorCheckPenalty" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "featTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prerequisites" TEXT NOT NULL DEFAULT '',
    "benefit" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school" TEXT NOT NULL DEFAULT '',
    "subschool" TEXT NOT NULL DEFAULT '',
    "descriptors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "levels" JSONB NOT NULL DEFAULT '{}',
    "castingTime" TEXT NOT NULL DEFAULT '',
    "components" TEXT NOT NULL DEFAULT '',
    "range" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "savingThrow" TEXT NOT NULL DEFAULT '',
    "spellResistance" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sphere" (
    "id" TEXT NOT NULL,
    "type" "SphereType" NOT NULL DEFAULT 'MAGIC',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sphere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "sphereId" TEXT,
    "name" TEXT NOT NULL,
    "sphereName" TEXT NOT NULL DEFAULT '',
    "talentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prerequisites" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "system" "RulesSystem" NOT NULL DEFAULT 'PATHFINDER_1E',
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL DEFAULT 'GEAR',
    "description" TEXT NOT NULL DEFAULT '',
    "costCp" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weaponCategory" "WeaponCategory",
    "damage" TEXT,
    "damageType" TEXT,
    "critRange" INTEGER DEFAULT 20,
    "critMultiplier" INTEGER DEFAULT 2,
    "rangeIncrement" INTEGER,
    "armorCategory" "ArmorCategory",
    "acBonus" INTEGER,
    "maxDexBonus" INTEGER,
    "armorCheckPenalty" INTEGER,
    "spellFailure" INTEGER,
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RollKind" NOT NULL,
    "label" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "dice" JSONB NOT NULL DEFAULT '[]',
    "discordDelivered" BOOLEAN NOT NULL DEFAULT false,
    "discordError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- CreateIndex
CREATE INDEX "CharacterClass_characterId_idx" ON "CharacterClass"("characterId");

-- CreateIndex
CREATE INDEX "CharacterSkillRank_characterId_idx" ON "CharacterSkillRank"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkillRank_characterId_skillId_key" ON "CharacterSkillRank"("characterId", "skillId");

-- CreateIndex
CREATE INDEX "CharacterFeat_characterId_idx" ON "CharacterFeat"("characterId");

-- CreateIndex
CREATE INDEX "CharacterSpell_characterId_idx" ON "CharacterSpell"("characterId");

-- CreateIndex
CREATE INDEX "CharacterSphere_characterId_idx" ON "CharacterSphere"("characterId");

-- CreateIndex
CREATE INDEX "CharacterTalent_characterId_idx" ON "CharacterTalent"("characterId");

-- CreateIndex
CREATE INDEX "InventoryItem_characterId_idx" ON "InventoryItem"("characterId");

-- CreateIndex
CREATE INDEX "GameClass_name_idx" ON "GameClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GameClass_system_name_source_key" ON "GameClass"("system", "name", "source");

-- CreateIndex
CREATE INDEX "ClassFeature_classId_idx" ON "ClassFeature"("classId");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_system_name_key" ON "Skill"("system", "name");

-- CreateIndex
CREATE INDEX "Feat_name_idx" ON "Feat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Feat_name_source_key" ON "Feat"("name", "source");

-- CreateIndex
CREATE INDEX "Spell_name_idx" ON "Spell"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Spell_name_source_key" ON "Spell"("name", "source");

-- CreateIndex
CREATE INDEX "Sphere_name_idx" ON "Sphere"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sphere_name_source_key" ON "Sphere"("name", "source");

-- CreateIndex
CREATE INDEX "Talent_name_idx" ON "Talent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_name_source_key" ON "Talent"("name", "source");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Item_system_name_source_key" ON "Item"("system", "name", "source");

-- CreateIndex
CREATE INDEX "RollLog_characterId_createdAt_idx" ON "RollLog"("characterId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterClass" ADD CONSTRAINT "CharacterClass_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterClass" ADD CONSTRAINT "CharacterClass_gameClassId_fkey" FOREIGN KEY ("gameClassId") REFERENCES "GameClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkillRank" ADD CONSTRAINT "CharacterSkillRank_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkillRank" ADD CONSTRAINT "CharacterSkillRank_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFeat" ADD CONSTRAINT "CharacterFeat_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFeat" ADD CONSTRAINT "CharacterFeat_featId_fkey" FOREIGN KEY ("featId") REFERENCES "Feat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSphere" ADD CONSTRAINT "CharacterSphere_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSphere" ADD CONSTRAINT "CharacterSphere_sphereId_fkey" FOREIGN KEY ("sphereId") REFERENCES "Sphere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTalent" ADD CONSTRAINT "CharacterTalent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTalent" ADD CONSTRAINT "CharacterTalent_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameClass" ADD CONSTRAINT "GameClass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeature" ADD CONSTRAINT "ClassFeature_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GameClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feat" ADD CONSTRAINT "Feat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sphere" ADD CONSTRAINT "Sphere_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talent" ADD CONSTRAINT "Talent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talent" ADD CONSTRAINT "Talent_sphereId_fkey" FOREIGN KEY ("sphereId") REFERENCES "Sphere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollLog" ADD CONSTRAINT "RollLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollLog" ADD CONSTRAINT "RollLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
