-- Replace the flat roll1/roll2 label+dice+modifier columns with structured
-- JSON roll slots supporting dice-count scaling and multiple modifiers.
-- CharacterAction shipped in the previous migration with no rows yet, so
-- this drops and re-adds rather than migrating data.
ALTER TABLE "CharacterAction" DROP COLUMN "roll1Label";
ALTER TABLE "CharacterAction" DROP COLUMN "roll1Dice";
ALTER TABLE "CharacterAction" DROP COLUMN "roll1Modifier";
ALTER TABLE "CharacterAction" DROP COLUMN "roll2Label";
ALTER TABLE "CharacterAction" DROP COLUMN "roll2Dice";
ALTER TABLE "CharacterAction" DROP COLUMN "roll2Modifier";

ALTER TABLE "CharacterAction" ADD COLUMN "roll1" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "CharacterAction" ADD COLUMN "roll2" JSONB NOT NULL DEFAULT '{}';
