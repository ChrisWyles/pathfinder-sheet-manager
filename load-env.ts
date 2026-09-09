import { config } from "dotenv";

/**
 * Env loader for Node-side tooling (Prisma CLI, seed, import scripts).
 *
 * Order matters: `.env.local` is loaded first and wins, because that's the file
 * the Neon CLI (`neon deploy`) writes provisioned connection strings into.
 * `.env` is the committed-example target and the fallback. Next.js loads both
 * automatically for the app itself; these scripts do not, hence this shim.
 *
 * `dotenv` never overrides an already-set variable, so first-loaded wins.
 */
config({ path: ".env.local" });
config({ path: ".env" });
