import type { Where } from "payload";

/**
 * Shorter pickers in the admin: a model picker that lists only the chosen make's models, a branch
 * picker that lists only the chosen dealership's branches.
 *
 * Payload also runs `filterOptions` when a document is SAVED, and rejects a value the filter
 * would not have offered. Old data does not always match (five seeded cars point at a variant
 * that belongs to another model), so the value already on the document is always kept in the
 * list. That makes the filter a convenience in the picker and never a new reason a save fails.
 */

/** The id of a relationship value, whether it arrived as an id or as a populated document. */
export function relationIdOf(value: unknown): number | string | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (value && typeof value === "object" && "id" in value) {
    return relationIdOf((value as { id: unknown }).id);
  }
  return null;
}

/**
 * Options whose `parentField` matches the chosen parent, plus the value already chosen.
 * With no parent chosen, everything is offered.
 */
export function withinParent(parentField: string, parent: unknown, current: unknown): Where | true {
  const parentId = relationIdOf(parent);
  if (parentId === null) return true;
  const currentId = relationIdOf(current);
  const where: Where = {
    or: [
      { [parentField]: { equals: parentId } },
      ...(currentId === null ? [] : [{ id: { equals: currentId } }]),
    ],
  };
  return where;
}
