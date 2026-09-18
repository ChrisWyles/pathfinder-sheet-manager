-- AlterTable: deep links to each feat/talent's entry on the source wiki page.
ALTER TABLE "Feat" ADD COLUMN "sourceUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Talent" ADD COLUMN "sourceUrl" TEXT NOT NULL DEFAULT '';
