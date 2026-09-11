import { describe, expect, it } from "vitest";

import { sellToDealerSchema } from "./sell-to-dealer-schema";

/**
 * The schema that decides what reaches a dealership.
 *
 * It had no tests, and it had a hole that a test would have caught on the first run: an empty
 * number field coerced to 0 and passed. The lead went out reading 0 km. Everything below is
 * written from the form's own point of view, submitting what a browser actually submits, which
 * is strings, and an empty field as "".
 */

const CURRENT_YEAR = new Date().getFullYear();

/** What a fully filled form posts. Individual tests override one field at a time. */
const complete = {
  make: "Toyota",
  model: "Hilux",
  modelYear: String(CURRENT_YEAR - 6),
  mileageKm: "128000",
  transmission: "manual",
  condition: "good",
  serviceHistory: "full",
  finance: "none",
  province: "Gauteng",
  city: "Pretoria",
  name: "Thabo Nkosi",
  email: "thabo@example.co.za",
  phone: "0821234567",
  consent: true,
};

const parse = (overrides: Record<string, unknown> = {}) =>
  sellToDealerSchema.safeParse({ ...complete, ...overrides });

const errorOn = (result: ReturnType<typeof parse>, field: string) =>
  result.success ? null : (result.error.issues.find((i) => i.path[0] === field)?.message ?? null);

describe("a complete form", () => {
  it("is accepted", () => {
    expect(parse().success).toBe(true);
  });

  it("coerces the numbers the browser sends as strings", () => {
    const result = parse();
    expect(result.success && result.data.mileageKm).toBe(128000);
    expect(result.success && result.data.modelYear).toBe(CURRENT_YEAR - 6);
  });
});

describe("a blank number field", () => {
  /*
   * The bug this file exists for. An empty number input submits "", `z.coerce.number()` turns
   * that into 0, and 0 satisfied the old `min(0)`. So the step advanced with mileage untouched
   * while every other empty field on the same screen reported an error, and the seller had no
   * way of knowing which one had been skipped.
   */
  it("does not pass mileage off as zero", () => {
    const result = parse({ mileageKm: "" });
    expect(result.success).toBe(false);
    expect(errorOn(result, "mileageKm")).toBe("How many kilometres?");
  });

  it("does not pass the model year off as zero", () => {
    const result = parse({ modelYear: "" });
    expect(result.success).toBe(false);
    expect(errorOn(result, "modelYear")).toBeTruthy();
  });

  it("rejects a missing field the same way as an empty one", () => {
    expect(parse({ mileageKm: undefined }).success).toBe(false);
    expect(parse({ mileageKm: null }).success).toBe(false);
  });

  it("still rejects an actual zero", () => {
    expect(parse({ mileageKm: "0" }).success).toBe(false);
  });
});

describe("the bounds", () => {
  it("refuses a year before the platform's floor", () => {
    expect(parse({ modelYear: "1969" }).success).toBe(false);
  });

  it("refuses a year in the future", () => {
    expect(parse({ modelYear: String(CURRENT_YEAR + 2) }).success).toBe(false);
  });

  it("accepts next year, because dealers do list them", () => {
    expect(parse({ modelYear: String(CURRENT_YEAR + 1) }).success).toBe(true);
  });

  it("refuses a mileage nobody drives", () => {
    expect(parse({ mileageKm: "2000001" }).success).toBe(false);
  });

  it("refuses a negative mileage", () => {
    expect(parse({ mileageKm: "-1" }).success).toBe(false);
  });
});

describe("consent", () => {
  /*
   * POPIA section 18. The whole point of this form is that the seller's details are passed to
   * up to five dealerships, so an unticked box is the one failure that must never be a warning.
   */
  it("is required", () => {
    expect(parse({ consent: false }).success).toBe(false);
    expect(parse({ consent: undefined }).success).toBe(false);
  });
});

describe("the fields a dealership has to be able to act on", () => {
  it.each(["make", "model", "province", "city", "name", "phone"])("requires %s", (field) => {
    expect(parse({ [field]: "" }).success).toBe(false);
  });

  it("requires an address that could actually receive an email", () => {
    expect(parse({ email: "thabo" }).success).toBe(false);
    expect(parse({ email: "" }).success).toBe(false);
  });

  it("leaves notes optional, because it is the one field nobody owes us", () => {
    expect(parse({ notes: undefined }).success).toBe(true);
    expect(parse({ notes: "" }).success).toBe(true);
  });
});
