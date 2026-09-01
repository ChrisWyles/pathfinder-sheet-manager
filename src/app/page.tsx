import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Guided creation",
    body: "Step through a Pathfinder 1e or Spheres of Power character and let the sheet do the bookkeeping.",
  },
  {
    title: "Everything derived",
    body: "AC, saves, CMB/CMD, attack bonuses and skill totals recompute from your scores, classes and gear.",
  },
  {
    title: "Rolls to Discord",
    body: "Attach a channel webhook and every attack, save and check posts there with its full breakdown.",
  },
  {
    title: "Your equipment",
    body: "Add from the SRD equipment list or build custom items, and carry them onto the sheet.",
  },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Pathfinder 1e · Spheres of Power
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          An interactive character sheet that does the math and rolls the dice.
        </h1>
        <p className="text-muted-foreground text-lg">
          Create a character, level it up with guidance, and send every roll to
          your table&apos;s Discord.
        </p>
        <div className="flex gap-3 pt-2">
          <Button size="lg" render={<Link href="/signin" />}>
            Sign in with Discord
          </Button>
        </div>
      </div>

      <dl className="grid gap-6 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="space-y-1">
            <dt className="font-semibold">{f.title}</dt>
            <dd className="text-muted-foreground text-sm">{f.body}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
