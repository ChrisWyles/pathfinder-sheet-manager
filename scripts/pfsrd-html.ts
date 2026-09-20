import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Shared fetch/parse helpers for scraping d20pfsrd equipment tables. */

export const CACHE_DIR = ".cache/pfsrd";
export const USER_AGENT =
  "pathfinder-sheet-manager scraper (+https://github.com/ChrisWyles/pathfinder-sheet-manager; contact chris.d.wyles@gmail.com)";
const DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getHtmlCached(
  url: string,
  cacheName: string,
  refresh: boolean,
): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cached = join(CACHE_DIR, `${cacheName}.html`);
  if (!refresh && existsSync(cached)) return readFile(cached, "utf8");
  process.stdout.write(`  fetch ${url} … `);
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const html = await res.text();
  await writeFile(cached, html);
  console.log(`${(html.length / 1024).toFixed(0)} KB`);
  await sleep(DELAY_MS);
  return html;
}

export function cleanText(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips a trailing footnote marker (e.g. "Armored kilt*" -> "Armored kilt"). */
export function cleanName(raw: string): string {
  return cleanText(raw).replace(/\*+$/, "").trim();
}

/** Parses a cost cell ("1,200 gp", "5 sp", "5 cp", "—", "special") to copper pieces. */
export function parseCostCp(raw: string): number {
  const text = cleanText(raw).replace(/,/g, "");
  const match = text.match(/([\d.]+)\s*(gp|sp|cp)/i);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const perCp = unit === "gp" ? 100 : unit === "sp" ? 10 : 1;
  return Math.round(value * perCp);
}

/** Parses a weight cell ("20 lbs.", "1 lb.", "—") to pounds. */
export function parseWeightLb(raw: string): number {
  const match = cleanText(raw).match(/([\d.]+)/);
  return match ? Number(match[1]) : 0;
}

/** Parses the first integer found in a cell, or null for "—" / non-numeric text. */
export function parseLeadingInt(raw: string): number | null {
  const match = cleanText(raw).match(/(-?\d+)/);
  return match ? Number(match[1]) : null;
}

/** Same as parseLeadingInt but always returns a non-negative magnitude, default 0. */
export function parseMagnitude(raw: string): number {
  const n = parseLeadingInt(raw);
  return n === null ? 0 : Math.abs(n);
}
