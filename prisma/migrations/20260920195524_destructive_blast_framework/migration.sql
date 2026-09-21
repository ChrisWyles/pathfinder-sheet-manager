ALTER TABLE "Character" ADD COLUMN "martialFocus" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CharacterAction" ADD COLUMN "sphereName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CharacterAction" ADD COLUMN "sphereConfig" JSONB NOT NULL DEFAULT '{}';
