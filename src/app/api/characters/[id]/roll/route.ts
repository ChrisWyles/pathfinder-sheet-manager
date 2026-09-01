import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { rollIntentSchema } from "@/lib/rolls/intent";
import {
  CharacterNotFoundError,
  performCharacterRoll,
} from "@/lib/rolls/perform";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = rollIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid roll request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const outcome = await performCharacterRoll({
      characterId: id,
      userId: session.user.id,
      intent: parsed.data,
    });
    return NextResponse.json(outcome);
  } catch (error) {
    if (error instanceof CharacterNotFoundError) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }
    console.error("Roll failed", error);
    return NextResponse.json({ error: "Roll failed" }, { status: 500 });
  }
}
