import { redirect } from "next/navigation";

import { auth } from "@/auth";

/** Server-only. Returns the signed-in session or redirects to /signin. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  return session;
}
