import { describe, expect, it } from "vitest";

import type { Vehicle } from "@/payload-types";

import { feedCar } from "../dealer-feed";
import { embedSnippet, STOCK_EMBED_SCRIPT } from "./stock-script";

describe("the stock embed script", () => {
  it("parses as JavaScript", () => {
    expect(() => new Function(STOCK_EMBED_SCRIPT)).not.toThrow();
  });

  it("never writes feed text as markup", () => {
    expect(STOCK_EMBED_SCRIPT).not.toMatch(
      /innerHTML|outerHTML|insertAdjacentHTML|document\.write/,
    );
  });

  it("uses no dashes or ellipses in what a visitor reads", () => {
    const banned = new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`);
    expect(STOCK_EMBED_SCRIPT).not.toMatch(banned);
  });

  it("is two lines to paste", () => {
    expect(embedSnippet("https://rynet.co.za/", "amico-motors")).toBe(
      '<div data-rynet-stock="amico-motors"></div>\n<script src="https://rynet.co.za/embed/stock.js" async></script>',
    );
  });
});

describe("a car in the feed", () => {
  const doc = {
    id: 1,
    title: "2021 Toyota Hilux",
    publicRef: "RN48213",
    modelYear: 2021,
    price: 549900,
    mileageKm: 64000,
    make: { id: 1, name: "Toyota", slug: "toyota" },
    model: { id: 2, name: "Hilux", slug: "hilux" },
    variant: null,
    transmission: { id: 3, name: "Automatic" },
    fuelType: null,
    bodyType: null,
    exteriorColour: null,
    gallery: [],
    vin: "AHTFR22G0XXXXXXXX",
    stockNumber: "AM1042",
    updatedAt: "2026-10-13T08:00:00.000Z",
  } as unknown as Vehicle;

  it("carries what the public listing shows, with whole addresses", () => {
    const car = feedCar(doc, "https://rynet.co.za");
    expect(car).toMatchObject({
      ref: "rn48213",
      title: "2021 Toyota Hilux",
      make: "Toyota",
      priceLabel: "R 549 900",
      mileageLabel: "64 000 km",
      transmission: "Automatic",
      url: "https://rynet.co.za/vehicles/toyota/hilux/2021-rn48213",
    });
  });

  it("never carries the VIN or the stock number", () => {
    const text = JSON.stringify(feedCar(doc, "https://rynet.co.za"));
    expect(text).not.toContain("AHTFR22G0");
    expect(text).not.toContain("AM1042");
  });
});
