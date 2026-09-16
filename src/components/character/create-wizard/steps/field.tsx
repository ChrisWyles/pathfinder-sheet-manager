import type { ReactNode } from "react";

/**
 * A captioned group for controls that are NOT a single form element (button
 * rows, pickers). Uses a div, not a <label>, so screen readers don't fold every
 * child button's text into one garbled accessible name.
 */
export function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-muted-foreground text-xs font-normal">{hint}</span>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint ? (
        <span className="text-muted-foreground text-xs font-normal">{hint}</span>
      ) : null}
    </label>
  );
}

export function sign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
