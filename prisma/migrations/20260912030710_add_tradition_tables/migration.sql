-- CreateEnum
CREATE TYPE "TraditionKind" AS ENUM ('CASTING', 'MARTIAL');

-- CreateTable
CREATE TABLE "TraditionDrawback" (
    "id" TEXT NOT NULL,
    "kind" "TraditionKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sphereName" TEXT NOT NULL DEFAULT '',
    "costInDrawbacks" INTEGER NOT NULL DEFAULT 1,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incompatibleWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraditionDrawback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraditionBoon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "costInDrawbacks" INTEGER NOT NULL DEFAULT 2,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "grants" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT '',
    "isSrd" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraditionBoon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TraditionDrawback_kind_idx" ON "TraditionDrawback"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "TraditionDrawback_kind_name_sphereName_key" ON "TraditionDrawback"("kind", "name", "sphereName");

-- CreateIndex
CREATE UNIQUE INDEX "TraditionBoon_name_key" ON "TraditionBoon"("name");
