import type { Metadata } from "next";

import { CreateCharacterForm } from "@/components/character/create-form";
import { requireSession } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "New character" };

export default async function NewCharacterPage() {
  await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New character</h1>
        <p className="text-muted-foreground">
          The essentials now; feats, skills, spells and gear are edited on the
          sheet. Derived stats calculate automatically.
        </p>
      </div>
      <CreateCharacterForm />
    </div>
  );
}
