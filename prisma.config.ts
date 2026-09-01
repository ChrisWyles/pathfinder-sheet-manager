import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moves connection config out of `schema.prisma`.
 *
 * - `datasource.url` is the connection the Prisma CLI uses for
 *   `migrate` / `db push` / `db pull`. Point it at Neon's DIRECT (unpooled)
 *   connection string.
 * - The application runtime connects via the driver adapter in
 *   `src/lib/prisma.ts`, using the pooled `DATABASE_URL`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
