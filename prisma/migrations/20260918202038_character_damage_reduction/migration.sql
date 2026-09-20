-- AlterTable: freeform damage reduction text (e.g. "10/magic") — entered by
-- hand since DR bypass types vary too much to derive.
ALTER TABLE "Character" ADD COLUMN "damageReduction" TEXT NOT NULL DEFAULT '';
