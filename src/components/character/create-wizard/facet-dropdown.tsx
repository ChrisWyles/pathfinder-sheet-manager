"use client";

import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
}

interface FacetDropdownProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/** A checkbox-list dropdown filter — "Bonus (2)" style facet picker. */
export function FacetDropdown({
  label,
  options,
  selected,
  onChange,
}: FacetDropdownProps) {
  function toggle(value: string, checked: boolean) {
    onChange(
      checked ? [...selected, value] : selected.filter((v) => v !== value),
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "border-input inline-flex h-8 items-center gap-1.5 rounded-lg border bg-transparent px-2.5 text-sm transition-colors outline-none select-none hover:bg-muted",
          selected.length > 0 && "border-primary text-primary",
        )}
      >
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ""}
        <ChevronDownIcon className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onCheckedChange={(checked) => toggle(o.value, checked === true)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
