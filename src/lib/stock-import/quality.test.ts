import { describe, expect, it } from "vitest";

import { groupByKind, qualityNotes } from "./quality";
import type { SourceListing } from "./types";

const listing = (over: Partial<SourceListing> = {}): SourceListing => ({
  source: "amicomotors.co.za",
  externalId: "1",
  url: "https://amicomotors.co.za/listings/ford-ecosport-1-5-ambiente-2016/",
  slug: "ford-ecosport-1-5-ambiente-2016",
  title: "Ford EcoSport 2016",
  makeText: "Ford",
  modelText: "EcoSport",
  year: 2016,
  mileageKm: 100_000,
  price: 189_900,
  exteriorColourText: null,
  interiorColourText: null,
  transmissionText: null,
  fuelText: null,
  bodyText: null,
  driveText: null,
  description: "A neat car.",
  removedContactDetails: 0,
  features: [],
  photoUrls: [],
  ...over,
});

describe("what to pass back to the dealership", () => {
  it("spots a car filed under a model its own address never mentions", () => {
    const notes = qualityNotes(listing({ modelText: "Escort" }), "Amico Motors");
    expect(notes.map((note) => note.kind)).toEqual(["model does not match the address"]);
    expect(notes[0]?.detail).toContain("Escort");
  });

  it("says nothing when the model and the address agree", () => {
    expect(qualityNotes(listing(), "Amico Motors")).toEqual([]);
  });

  it("does not complain about a class name written two ways", () => {
    // "C-Class" on a page called mercedes-benz-c-200k is the same car, written the way each field
    // wants it. Flagging that every time would bury the ones that matter.
    const notes = qualityNotes(
      listing({ modelText: "C-Class", slug: "mercedes-benz-c-200k-135-kw-classic-automatic-2008" }),
      "Amico Motors",
    );
    expect(notes).toEqual([]);
  });

  it("spots screenshots standing in for photographs", () => {
    const notes = qualityNotes(
      listing({
        photoUrls: [
          "https://amicomotors.co.za/wp-content/uploads/2025/11/Screenshot_20251112_150939.jpg",
          "https://amicomotors.co.za/wp-content/uploads/2025/11/front.jpg",
        ],
      }),
      "Amico Motors",
    );
    expect(notes[0]?.kind).toBe("screenshots instead of photographs");
    expect(notes[0]?.detail).toBe("1 of 2 images");
  });

  it("spots a price typed into the prose", () => {
    const notes = qualityNotes(
      listing({ description: "Priced at R299,900, this one will not last." }),
      "Amico Motors",
    );
    expect(notes[0]?.kind).toBe("a price typed into the description");
  });

  it("does not read a mileage as a price", () => {
    expect(qualityNotes(listing({ description: "It has covered 170,000 km." }), "Amico")).toEqual(
      [],
    );
  });

  it("spots a second business name in the description", () => {
    const notes = qualityNotes(
      listing({ description: "Available at SA Multi Franchise Motor Group in Gauteng." }),
      "Amico Motors",
    );
    expect(notes[0]?.kind).toBe("another business named in the description");
  });

  it("groups the notes so a report can count them", () => {
    const grouped = groupByKind([
      ...qualityNotes(listing({ modelText: "Escort" }), "Amico Motors"),
      ...qualityNotes(listing({ modelText: "Escort", url: "b" }), "Amico Motors"),
    ]);
    expect(grouped.get("model does not match the address")).toHaveLength(2);
  });
});
