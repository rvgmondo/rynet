import { describe, expect, it } from "vitest";

import { formatCc, formatKm, formatMonthly, formatRand, priceDrop, vehicleAlt } from "./format";

/**
 * Formatting.
 *
 * Prices are the most repeated content on the platform and the easiest thing to get subtly
 * wrong. South African convention groups thousands with a SPACE: `R 249 900`. `R249,900`
 * reads as an American import and `R249900` reads as a mistake.
 *
 * `toLocaleString("en-ZA")` is not consistent across Node builds and ICU versions: some
 * emit a comma, some a non-breaking space, some a regular one. These tests pin the output
 * rather than trusting the runtime, which is why the implementation normalises afterwards.
 */

describe("formatRand", () => {
  it("groups thousands with a space, the South African way", () => {
    expect(formatRand(249900)).toBe("R 249 900");
    expect(formatRand(1249900)).toBe("R 1 249 900");
  });

  it("never emits a comma, whatever the runtime's locale data does", () => {
    for (const value of [1000, 12345, 999999, 1000000, 12345678]) {
      expect(formatRand(value)).not.toMatch(/,/);
    }
  });

  it("never emits a non-breaking space, which breaks copy and paste", () => {
    expect(formatRand(1249900)).not.toMatch(/ /);
  });

  it("shows no decimals, because no dealership prices a car at R 249 900,00", () => {
    expect(formatRand(249900.49)).toBe("R 249 900");
    expect(formatRand(249900.5)).toBe("R 249 901");
  });

  it("handles small and zero values without breaking", () => {
    expect(formatRand(0)).toBe("R 0");
    expect(formatRand(999)).toBe("R 999");
  });
});

describe("formatMonthly", () => {
  it("marks an instalment clearly as per month", () => {
    // Always shown beside the NCA disclaimer. The `pm` is what stops a monthly figure
    // reading as a price.
    expect(formatMonthly(5480)).toBe("R 5 480 pm");
  });
});

describe("formatKm and formatCc", () => {
  it("groups mileage with a space and keeps the unit", () => {
    expect(formatKm(147200)).toBe("147 200 km");
    expect(formatKm(0)).toBe("0 km");
  });

  it("formats engine capacity the same way", () => {
    expect(formatCc(2755)).toBe("2 755 cc");
  });
});

describe("priceDrop", () => {
  it("says how much came off, which is what a buyer wants to know", () => {
    expect(priceDrop(280000, 300000)).toBe("R 20 000 off");
  });

  it("says nothing when there is no previous price", () => {
    expect(priceDrop(280000, null)).toBeNull();
    expect(priceDrop(280000, undefined)).toBeNull();
  });

  it("says nothing when the price went UP, rather than reporting a negative drop", () => {
    expect(priceDrop(300000, 280000)).toBeNull();
  });

  it("says nothing when the price is unchanged", () => {
    expect(priceDrop(280000, 280000)).toBeNull();
  });
});

describe("vehicleAlt", () => {
  it("describes the vehicle rather than the file", () => {
    expect(
      vehicleAlt({
        modelYear: 2023,
        make: "Toyota",
        model: "Hilux",
        variant: "2.8 GD-6 Raider",
        colour: "Glacier White",
      }),
    ).toBe("2023 Toyota Hilux 2.8 GD-6 Raider in Glacier White");
  });

  it("adds a position only when there is more than one photo", () => {
    const base = { modelYear: 2023, make: "Toyota", model: "Hilux" };
    expect(vehicleAlt({ ...base, index: 0, total: 1 })).toBe("2023 Toyota Hilux");
    expect(vehicleAlt({ ...base, index: 2, total: 8 })).toBe("2023 Toyota Hilux, photo 3 of 8");
  });

  it("degrades to something useful rather than an empty string", () => {
    // An empty alt on a meaningful image is worse than a vague one: a screen reader then
    // announces the filename, or nothing at all.
    expect(vehicleAlt({})).toBe("Vehicle");
  });

  it("skips missing parts without leaving double spaces", () => {
    expect(vehicleAlt({ make: "Toyota", model: "Hilux" })).toBe("Toyota Hilux");
    expect(vehicleAlt({ modelYear: 2023, model: "Hilux" })).toBe("2023 Hilux");
  });
});
