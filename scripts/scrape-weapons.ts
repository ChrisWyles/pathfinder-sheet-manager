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
  parseWeightLb,
} from "./pfsrd-html";

/**
 * Scrape the core weapon tables from
 * https://www.d20pfsrd.com/equipment/weapons/
 *
 * The page lists weapons in a series of <table>s, each headed by a first
 * column like "(Simple)Light Melee Weapons" or "(Martial)Ranged Weapons" —
 * that prefix gives the proficiency category, the remainder the subcategory.
 * Ammunition subtables are captured as ITEM type AMMUNITION rather than
 * WEAPON. Non-weapon tables on the page (FAQ, Weapon Qualities, etc.) don't
 * match the "(Category)..." heading pattern and are skipped.
 *
 *   npm run scrape:weapons
 *   npm run scrape:weapons -- --write-db
 *
 * Output: data/items/weapons.json
 * HTML cached under .cache/pfsrd/ (git-ignored).
 */

const URL = "https://www.d20pfsrd.com/equipment/weapons/";
const OUT_DIR = "data/items";
const SOURCE = "d20pfsrd (Core Weapons)";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(`--${f}`);
const REFRESH = has("refresh");
const WRITE_DB = has("write-db");

type WeaponCategory = "SIMPLE" | "MARTIAL" | "EXOTIC";

interface ScrapedWeapon {
  name: string;
  type: "WEAPON" | "AMMUNITION";
  weaponCategory: WeaponCategory;
  subcategory: string;
  damage: string;
  damageSmall: string;
  damageType: string;
  critRange: number;
  critMultiplier: number;
  rangeIncrement: number | null;
  costCp: number;
  weight: number;
  special: string;
  sourceUrl: string;
  bookSource: string;
}

function parseCritical(raw: string): { critRange: number; critMultiplier: number } {
  const text = cleanText(raw);
  const rangeMatch = text.match(/(\d+)-20/);
  const multMatch = text.match(/x(\d+)/i);
  return {
    critRange: rangeMatch ? Number(rangeMatch[1]) : 20,
    critMultiplier: multMatch ? Number(multMatch[1]) : 2,
  };
}

function parseWeaponTables(html: string): ScrapedWeapon[] {
  const $ = cheerio.load(html);
  const content = $("#page-content, .page-content, article").first();
  const out: ScrapedWeapon[] = [];

  content.find("table").each((_i, table) => {
    const firstHeader = cleanText($(table).find("tr").first().find("th").first().text());
    const headingMatch = firstHeader.match(/^\((Simple|Martial|Exotic)\)(.+)$/i);
    if (!headingMatch) return;

    const weaponCategory = headingMatch[1].toUpperCase() as WeaponCategory;
    const subcategory = cleanText(headingMatch[2]);
    const isAmmunition = /ammunition/i.test(subcategory);

    $(table)
      .find("tr")
      .each((_j, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 10) return;
        const text = (i: number) => cleanText($(cells[i]).text());

        const rawName = text(0);
        if (!rawName) return;
        const { critRange, critMultiplier } = parseCritical(text(4));

        out.push({
          name: cleanName(rawName),
          type: isAmmunition ? "AMMUNITION" : "WEAPON",
          weaponCategory,
          subcategory,
          damage: text(3),
          damageSmall: text(2),
          damageType: text(7),
          critRange,
          critMultiplier,
          rangeIncrement: parseLeadingInt(text(5)),
          costCp: parseCostCp(text(1)),
          weight: parseWeightLb(text(6)),
          special: text(8),
          sourceUrl: $(cells[0]).find("a").attr("href") ?? URL,
          bookSource: text(9),
        });
      });
  });

  return out;
}

async function writeToDb(weapons: ScrapedWeapon[]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgUrl(
        process.env.DATABASE_URL || process.env.DIRECT_URL || "",
      ),
    }),
  });
  try {
    for (const w of weapons) {
      await prisma.item.upsert({
        where: { system_name_source: { system: "PATHFINDER_1E", name: w.name, source: SOURCE } },
        create: {
          name: w.name,
          type: w.type,
          costCp: w.costCp,
          weight: w.weight,
          weaponCategory: w.weaponCategory,
          damage: w.damage,
          damageType: w.damageType,
          critRange: w.critRange,
          critMultiplier: w.critMultiplier,
          rangeIncrement: w.rangeIncrement,
          source: SOURCE,
          isSrd: true,
          data: {
            subcategory: w.subcategory,
            damageSmall: w.damageSmall,
            special: w.special,
            sourceUrl: w.sourceUrl,
            bookSource: w.bookSource,
          },
        },
        update: {
          type: w.type,
          costCp: w.costCp,
          weight: w.weight,
          weaponCategory: w.weaponCategory,
          damage: w.damage,
          damageType: w.damageType,
          critRange: w.critRange,
          critMultiplier: w.critMultiplier,
          rangeIncrement: w.rangeIncrement,
          data: {
            subcategory: w.subcategory,
            damageSmall: w.damageSmall,
            special: w.special,
            sourceUrl: w.sourceUrl,
            bookSource: w.bookSource,
          },
        },
      });
    }
    console.log(`  db: ${weapons.length} weapons/ammunition`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const html = await getHtmlCached(URL, "weapons", REFRESH);
  const weapons = parseWeaponTables(html);
  const ammoCount = weapons.filter((w) => w.type === "AMMUNITION").length;
  console.log(
    `Weapons: ${weapons.length} rows (${weapons.length - ammoCount} weapons, ${ammoCount} ammunition).`,
  );
  await writeFile(
    join(OUT_DIR, "weapons.json"),
    JSON.stringify(weapons, null, 2) + "\n",
  );

  if (WRITE_DB) {
    console.log("\nWriting to database…");
    await writeToDb(weapons);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
