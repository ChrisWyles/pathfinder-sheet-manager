import { z } from "zod";

/**
 * Server-side environment. Import from server code only. Validated lazily so a
 * missing value fails at first use with a clear message rather than at module
 * load during the build.
 */
const serverSchema = z.object({
  DATABASE_URL: z.url(),
  // Unpooled connection for migrations. `DIRECT_URL` when set by hand;
  // `DATABASE_URL_UNPOOLED` when provisioned by the Neon CLI (`neon deploy`).
  DIRECT_URL: z.url().optional(),
  DATABASE_URL_UNPOOLED: z.url().optional(),
  AUTH_SECRET: z.string().min(1),
  AUTH_DISCORD_ID: z.string().min(1),
  AUTH_DISCORD_SECRET: z.string().min(1),
  AUTH_URL: z.url().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
