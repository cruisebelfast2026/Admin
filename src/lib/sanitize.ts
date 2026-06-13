/**
 * Helpers to keep Supabase writes valid: Postgres rejects "" for time/date/
 * integer columns (they must be null), and NaN must never reach an integer
 * column.
 */

/** Convert "" (and undefined) to null; pass other values through. */
export function emptyToNull<T>(v: T): T | null {
  return v === "" || v === undefined ? null : v;
}

/** Convert NaN/"" to null; pass finite numbers through. */
export function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Return a shallow copy with the given keys coerced from "" to null.
 * Useful before insert/upsert of rows that contain time/date columns.
 */
export function nullEmpty<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[],
): T {
  const out = { ...obj };
  for (const k of keys) {
    if (out[k] === "" || out[k] === undefined) out[k] = null as T[keyof T];
  }
  return out;
}
