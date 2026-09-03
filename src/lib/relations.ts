/**
 * Relationship narrowing.
 *
 * Payload types every relationship as `number | Doc`, because whether you get the id or the
 * whole document depends on the `depth` you asked for. That is honest, and it means every
 * read site would otherwise carry the same three-line check.
 *
 * These helpers do it once. `populated` returns the document or null; it never throws and
 * never guesses, so a query that forgot to raise its depth degrades to a missing label
 * rather than a runtime error on a page a buyer is looking at.
 */

export function populated<T extends { id: number }>(
  value: number | T | null | undefined,
): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return null;
  return value;
}

/** The `name` off a populated taxonomy relationship, or null. */
export function relName(value: unknown): string | null {
  const doc = populated(value as { id: number; name?: string } | number | null);
  return typeof doc?.name === "string" ? doc.name : null;
}

/** The `slug` off a populated relationship, or an empty string. */
export function relSlug(value: unknown): string {
  const doc = populated(value as { id: number; slug?: string } | number | null);
  return typeof doc?.slug === "string" ? doc.slug : "";
}

/** The id, whether the relationship arrived populated or not. */
export function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  const doc = populated(value as { id: number } | number | null);
  return doc?.id ?? null;
}
