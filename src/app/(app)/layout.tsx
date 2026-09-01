import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth-helpers";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/dashboard" className="font-semibold">
            Pathfinder Sheet Manager
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {session.user.name ?? session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
