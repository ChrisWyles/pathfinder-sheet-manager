# Pathfinder Sheet Manager

An interactive character sheet manager for **Pathfinder 1e** and **Spheres of
Power**. Sign in with Discord, build a character, level it up with guidance, and
send every roll to your table's Discord channel with a full breakdown.

## Features

| Area | Status |
| --- | --- |
| Discord OAuth sign-in | ✅ working |
| Character creation (system, identity, class chassis, abilities, Discord webhook) | ✅ working |
| Automatic derived stats — AC/touch/flat-footed, saves, BAB & iteratives, CMB/CMD, initiative, skill totals | ✅ working |
| Server-side dice roller with per-roll modifier breakdown | ✅ working |
| Rolls posted to a per-character Discord webhook | ✅ working |
| Roll history | ✅ working |
| Rules library (skills, classes + features, feats, spells, spheres, talents, equipment) | ✅ schema + seed |
| Bulk import from the Foundry VTT `pf1` dataset | 🚧 `scripts/import-foundry.ts` skeleton |
| Spheres of Power / Might / Guile data | ✅ scraped to `data/spheres/*.json` (62 spheres, ~3,150 talents) via `scripts/scrape-spheres.ts`; `--write-db` to load |
| Guided step-by-step creation wizard | 🚧 single-page form today |
| Guided level-up | 🚧 checklist today |
| Add / edit inventory and custom items in the UI | 🚧 schema ready, UI pending |

## Tech stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter → **Neon** Postgres
- **Auth.js v5** (NextAuth) with the Discord provider and database sessions
- **Tailwind v4** + **shadcn/ui** (Base UI)
- **Vitest** for unit tests, **Playwright** for e2e smoke tests
- `@dice-roller/rpg-dice-roller` for dice notation

## Getting started

### 1. Prerequisites

- Node.js 20.9+ (22 LTS recommended)
- A Neon project (free tier) — https://neon.tech
- A Discord application for OAuth — https://discord.com/developers/applications

### 2. Environment

```bash
cp .env.example .env
```

Fill in:

- `DATABASE_URL` — Neon **pooled** connection string (used by the app at runtime)
- `DIRECT_URL` — Neon **direct** connection string (used by Prisma migrations)
- `AUTH_SECRET` — `npx auth secret` or `openssl rand -base64 32`
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` — from your Discord app's OAuth2 tab
  - add redirect URL `http://localhost:3000/api/auth/callback/discord`

### 3. Install and set up the database

```bash
npm install
npm run db:migrate      # create the schema in your database
npm run db:seed         # load the starter rules library
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest unit tests |
| `npm run test:e2e` | Playwright smoke tests (needs a build first) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run db:seed` | Seed the rules library |
| `npm run db:studio` | Prisma Studio |
| `npm run import:foundry -- --packs <dir>` | Bulk-import Foundry `pf1` data |
| `npm run scrape:spheres [-- --only <slug>] [--write-db]` | Scrape Spheres data from the community wiki into `data/spheres/` (and optionally the DB) |

## Deployment (Vercel + Neon)

1. Import the repo into Vercel.
2. Set the environment variables from `.env.example` in the Vercel project
   (use the Neon **pooled** URL for `DATABASE_URL`).
3. Add `npm run db:deploy` as a build step or run it from CI against production.
4. Add your production callback URL to the Discord app:
   `https://<your-domain>/api/auth/callback/discord`.

## Rules content & licensing

The application **code** is MIT licensed (see `LICENSE`).

Game rules content is **Open Game Content** under the Open Game License v1.0a.
See `OPEN_GAME_LICENSE.txt` and `ATTRIBUTION.md`. Product Identity (setting
names, iconic characters, adventure text, artwork) is **not** included and must
not be added.

## Notes

- `package.json` `overrides` pin `mysql2` and `deepmerge-ts` above known
  advisories in Prisma 7's CLI-only dependency tree. `npm audit` is clean.
- `package.json` `allowScripts` is npm 12's install-script allowlist — it lists
  the trusted packages (Prisma, esbuild) whose post-install scripts may run.

## Project layout

```
prisma/
  schema.prisma        data model
  seed.ts              starter rules library
src/
  auth.ts              NextAuth config (Discord)
  app/                 routes (App Router)
  components/          UI (shadcn/ui + character sheet pieces)
  lib/
    rules/             pure PF1e math: abilities, progressions, size, derived, skills
    dice/              dice roller + roll builders
    discord/           webhook client + embed formatting
    rolls/             authoritative server-side roll + intent schema
scripts/
  import-foundry.ts    bulk data importer (skeleton)
  scrape-spheres.ts    Spheres of Power/Might/Guile wiki scraper
data/
  spheres/*.json       scraped sphere + talent data (one file per sphere)
```
