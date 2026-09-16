"use client";

import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A single-open-at-a-time accordion section: click the header to toggle, or
 * drive `open` externally to auto-advance ("pick a class -> this collapses,
 * the next section expands"). The collapsed state shows a one-line summary
 * of what was picked.
 */
export function CollapsibleSection({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer flex-row items-center justify-between gap-3 select-none"
      >
        <CardTitle>{title}</CardTitle>
        <div className="flex min-w-0 items-center gap-2">
          {!open && summary && (
            <span className="text-muted-foreground max-w-56 truncate text-sm font-normal">
              {summary}
            </span>
          )}
          <ChevronDownIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </CardHeader>
      {open && <CardContent className="pt-4">{children}</CardContent>}
    </Card>
  );
}
