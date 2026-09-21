-- CreateEnum
CREATE TYPE "ActionSpeed" AS ENUM ('FREE', 'SWIFT', 'IMMEDIATE', 'MOVE', 'STANDARD', 'FULL_ROUND');

-- CreateTable
CREATE TABLE "CharacterAction" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "actionSpeed" "ActionSpeed" NOT NULL DEFAULT 'STANDARD',
    "range" TEXT NOT NULL DEFAULT '',
    "roll1Label" TEXT NOT NULL DEFAULT '',
    "roll1Dice" TEXT NOT NULL DEFAULT '',
    "roll1Modifier" INTEGER NOT NULL DEFAULT 0,
    "roll2Label" TEXT NOT NULL DEFAULT '',
    "roll2Dice" TEXT NOT NULL DEFAULT '',
    "roll2Modifier" INTEGER NOT NULL DEFAULT 0,
    "linkedFeatIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "linkedTalentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterAction_characterId_idx" ON "CharacterAction"("characterId");

-- AddForeignKey
ALTER TABLE "CharacterAction" ADD CONSTRAINT "CharacterAction_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
