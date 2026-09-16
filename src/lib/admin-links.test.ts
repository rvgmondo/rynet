import { describe, expect, it } from "vitest";

import { adminDocUrl, adminListUrl } from "./admin-links";

const decoded = (url: string) => decodeURIComponent(url);

describe("adminListUrl", () => {
  it("links to the plain list when there is no filter", () => {
    expect(adminListUrl("/admin", "vehicles")).toBe("/admin/collections/vehicles");
  });

  it("writes the filter in the shape the filter panel reads back", () => {
    const url = adminListUrl("/admin", "vehicles", [
      { field: "status", operator: "equals", value: "live" },
    ]);
    expect(decoded(url)).toBe(
      "/admin/collections/vehicles?where[or][0][and][0][status][equals]=live",
    );
  });

  it("numbers each condition and each value in a list", () => {
    const url = adminListUrl(
      "/admin",
      "leads",
      [
        { field: "type", operator: "not_in", value: ["whatsapp_click", "phone_reveal"] },
        { field: "createdAt", operator: "greater_than_equal", value: "2026-09-09T12:00:00.000Z" },
      ],
      "-createdAt",
    );
    expect(decoded(url)).toBe(
      "/admin/collections/leads?where[or][0][and][0][type][not_in][0]=whatsapp_click" +
        "&where[or][0][and][0][type][not_in][1]=phone_reveal" +
        "&where[or][0][and][1][createdAt][greater_than_equal]=2026-09-09T12:00:00.000Z" +
        "&sort=-createdAt",
    );
  });
});

describe("adminDocUrl", () => {
  it("links to one record", () => {
    expect(adminDocUrl("/admin", "leads", 42)).toBe("/admin/collections/leads/42");
  });
});
