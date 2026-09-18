"use client";

import { type ReactNode, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PickerOption {
  value: string;
  label: string;
  /** Extra text folded into the search match. */
  keywords?: string;
  /** Small chips shown under the label. */
  badges?: string[];
  /** Rich preview shown under the label / badges. */
  preview?: ReactNode;
  /** External source link (e.g. the wiki page this entry came from), shown
   * as a small "wiki ↗" link that opens in a new tab. Rendered as a sibling
   * of the option's button, not nested inside it — a nested <a> inside a
   * <button> is invalid HTML and would fire both elements' click handlers. */
  href?: string;
}

export function StatBadges({ items }: { items: string[] }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {items.map((t) => (
        <Badge key={t} variant="outline" className="text-[10px] font-normal">
          {t}
        </Badge>
      ))}
    </span>
  );
}

interface OptionPickerCommonProps {
  options: PickerOption[];
  /** Force the search box on/off. Defaults to on above 12 options. */
  searchable?: boolean;
  groupBy?: (o: PickerOption) => string;
  placeholder?: string;
  emptyText?: string;
  maxVisible?: number;
  className?: string;
  "aria-label"?: string;
}

interface OptionPickerSingleProps extends OptionPickerCommonProps {
  multiple?: false;
  value: string | null;
  onChange: (value: string) => void;
}

interface OptionPickerMultiProps extends OptionPickerCommonProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type OptionPickerProps = OptionPickerSingleProps | OptionPickerMultiProps;

export function OptionPicker({
  options,
  value,
  onChange,
  multiple,
  searchable,
  groupBy,
  placeholder = "Search…",
  emptyText = "No matches.",
  maxVisible = 60,
  className,
  "aria-label": ariaLabel,
}: OptionPickerProps) {
  const [q, setQ] = useState("");
  const showSearch = searchable ?? options.length > 12;
  const norm = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!norm) return options;
    return options.filter((o) =>
      `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(norm),
    );
  }, [options, norm]);

  const limited = filtered.slice(0, maxVisible);
  const hidden = filtered.length - limited.length;

  const groups = useMemo(() => {
    if (!groupBy) return [["", limited] as const];
    const m = new Map<string, PickerOption[]>();
    for (const o of limited) {
      const g = groupBy(o);
      const arr = m.get(g) ?? [];
      arr.push(o);
      m.set(g, arr);
    }
    return [...m.entries()];
  }, [limited, groupBy]);

  return (
    <div className={cn("space-y-2", className)}>
      {showSearch && (
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ? `Search ${ariaLabel}` : "Search options"}
        />
      )}
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={ariaLabel}
        className="max-h-96 space-y-1.5 overflow-y-auto rounded-md border p-1.5"
      >
        {filtered.length === 0 && (
          <p className="text-muted-foreground p-3 text-sm">{emptyText}</p>
        )}
        {groups.map(([g, opts]) => (
          <div key={g || "_"} className="space-y-1.5">
            {g && (
              <div className="text-muted-foreground px-1.5 pt-1 text-xs font-medium">
                {g}
              </div>
            )}
            {opts.map((o) => {
              const selected = multiple
                ? value.includes(o.value)
                : o.value === value;
              return (
                <div key={o.value} className="relative">
                  <button
                    type="button"
                    role={multiple ? "checkbox" : "radio"}
                    aria-checked={selected}
                    onClick={() =>
                      multiple
                        ? onChange(
                            selected
                              ? value.filter((v) => v !== o.value)
                              : [...value, o.value],
                          )
                        : onChange(o.value)
                    }
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md border p-2.5 text-left text-sm transition-colors",
                      o.href && "pr-14",
                      selected
                        ? "border-primary bg-accent"
                        : "border-transparent hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                        multiple ? "rounded-[4px]" : "rounded-full",
                        selected ? "border-primary" : "border-input",
                      )}
                    >
                      {selected &&
                        (multiple ? (
                          <span className="bg-primary size-2.5 rounded-[2px]" />
                        ) : (
                          <span className="bg-primary size-2 rounded-full" />
                        ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      {o.preview ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="cursor-help font-medium underline decoration-dotted underline-offset-2" />
                            }
                          >
                            {o.label}
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-xs text-pretty whitespace-pre-wrap p-3 text-sm leading-relaxed sm:max-w-sm"
                          >
                            {o.preview}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="font-medium">{o.label}</span>
                      )}
                      {o.badges?.length ? <StatBadges items={o.badges} /> : null}
                      {o.preview ? (
                        <span className="text-muted-foreground mt-1 block text-xs leading-snug">
                          {o.preview}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {o.href && (
                    <a
                      href={o.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5 text-xs underline decoration-dotted underline-offset-2"
                    >
                      wiki ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {hidden > 0 && (
          <p className="text-muted-foreground p-2 text-center text-xs">
            {hidden} more — refine your search
          </p>
        )}
      </div>
    </div>
  );
}
