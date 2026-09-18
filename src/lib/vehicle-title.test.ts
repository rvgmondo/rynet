import { describe, expect, it } from "vitest";

import { UNTITLED_VEHICLE, vehicleTitle } from "./vehicle-title";

describe("vehicleTitle", () => {
  it("joins year, make, model and variant", () => {
    expect(
      vehicleTitle({ modelYear: 2023, make: "Toyota", model: "Corolla Cross", variant: "1.8 Xi" }),
    ).toBe("2023 Toyota Corolla Cross 1.8 Xi");
  });

  it("leaves out a missing variant", () => {
    expect(
      vehicleTitle({ modelYear: 2019, make: "Volkswagen", model: "Polo", variant: null }),
    ).toBe("2019 Volkswagen Polo");
  });

  it("leaves out a missing make without a double space", () => {
    expect(vehicleTitle({ modelYear: 2021, make: "", model: "Hilux", variant: "2.8 GD-6" })).toBe(
      "2021 Hilux 2.8 GD-6",
    );
  });

  it("falls back when there is nothing to name the car by", () => {
    expect(vehicleTitle({})).toBe(UNTITLED_VEHICLE);
    expect(vehicleTitle({ modelYear: null, make: "  ", model: undefined })).toBe(UNTITLED_VEHICLE);
  });

  it("reads a year stored as a string, and ignores one that is not a number", () => {
    expect(vehicleTitle({ modelYear: "2018", make: "Ford", model: "Ranger" })).toBe(
      "2018 Ford Ranger",
    );
    expect(vehicleTitle({ modelYear: "2018.0", make: "Ford" })).toBe("2018 Ford");
    expect(vehicleTitle({ modelYear: "soon", make: "Ford" })).toBe("Ford");
  });

  it("tidies stray spaces inside a name", () => {
    expect(vehicleTitle({ modelYear: 2024, make: " BMW ", model: "X3  xDrive20d " })).toBe(
      "2024 BMW X3 xDrive20d",
    );
  });
});
