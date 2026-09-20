"use client";

import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StatBreakdownLine } from "@/lib/rules/types";

import { sign } from "./stat";

/** Wraps a Stat/ClickableStat block with a hover tooltip listing the named
 * terms that add up to its value — "show your work" for derived stats.
 * Anchored to the cursor position (captured on hover-in) rather than the
 * small stat box itself, so it opens right where the pointer is instead of
 * centering on — and sometimes clipping past the edge of — a tiny target. */
export function StatTooltip({
  lines,
  total,
  children,
}: {
  lines: StatBreakdownLine[];
  total?: number;
  children: ReactNode;
}) {
  const pos = useRef({ x: 0, y: 0 });
  const anchor = useMemo(
    () => ({
      getBoundingClientRect: () =>
        new DOMRect(pos.current.x, pos.current.y, 0, 0),
    }),
    [],
  );

  if (lines.length === 0) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className="contents"
            onMouseEnter={(e) => {
              pos.current = { x: e.clientX, y: e.clientY };
            }}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        anchor={anchor}
        side="bottom"
        align="start"
        sideOffset={12}
        alignOffset={4}
        className="w-fit min-w-36 flex-col items-stretch gap-1 p-2.5"
      >
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-background/70">{l.label}</span>
            <span className="tabular-nums">{sign(l.value)}</span>
          </div>
        ))}
        {total !== undefined && (
          <div className="border-background/20 mt-1 flex items-center justify-between gap-4 border-t pt-1 text-xs font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{sign(total)}</span>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
