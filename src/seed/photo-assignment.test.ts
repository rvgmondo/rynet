import { describe, expect, it } from "vitest";

import { assignPhotos, type ListingForPhoto, type PhotoOption } from "./photo-assignment";

const photos: PhotoOption[] = [
  { id: "hilux--1", colour: "black" },
  { id: "hilux--2", colour: "white" },
  { id: "hilux--3", colour: "white" },
  { id: "hilux--4", colour: "red" },
];

function listing(id: number, overrides: Partial<ListingForPhoto> = {}): ListingForPhoto {
  return { id, publicRef: `RN${id}`, dealerId: 1, colourFamily: null, ...overrides };
}

describe("assignPhotos", () => {
  it("never gives two neighbouring listings the same photograph", () => {
    const listings = Array.from({ length: 40 }, (_, i) =>
      listing(i + 1, { dealerId: (i % 3) + 1 }),
    );
    const result = assignPhotos(listings, photos);
    const chosen = listings.map((l) => result.get(l.id));
    for (let i = 1; i < chosen.length; i += 1) {
      expect(chosen[i], `listings ${i} and ${i + 1}`).not.toBe(chosen[i - 1]);
    }
  });

  it("still avoids a neighbour repeat when every listing is the same colour", () => {
    const listings = Array.from({ length: 12 }, (_, i) =>
      listing(i + 1, { colourFamily: "white" }),
    );
    const result = assignPhotos(listings, photos);
    const chosen = listings.map((l) => result.get(l.id));
    for (let i = 1; i < chosen.length; i += 1) expect(chosen[i]).not.toBe(chosen[i - 1]);
  });

  it("prefers a photograph in the listing's own colour", () => {
    const result = assignPhotos([listing(1, { colourFamily: "red" })], photos);
    expect(result.get(1)).toBe("hilux--4");
  });

  it("spreads one dealership's stock across every photograph before repeating one", () => {
    const listings = [1, 2, 3, 4].map((id) => listing(id, { dealerId: 7 }));
    const used = new Set(assignPhotos(listings, photos).values());
    expect(used.size).toBe(4);
  });

  it("gives the same answer every time", () => {
    const listings = Array.from({ length: 20 }, (_, i) => listing(i + 1, { dealerId: i % 4 }));
    expect([...assignPhotos(listings, photos)]).toEqual([...assignPhotos(listings, photos)]);
  });

  it("handles a model with one photograph and a model with none", () => {
    const listings = [listing(1), listing(2)];
    expect([...assignPhotos(listings, [photos[0] as PhotoOption]).values()]).toEqual([
      "hilux--1",
      "hilux--1",
    ]);
    expect(assignPhotos(listings, []).size).toBe(0);
  });
});
