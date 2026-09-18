import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { CHOOSE_ANY, withPlainPickerFields } from "./admin-pickers";

type Loose = Record<string, unknown> & { admin?: Record<string, unknown> };

const fields = [
  { name: "make", type: "relationship", relationTo: "makes" },
  { name: "dealer", type: "relationship", relationTo: "dealers", admin: { position: "sidebar" } },
  { name: "features", type: "relationship", relationTo: "features", hasMany: true },
  { name: "keepEdit", type: "relationship", relationTo: "makes", admin: { allowEdit: true } },
  {
    name: "say",
    type: "relationship",
    relationTo: "makes",
    hasMany: true,
    admin: { placeholder: "Pick" },
  },
  { name: "tags", type: "select", hasMany: true, options: ["a", "b"] },
  { name: "one", type: "select", options: ["a", "b"] },
  { name: "title", type: "text" },
  {
    type: "tabs",
    tabs: [
      {
        label: "Deep",
        fields: [
          {
            type: "row",
            fields: [{ name: "author", type: "relationship", relationTo: "users" }],
          },
          {
            name: "rows",
            type: "array",
            fields: [{ name: "branch", type: "relationship", relationTo: "branches" }],
          },
        ],
      },
    ],
  },
] as unknown as Field[];

const out = withPlainPickerFields(fields) as unknown as Loose[];
const byName = (name: string, list: Loose[] = out) => list.find((f) => f.name === name) as Loose;

describe("withPlainPickerFields", () => {
  it("takes the pencil off every chosen value", () => {
    expect(byName("make").admin?.allowEdit).toBe(false);
    expect(byName("dealer").admin?.allowEdit).toBe(false);
  });

  it("keeps a lookup list's + and removes it for records made on their own screens", () => {
    expect(byName("make").admin?.allowCreate).toBeUndefined();
    expect(byName("dealer").admin?.allowCreate).toBe(false);
  });

  it("keeps what a field sets for itself", () => {
    expect(byName("dealer").admin?.position).toBe("sidebar");
    expect(byName("keepEdit").admin?.allowEdit).toBe(true);
    expect(byName("say").admin?.placeholder).toBe("Pick");
  });

  it("says Choose any where several values can be chosen", () => {
    expect(byName("features").admin?.placeholder).toBe(CHOOSE_ANY);
    expect(byName("tags").admin?.placeholder).toBe(CHOOSE_ANY);
    expect(byName("one").admin?.placeholder).toBeUndefined();
  });

  it("leaves other fields alone", () => {
    expect(byName("title")).toEqual({ name: "title", type: "text" });
  });

  it("reaches fields inside tabs, rows and arrays", () => {
    const tabs = out.find((f) => f.type === "tabs") as { tabs: Array<{ fields: Loose[] }> };
    const [row, rows] = tabs.tabs[0]?.fields ?? [];
    const author = ((row?.fields ?? []) as Loose[])[0];
    const branch = ((rows?.fields ?? []) as Loose[])[0];
    expect(author?.admin).toMatchObject({ allowEdit: false, allowCreate: false });
    expect(branch?.admin).toMatchObject({ allowEdit: false, allowCreate: false });
  });

  it("does not change the fields it was given", () => {
    expect((fields[0] as unknown as Loose).admin).toBeUndefined();
  });
});
