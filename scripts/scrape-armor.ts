import "../load-env";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

import { normalizePgUrl } from "../src/lib/pg-url";
import {
  cleanName,
  cleanText,
  getHtmlCached,
  parseCostCp,
  parseLeadingInt,
  parseMagnitude,
  parseWeightLb,
} from "./pfsrd-html";

/**
 * Scrape the core armor & shield tables from
 * https://www.d20pfsrd.com/equipment/armor/
 *
 * The page has four relevant <table>s in order: Light Armors, Medium
 * Armors, Heavy Armors, Shields (matched by their first <th> text — a
 * fifth "Extras" table of armor add-ons/modifications, plus a handful of
 * unrelated reference tables further down the page, are deliberately
 * skipped).
 *
 *   npm run scrape:armor
 *   npm run scrape:armor -- --write-db
 *
 * Output: data/items/armor.json
 * HTML cached under .cache/pfsrd/ (git-ignored).
 */

const URL = "https://www.d20pfsrd.com/equipment/armor/";
const OUT_DIR = "data/items";
const SOURCE = "d20pfsrd (Core Armor)";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const REFRESH = has("refresh");
const WRITE_DB = has("write-db");

type ArmorTableKind = "LIGHT" | "MEDIUM" | "HEAVY" | "SHIELD";

const TABLE_HEADINGS: Record<string, ArmorTableKind> = {
  "light armors": "LIGHT",
  "medium armors": "MEDIUM",
  "heavy armors": "HEAVY",
  shields: "SHIELD",
};

interface ScrapedArmor {
  name: string;
  kind: ArmorTableKind;
  acBonus: number;
  maxDexBonus: number | null;
  armorCheckPenalty: number;
  spellFailure: number;
  costCp: number;
  weight: number;
  sourceUrl: string;
  bookSource: string;
}

function parseArmorTables(html: string): ScrapedArmor[] {
  const $ = cheerio.load(html);
  const content = $("#page-content, .page-content, article").first();
  const out: ScrapedArmor[] = [];

  content.find("table").each((_i, table) => {
    const firstHeader = cleanText($(table).find("tr").first().find("th").first().text()).toLowerCase();
    const kind = TABLE_HEADINGS[firstHeader];
    if (!kind) return;

    $(table)
      .find("tr")
      .each((_j, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 9) return;
        const text = (i: number) => cleanText($(cells[i]).text());

        const rawName = text(0);
        if (!rawName) return;

        out.push({
          name: cleanName(rawName),
          kind,
          acBonus: parseMagnitude(text(2)),
          maxDexBonus: parseLeadingInt(text(3)),
          armorCheckPenalty: parseMagnitude(text(4)),
          spellFailure: parseMagnitude(text(5)),
          costCp: parseCostCp(text(1)),
          weight: parseWeightLb(text(8)),
          sourceUrl: $(cells[0]).find("a").attr("href") ?? URL,
          bookSource: text(9),
        });
      });
  });

  return out;
}

async function writeToDb(armors: ScrapedArmor[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const a of armors) {
      const type = a.kind === "SHIELD" ? "SHIELD" : "ARMOR";
      const armorCategory = a.kind === "SHIELD" ? null : a.kind;
      await prisma.item.upsert({
        where: { system_name_source: { system: "PATHFINDER_1E", name: a.name, source: SOURCE } },
        create: {
          name: a.name,
          type,
          costCp: a.costCp,
          weight: a.weight,
          armorCategory,
          acBonus: a.acBonus,
          maxDexBonus: a.maxDexBonus,
          armorCheckPenalty: a.armorCheckPenalty,
          spellFailure: a.spellFailure,
          // Armor/shields don't roll criticals — override the schema's
          // weapon-oriented defaults (20/x2) rather than leaving them on.
          critRange: null,
          critMultiplier: null,
          source: SOURCE,
          isSrd: true,
          data: { sourceUrl: a.sourceUrl, bookSource: a.bookSource },
        },
        update: {
          type,
          costCp: a.costCp,
          weight: a.weight,
          armorCategory,
          acBonus: a.acBonus,
          maxDexBonus: a.maxDexBonus,
          armorCheckPenalty: a.armorCheckPenalty,
          spellFailure: a.spellFailure,
          critRange: null,
          critMultiplier: null,
          data: { sourceUrl: a.sourceUrl, bookSource: a.bookSource },
        },
      });
    }
    console.log(`  db: ${armors.length} armor/shields`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const html = await getHtmlCached(URL, "armor", REFRESH);
  const armors = parseArmorTables(html);
  const shieldCount = armors.filter((a) => a.kind === "SHIELD").length;
  console.log(
    `Armor: ${armors.length} rows (${armors.length - shieldCount} armor, ${shieldCount} shields).`,
  );
  await writeFile(
    join(OUT_DIR, "armor.json"),
    JSON.stringify(armors, null, 2) + "\n",
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(armors);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
