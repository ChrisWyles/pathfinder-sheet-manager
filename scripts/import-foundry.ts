import "../load-env";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { normalizePgUrl } from "../src/lib/pg-url";

/**
 * Bulk-import rules content from the Foundry VTT `pf1` game system and the
 * "Pathfinder 1e Spheres" module.
 *
 * The Foundry `pf1` system ships its compendium packs as newline-delimited JSON
 * (one document per line) under `packs/<pack-name>/`. Clone or download a
 * release, then point this script at the extracted `packs` directory:
 *
 *   npm run import:foundry -- --packs "C:/path/to/pf1/packs" --dry-run
 *   npm run import:foundry -- --packs "C:/path/to/pf1/packs"
 *
 * Mapping is intentionally conservative: unknown fields are dropped into the
 * `data` JSON column so nothing is lost, and every row is marked with its
 * source for OGL attribution. See ATTRIBUTION.md.
 *
 * TODO: extend the per-type mappers below as coverage grows (spells' per-class
 * levels, class feature tables, weapon/armor sub-stats, sphere talent types).
 */

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const PACKS_DIR = flag("packs");
const DRY_RUN = args.includes("--dry-run");

const connectionString = normalizePgUrl(
  process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    "",
);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type FoundryDoc = {
  name?: string;
  type?: string;
  system?: Record<string, unknown>;
  [k: string]: unknown;
};

async function readPack(dir: string): Promise<FoundryDoc[]> {
  const raw = await readFile(dir, "utf8");
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as FoundryDoc);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

// --- Per-type mappers ------------------------------------------------------

async function importFeat(doc: FoundryDoc) {
  const name = str(doc.name);
  if (!name) return;
  const sys = doc.system ?? {};
  const source = "Foundry pf1";
  const row = {
    name,
    featTypes: Array.isArray((sys.tags as unknown[]) ?? [])
      ? ((sys.tags as string[]) ?? [])
      : [],
    prerequisites: str((sys as Record<string, unknown>).prerequisites),
    benefit: str((sys as Record<string, unknown>).description),
    source,
    isSrd: true,
    data: doc as unknown as object,
  };
  if (DRY_RUN) return console.log("feat", name);
  await prisma.feat.upsert({
    where: { name_source: { name, source } },
    create: row,
    update: { benefit: row.benefit, data: row.data },
  });
}

async function importSpell(doc: FoundryDoc) {
  const name = str(doc.name);
  if (!name) return;
  const source = "Foundry pf1";
  if (DRY_RUN) return console.log("spell", name);
  await prisma.spell.upsert({
    where: { name_source: { name, source } },
    create: { name, source, isSrd: true, data: doc as unknown as object },
    update: { data: doc as unknown as object },
  });
}

async function importItem(doc: FoundryDoc) {
  const name = str(doc.name);
  if (!name) return;
  const source = "Foundry pf1";
  const type = mapItemType(str(doc.type));
  if (DRY_RUN) return console.log("item", name, type);
  await prisma.item.upsert({
    where: {
      system_name_source: { system: "PATHFINDER_1E", name, source },
    },
    create: {
      name,
      type,
      source,
      isSrd: true,
      data: doc as unknown as object,
    },
    update: { data: doc as unknown as object },
  });
}

function mapItemType(foundryType: string) {
  switch (foundryType) {
    case "weapon":
      return "WEAPON" as const;
    case "equipment":
      return "ARMOR" as const;
    case "consumable":
      return "CONSUMABLE" as const;
    case "loot":
      return "TREASURE" as const;
    default:
      return "GEAR" as const;
  }
}

const PACK_HANDLERS: Record<string, (doc: FoundryDoc) => Promise<void>> = {
  feats: importFeat,
  spells: importSpell,
  items: importItem,
  weapons: importItem,
  armors: importItem,
  commonbuffs: async () => {},
};

async function main() {
  if (!PACKS_DIR) {
    console.error(
      "Missing --packs <dir>. See the comment at the top of this file.",
    );
    process.exitCode = 1;
    return;
  }

  const entries = await readdir(PACKS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    const key = Object.keys(PACK_HANDLERS).find((k) =>
      entry.name.toLowerCase().includes(k),
    );
    if (!key) {
      console.log(`Skipping unrecognised pack: ${entry.name}`);
      continue;
    }
    const handler = PACK_HANDLERS[key];
    const path = entry.isDirectory()
      ? join(PACKS_DIR, entry.name, "_source.json")
      : join(PACKS_DIR, entry.name);
    try {
      const docs = await readPack(path);
      console.log(`${entry.name}: ${docs.length} documents`);
      for (const doc of docs) await handler(doc);
    } catch (err) {
      console.warn(`Could not read ${path}:`, (err as Error).message);
    }
  }

  console.log(DRY_RUN ? "Dry run complete." : "Import complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
