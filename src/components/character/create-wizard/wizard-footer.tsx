"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { useWizard } from "./wizard-provider";

export function WizardFooter() {
  const { enabledSteps, problems, pending, submit } = useWizard();
  const router = useRouter();
  const pathname = usePathname();
  const current = pathname.split("/").pop();

  const idx = enabledSteps.findIndex((s) => s.path === current);
  const atFirst = idx <= 0;
  const atLast = idx === -1 || idx === enabledSteps.length - 1;

  function go(delta: number) {
    const next = enabledSteps[idx + delta];
    if (next) router.push(`/characters/new/${next.path}`);
  }

  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="outline" onClick={() => go(-1)} disabled={atFirst}>
        Back
      </Button>
      <span className="text-muted-foreground text-sm">
        {idx >= 0 ? `Step ${idx + 1} of ${enabledSteps.length}` : ""}
      </span>
      {atLast ? (
        <Button onClick={submit} disabled={pending || problems.length > 0}>
          {pending ? "Creating…" : "Create character"}
        </Button>
      ) : (
        <Button onClick={() => go(1)}>Next</Button>
      )}
    </div>
  );
}
