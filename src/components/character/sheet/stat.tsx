export function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground text-[10px] leading-tight">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function sign(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}
