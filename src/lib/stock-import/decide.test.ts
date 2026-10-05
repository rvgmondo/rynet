import { describe, expect, it } from "vitest";

import {
  changesBetween,
  type ExistingVehicle,
  expiredStatusFor,
  expirySafety,
  hasRequiredValues,
  holdNote,
  holdReasons,
  missingFieldReasons,
  modelReasons,
  photoReasons,
  statusFor,
} from "./decide";
import { lexicalParagraphs } from "./text";
import type { VehicleValues } from "./types";

const incoming = (over: Partial<VehicleValues> = {}): VehicleValues => ({
  make: 1,
  model: 2,
  variant: null,
  derivative: null,
  modelYear: 2019,
  mileageKm: 120_000,
  price: 249_900,
  bodyType: 3,
  fuelType: 4,
  transmission: 5,
  drivetrain: null,
  exteriorColour: 6,
  interiorColour: null,
  features: [],
  description: "",
  ...over,
});

const existing = (over: Partial<ExistingVehicle> = {}): ExistingVehicle => ({
  id: 99,
  status: "live",
  sourceManaged: true,
  make: 1,
  model: 2,
  variant: null,
  derivative: null,
  modelYear: 2019,
  mileageKm: 120_000,
  price: 249_900,
  bodyType: 3,
  fuelType: 4,
  transmission: 5,
  drivetrain: null,
  exteriorColour: 6,
  interiorColour: null,
  features: [],
  description: null,
  photoCount: 4,
  ...over,
});

describe("what keeps a car off the site", () => {
  it("names the three things the page has to say", () => {
    expect(missingFieldReasons({ price: null, mileageKm: null, modelYear: null })).toEqual([
      "no price on the source page",
      "no mileage on the source page",
      "no model year on the source page",
    ]);
  });

  it("is happy with a complete car", () => {
    expect(missingFieldReasons({ price: 249_900, mileageKm: 120_000, modelYear: 2019 })).toEqual(
      [],
    );
  });

  it("treats a price of zero as no price", () => {
    expect(missingFieldReasons({ price: 0, mileageKm: 1, modelYear: 2019 })).toEqual([
      "no price on the source page",
    ]);
  });

  it("holds a car with no photograph", () => {
    expect(photoReasons(0)).toEqual(["no photograph could be saved"]);
    expect(photoReasons(1)).toEqual([]);
  });

  it("puts both kinds together", () => {
    expect(holdReasons({ price: 100, mileageKm: 1, modelYear: 2019, photoCount: 0 })).toEqual([
      "no photograph could be saved",
    ]);
  });

  it("writes the reason as a sentence for the person looking at the car", () => {
    expect(
      holdNote(
        ["no price on the source page", "no photograph could be saved"],
        "amicomotors.co.za",
      ),
    ).toBe(
      "Hidden by the amicomotors.co.za import: no price on the source page and no photograph could be saved.",
    );
    expect(holdNote([], "amicomotors.co.za")).toBe("");
  });
});

describe("the listing state a run decides on", () => {
  it("puts a complete new car live", () => {
    expect(statusFor(null, [])).toBe("live");
  });

  it("hides a live car that has lost something", () => {
    expect(statusFor("live", ["no price on the source page"])).toBe("draft");
  });

  it("puts a hidden car back up once it is complete again", () => {
    expect(statusFor("draft", [])).toBe("live");
    expect(statusFor("expired", [])).toBe("live");
  });

  it("says nothing when the car is already right", () => {
    expect(statusFor("live", [])).toBeNull();
    expect(statusFor("draft", ["no photograph could be saved"])).toBeNull();
  });

  it("never overrules a person", () => {
    // Sold, Reserved and Archived are decisions somebody made. An import does not reverse them.
    expect(statusFor("sold", [])).toBeNull();
    expect(statusFor("reserved", [])).toBeNull();
    expect(statusFor("archived", ["no price on the source page"])).toBeNull();
  });
});

describe("a car that has gone from the stock list", () => {
  it("is hidden, not sold and not deleted", () => {
    expect(expiredStatusFor("live")).toBe("expired");
    expect(expiredStatusFor("draft")).toBe("expired");
  });

  it("is left alone when it is already hidden that way", () => {
    expect(expiredStatusFor("expired")).toBeNull();
  });

  it("is left alone when a person has already decided about it", () => {
    expect(expiredStatusFor("sold")).toBeNull();
    expect(expiredStatusFor("reserved")).toBeNull();
    expect(expiredStatusFor("archived")).toBeNull();
  });
});

