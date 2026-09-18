import { describe, expect, it } from "vitest";

import { formatCount, leadAbout, optionLabel, quickFilterWhere, sameWhere } from "./admin-list";

describe("optionLabel", () => {
  const options = [
    { value: "live", label: "Live on the site" },
    { value: "sold", label: { en: "Sold", af: "Verkoop" } },
    "plain",
    { value: "bare" },
  ];

  it("reads string and translated labels", () => {
    expect(optionLabel(options, "live")).toBe("Live on the site");
    expect(optionLabel(options, "sold")).toBe("Sold");
    expect(optionLabel(options, "sold", "af")).toBe("Verkoop");
    expect(optionLabel(options, "plain")).toBe("plain");
  });

  it("falls back to the stored value so a badge is never empty", () => {
    expect(optionLabel(options, "bare")).toBe("bare");
    expect(optionLabel(options, "missing")).toBe("missing");
    expect(optionLabel(undefined, "live")).toBe("live");
    expect(optionLabel(options, null)).toBe("");
  });
});

describe("quickFilterWhere", () => {
  it("writes the shape the filter panel reads back", () => {
    expect(
      quickFilterWhere([
        { field: "status", operator: "equals", value: "new" },
        { field: "type", operator: "not_in", value: ["whatsapp_click", "phone_reveal"] },
      ]),
    ).toEqual({
      or: [
        {
          and: [
            { status: { equals: "new" } },
            { type: { not_in: ["whatsapp_click", "phone_reveal"] } },
          ],
        },
      ],
    });
  });

  it("is no filter at all without conditions", () => {
    expect(quickFilterWhere([])).toEqual({});
  });
});

describe("sameWhere", () => {
  it("matches a filter read back from the address bar", () => {
    const set = quickFilterWhere([{ field: "isDemonstration", operator: "equals", value: true }]);
    const fromUrl = { or: [{ and: [{ isDemonstration: { equals: "true" } }] }] };
    expect(sameWhere(set, fromUrl)).toBe(true);
  });

  it("treats empty and missing filters as the same", () => {
    expect(sameWhere({}, undefined)).toBe(true);
    expect(sameWhere({ or: [] }, null)).toBe(true);
  });

  it("tells different filters apart", () => {
    const live = quickFilterWhere([{ field: "status", operator: "equals", value: "live" }]);
    const sold = quickFilterWhere([{ field: "status", operator: "equals", value: "sold" }]);
    expect(sameWhere(live, sold)).toBe(false);
    expect(sameWhere(live, {})).toBe(false);
  });
});

describe("leadAbout", () => {
  it("names Rynet Digital enquiries", () => {
    expect(leadAbout({ type: "agency_enquiry" })).toBe("Rynet Digital");
  });

  it("names the car a seller wants to sell", () => {
    expect(
      leadAbout({
        type: "trade_in",
        tradeIn: { modelYear: 2017, make: "Toyota", model: " Hilux " },
      }),
    ).toBe("Selling a 2017 Toyota Hilux");
    expect(leadAbout({ type: "trade_in", tradeIn: null })).toBe("Selling a car");
  });

  it("uses the linked car's name once it has loaded", () => {
    expect(leadAbout({ type: "enquiry", vehicle: 4, carTitle: "2023 Toyota Corolla Cross" })).toBe(
      "2023 Toyota Corolla Cross",
    );
    expect(leadAbout({ type: "enquiry", vehicle: 4 })).toBeNull();
  });
});

describe("formatCount", () => {
  it("groups thousands with no-break spaces", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(12)).toBe("12");
    expect(formatCount(1204)).toBe("1\u00a0204");
  });
});
