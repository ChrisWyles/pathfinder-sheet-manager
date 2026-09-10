import "./load-env";

import { defineConfig } from "prisma/config";

import { normalizePgUrl } from "./src/lib/pg-url";

/**
 * Prisma 7 moves connection config out of `schema.prisma`.
 *
 * - `datasource.url` is the connection the Prisma CLI uses for
 *   `migrate` / `db push` / `db pull`. It should be Neon's DIRECT (unpooled)
 *   connection — `DATABASE_URL_UNPOOLED` when provisioned by `neon deploy`,
 *   or `DIRECT_URL` when set by hand.
 * - The application runtime connects via the driver adapter in
 *   `src/lib/prisma.ts`, using the pooled `DATABASE_URL`.
 */
const migrationUrl = normalizePgUrl(
  process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    "",
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
