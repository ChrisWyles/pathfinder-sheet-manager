/**
 * `pg` / `pg-connection-string` currently treat `sslmode=require` (and `prefer`,
 * `verify-ca`) as aliases for `verify-full`, and warn that this will change in
 * pg v9. Neon serves publicly-valid certificates on `*.neon.tech`, so pinning
 * `verify-full` now is behaviourally identical today, silences the warning, and
 * is correct once the semantics change.
 */
export function normalizePgUrl(url: string): string {
  if (!url) return url;
  return url.replace(
    /([?&])sslmode=(?:require|prefer|verify-ca)(?=&|$)/i,
    "$1sslmode=verify-full",
  );
}