describe("what changed since the last run", () => {
  it("finds nothing to do when nothing moved", () => {
    expect(changesBetween(existing(), incoming()).fields).toEqual([]);
  });

  it("spots a price change and hands the new price on", () => {
    const result = changesBetween(existing(), incoming({ price: 239_900 }));
    expect(result.fields).toEqual(["price"]);
    expect(result.patch).toEqual({ price: 239_900 });
  });

  it("spots the car being filed under a different model", () => {
    expect(changesBetween(existing(), incoming({ model: 77 })).fields).toEqual(["model"]);
  });

  it("does not wipe a value the source has stopped giving", () => {
    // The source dropping its mileage must not clear the mileage Rynet already has.
    const result = changesBetween(existing(), incoming({ mileageKm: null, price: null }));
    expect(result.fields).toEqual([]);
    expect(result.patch).toEqual({});
  });

  it("spots a rewritten description", () => {
    const was = existing({ description: lexicalParagraphs(["One owner, full service history."]) });
    expect(
      changesBetween(was, incoming({ description: "One owner, full service history." })).fields,
    ).toEqual([]);
    expect(changesBetween(was, incoming({ description: "Two owners." })).fields).toEqual([
      "description",
    ]);
  });

  it("spots new trim details and leaves empty ones alone", () => {
    expect(changesBetween(existing(), incoming({ derivative: "GP 1.2 TSI" })).fields).toEqual([
      "derivative",
    ]);
    expect(changesBetween(existing({ derivative: "GP 1.2 TSI" }), incoming()).fields).toEqual([]);
  });

  it("spots a changed feature list, whatever order it comes in", () => {
    expect(
      changesBetween(existing({ features: [1, 2] }), incoming({ features: [2, 1] })).fields,
    ).toEqual([]);
    expect(
      changesBetween(existing({ features: [1] }), incoming({ features: [1, 2] })).fields,
    ).toEqual(["features"]);
  });
});

describe("a page that names two different models", () => {
  it("holds the car, and says so on it with what the page said", () => {
    expect(modelReasons(true)).toEqual(["its details and its title name different models"]);
    expect(modelReasons(false)).toEqual([]);
    expect(
      holdNote(
        modelReasons(true),
        "amicomotors.co.za",
        "Its details say Audi Q3 but its title says Audi Q2.",
      ),
    ).toBe(
      "Hidden by the amicomotors.co.za import: its details and its title name different models. Its details say Audi Q3 but its title says Audi Q2.",
    );
  });

  it("is one more reason among the others", () => {
    expect(
      holdReasons({
        price: 100,
        mileageKm: null,
        modelYear: 2019,
        modelConflict: true,
        photoCount: 3,
      }),
    ).toEqual(["no mileage on the source page", "its details and its title name different models"]);
  });
});

describe("which cars can be written through Payload", () => {
  it("is every car with the five values the collection requires", () => {
    expect(hasRequiredValues({ make: 1, model: 2, modelYear: 2019, mileageKm: 1, price: 1 })).toBe(
      true,
    );
  });

  it("is not a car the page left a required value off, which is kept without inventing it", () => {
    expect(
      hasRequiredValues({ make: 1, model: 2, modelYear: 2019, mileageKm: null, price: 1 }),
    ).toBe(false);
    expect(
      hasRequiredValues({ make: 1, model: null, modelYear: 2019, mileageKm: 1, price: 1 }),
    ).toBe(false);
  });
});

describe("hiding the cars a run did not find", () => {
  const run = { found: 97, unreadable: 0, wouldExpire: 3, listed: 91 };

  it("goes ahead when the run saw the whole list", () => {
    expect(expirySafety(run)).toEqual({ safe: true });
  });

  it("hides nothing when the list came back empty", () => {
    const answer = expirySafety({ ...run, found: 0, wouldExpire: 91 });
    expect(answer.safe).toBe(false);
  });

  it("hides nothing when any listing page could not be read", () => {
    // A car whose page failed to load looks exactly like a car that has gone.
    const answer = expirySafety({ ...run, unreadable: 1 });
    expect(answer.safe).toBe(false);
    expect(!answer.safe && answer.reason).toMatch(/1 listing page could not be read/);
  });

  it("hides nothing when more than half would go at once, unless a person says so", () => {
    expect(expirySafety({ ...run, wouldExpire: 60 }).safe).toBe(false);
    expect(expirySafety({ ...run, wouldExpire: 60, allowLargeRemoval: true }).safe).toBe(true);
  });

  it("does not make a fuss about a handful of cars on a small list", () => {
    expect(expirySafety({ ...run, wouldExpire: 4, listed: 5 }).safe).toBe(true);
  });
});
