import { describe, expect, it } from "vitest";

import { relationIdOf, withinParent } from "./admin-filter-options";

describe("relationIdOf", () => {
  it("reads ids and populated documents", () => {
    expect(relationIdOf(7)).toBe(7);
    expect(relationIdOf("7")).toBe("7");
    expect(relationIdOf({ id: 9, name: "Toyota" })).toBe(9);
  });

  it("treats empty values as no choice", () => {
    expect(relationIdOf(null)).toBeNull();
    expect(relationIdOf(undefined)).toBeNull();
    expect(relationIdOf("")).toBeNull();
    expect(relationIdOf(Number.NaN)).toBeNull();
    expect(relationIdOf({})).toBeNull();
  });
});

describe("withinParent", () => {
  it("offers everything until a parent is chosen", () => {
    expect(withinParent("make", null, 4)).toBe(true);
    expect(withinParent("make", undefined, undefined)).toBe(true);
  });

  it("offers the parent's options and always keeps the current value", () => {
    expect(withinParent("make", 2, 31)).toEqual({
      or: [{ make: { equals: 2 } }, { id: { equals: 31 } }],
    });
  });

  it("offers only the parent's options when nothing is chosen yet", () => {
    expect(withinParent("dealer", { id: 5 }, null)).toEqual({
      or: [{ dealer: { equals: 5 } }],
    });
  });
});
