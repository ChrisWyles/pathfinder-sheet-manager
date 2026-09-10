# Attribution & Open Game Content

The **source code** of Pathfinder Sheet Manager is MIT licensed (`LICENSE`).

**Game rules content** — feats, spells, spheres, talents, class tables,
equipment statistics and similar mechanical material that is seeded into or
imported by this project — is **Open Game Content**, used under the **Open Game
License v1.0a** (`OPEN_GAME_LICENSE.txt`).

## What is and isn't included

Included (Open Game Content): rules mechanics, numeric tables, ability/feat/spell
mechanics, equipment stats.

**Not** included and must not be added (Product Identity): setting and place
names, deity names, iconic characters, proper nouns from published adventures,
adventure/flavor prose, logos and artwork.

## Data sources

| Source | Use | Notes |
| --- | --- | --- |
| Pathfinder Roleplaying Game Reference Document (Paizo Inc.) | Seed data in `prisma/seed.ts` (skills, core classes, feats, spells, equipment) | Open Game Content |
| Spheres of Power (Drop Dead Studios) | Seed data (spheres, talents, Spheres class chassis) | Open Game Content |
| Foundry VTT "Pathfinder 1e" game system (`foundryvtt/pf1`) | Target of `scripts/import-foundry.ts` | System code MIT; compendium content is Open Game Content |
| "Pathfinder 1e Spheres" Foundry module | Target of `scripts/import-foundry.ts` | Open Game Content |
| Spheres of Power community wiki (`spheresofpower.wikidot.com`) | Scraped by `scripts/scrape-spheres.ts` into `data/spheres/*.json` | Fan-maintained reproduction of Open Game Content from Spheres of Power / Might / Guile; robots.txt permits crawling. Product Identity is not present on these pages and is not scraped. |

## Section 15 — Copyright Notice

When shipping a build that contains rules content, append these entries to
Section 15 of the Open Game License text in `OPEN_GAME_LICENSE.txt`:

```
Open Game License v 1.0a Copyright 2000, Wizards of the Coast, Inc.

System Reference Document Copyright 2000, Wizards of the Coast, Inc.; Authors
Jonathan Tweet, Monte Cook, Skip Williams, based on material by E. Gary Gygax
and Dave Arneson.

Pathfinder Roleplaying Game Reference Document. © 2011, Paizo Publishing, LLC;
Author: Paizo Publishing, LLC.

Pathfinder Roleplaying Game Core Rulebook. © 2009, Paizo Publishing, LLC;
Author: Jason Bulmahn.

Spheres of Power. © 2014, Drop Dead Studios; Author: Adam Meyers.

Spheres of Might. © 2017, Drop Dead Studios; Author: Adam Meyers.

Spheres of Guile. © 2020, Drop Dead Studios; Author: Adam Meyers.

Pathfinder 1e game system for Foundry Virtual Tabletop. © the FoundryVTT
Pathfinder 1e system contributors.
```

> This attribution list is not exhaustive. Add a Section 15 entry for every
> Open Game Content source you actually import before publishing.
