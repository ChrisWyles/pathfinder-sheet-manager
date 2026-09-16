"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { useWizard } from "./wizard-provider";

export function WizardProgress() {
  const { enabledSteps } = useWizard();
  const pathname = usePathname();
  const current = pathname.split("/").pop();

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Character creation steps">
      {enabledSteps.map((s, i) => {
        const active = s.path === current;
        return (
          <Link
            key={s.path}
            href={`/characters/new/${s.path}`}
            aria-current={active ? "step" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            {i + 1}. {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
