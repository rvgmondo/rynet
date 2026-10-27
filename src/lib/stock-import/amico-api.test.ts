import { describe, expect, it } from "vitest";

import {
  amicoExternalId,
  cleanModelText,
  lexicalText,
  looksLikeAmicoApi,
  oldSlug,
  parseAmicoApiVehicle,
} from "./amico-api";

const ORIGIN = "https://amicomotors.co.za";
const IDS = { "land-rover-discovery-5-3-0-td6-hse-2017": "11871" };

const car = {
  id: 149,
  title: "Land Rover Discovery 5 3.0 TD6 HSE 2017",
  slug: "land-rover-discovery-5-3-0-td6-hse-2017",
  sourceUrl: "https://amicomotors.co.za/listings/land-rover-discovery-5-3-0-td6-hse-2017/",
  make: { name: "Land Rover" },
  model: { name: "Discovery" },
  price: 499900,
  year: 2017,
  mileage: 130000,
  bodyType: "suv",
  fuelType: null,
  transmission: "automatic",
  exteriorColour: "Light Silver Metallic",
  interiorColour: "Black",
  images: [
    { url: "/api/media/file/a.jpg" },
    { url: "https://amicomotors.co.za/api/media/file/b.jpg" },
    7,
  ],
  description: {
    root: {
      children: [
        { type: "paragraph", children: [{ text: "One owner, full service history." }] },
        { type: "paragraph", children: [{ text: "Call Mark on 082 123 4567." }] },
      ],
    },
  },
};

describe("Amico's new site, read through its API", () => {
  it("keeps the old WordPress post number, so the same Rynet listing is updated", () => {
    expect(amicoExternalId(car, IDS)).toBe("11871");
  });

  it("finds the old slug from the old address even when the new slug differs", () => {
    expect(oldSlug({ ...car, slug: "renamed" })).toBe("land-rover-discovery-5-3-0-td6-hse-2017");
    expect(amicoExternalId({ ...car, slug: "renamed" }, IDS)).toBe("11871");
  });

  it("gives a car added after the move its own key that can never look like a post number", () => {
    expect(amicoExternalId({ ...car, sourceUrl: null, slug: "new-car-2026" }, IDS)).toBe(
      "amico-site-149",
    );
  });

  it("reads every field the import needs, with photographs as full addresses", () => {
    const listing = parseAmicoApiVehicle(car, ORIGIN, IDS);
    expect(listing).toMatchObject({
      source: "amicomotors.co.za",
      url: "https://amicomotors.co.za/vehicles/land-rover-discovery-5-3-0-td6-hse-2017",
      makeText: "Land Rover",
      modelText: "Discovery",
      year: 2017,
      mileageKm: 130000,
      price: 499900,
      bodyText: "Suv",
      transmissionText: "Automatic",
      fuelText: null,
    });
    expect(listing.photoUrls).toEqual([
      "https://amicomotors.co.za/api/media/file/a.jpg",
      "https://amicomotors.co.za/api/media/file/b.jpg",
    ]);
  });

  it("strips phone numbers from the description, as for every other source", () => {
    const listing = parseAmicoApiVehicle(car, ORIGIN, IDS);
    expect(listing.description).toContain("One owner, full service history.");
    expect(listing.description).not.toContain("082 123 4567");
    expect(listing.removedContactDetails).toBeGreaterThan(0);
  });

  it("treats a missing or zero price as no price, so the car is held back rather than listed free", () => {
    expect(parseAmicoApiVehicle({ ...car, price: 0 }, ORIGIN, IDS).price).toBeNull();
  });

  it("turns rich text into plain paragraphs", () => {
    expect(lexicalText(car.description.root)).toBe(
      "One owner, full service history.\nCall Mark on 082 123 4567.",
    );
  });

  it("tells the new API from the old WordPress site", () => {
    expect(looksLikeAmicoApi(JSON.stringify({ docs: [] }))).toBe(true);
    expect(looksLikeAmicoApi("<!doctype html><title>Page not found</title>")).toBe(false);
  });
});

describe("cleanModelText", () => {
  it("takes out the make and a bare year the site's move left in the model", () => {
    expect(cleanModelText("Isuzu 2023", "Isuzu")).toBeNull();
    expect(cleanModelText("Isuzu", "Isuzu")).toBeNull();
    expect(cleanModelText("2017", "Mercedes-Benz")).toBeNull();
    expect(cleanModelText("Toyota Hilux", "Toyota")).toBe("Hilux");
    expect(cleanModelText("Renault 2021", "Renault")).toBeNull();
  });

  it("leaves a real model alone, including one that only looks like another", () => {
    expect(cleanModelText("EcoSport", "Ford")).toBe("EcoSport");
    expect(cleanModelText("2 Series", "BMW")).toBe("2 Series");
    expect(cleanModelText("Cerato", "Kia")).toBe("Cerato");
    expect(cleanModelText(null, "Kia")).toBeNull();
  });
});
