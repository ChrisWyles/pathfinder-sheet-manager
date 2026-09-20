"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A Stat block that triggers a roll on click — used for saves and ability
 * scores, both of which the roll API already supports as named intents. */
export function ClickableStat({
  label,
  value,
  onClick,
  pending,
  className,
}: {
  label: string;
  value: ReactNode;
  onClick: () => void;
  pending?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={`Roll ${label}`}
      className={cn(
        "hover:bg-muted/60 hover:border-primary/40 cursor-pointer rounded-md border px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-50",
        className,
      )}
    >
      <div className="text-muted-foreground text-[10px] leading-tight">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </button>
  );
}
