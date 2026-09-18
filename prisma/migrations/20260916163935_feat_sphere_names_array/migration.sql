-- AlterTable: a feat can genuinely require (or offer a choice of) more than
-- one magic sphere, so replace the single `sphereName` column with a
-- `sphereNames` array, preserving any existing single value.
ALTER TABLE "Feat" ADD COLUMN "sphereNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Feat"
SET "sphereNames" = ARRAY["sphereName"]::TEXT[]
WHERE "sphereName" IS NOT NULL AND "sphereName" <> '';

ALTER TABLE "Feat" DROP COLUMN "sphereName";
