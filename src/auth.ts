import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The generated Prisma 7 client is structurally a PrismaClient; the adapter's
  // published types predate the driver-adapter client shape.
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  session: { strategy: "database" },
  providers: [
    Discord({
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+email",
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: string }).role ?? "USER";
      }
      return session;
    },
  },
});
