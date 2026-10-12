import { describe, expect, it } from "vitest";

import {
  type AdCar,
  type AdDealer,
  carCaption,
  detailLine,
  priceLabel,
  showroomCaption,
} from "./caption";

const NBSP = " ";

const car: AdCar = {
  id: 1,
  title: "2021 Toyota Hilux 2.8 GD-6 Raider",
  year: 2021,
  price: 549900,
  mileageKm: 64000,
  transmission: "Automatic",
  town: "Pretoria",
  url: "https://rynet.co.za/vehicles/toyota/hilux/2021-rn1",
  photos: ["/media/a.webp"],
};

const dealer: AdDealer = {
  tradingName: "Smith Motors",
  logoUrl: null,
  showroomUrl: "https://rynet.co.za/dealers/smith-motors",
  town: "Pretoria",
};

describe("the words on an ad", () => {
  it("writes the detail line from what the car says, and nothing else", () => {
    expect(detailLine(car)).toBe(`64${NBSP}000${NBSP}km  |  Automatic  |  Pretoria`);
    expect(detailLine({ ...car, mileageKm: null, transmission: null })).toBe("Pretoria");
  });

  it("writes Rand the South African way and leaves a missing price off", () => {
    expect(priceLabel(549900)).toBe(`R${NBSP}549${NBSP}900`);
    expect(priceLabel(null)).toBeNull();
    expect(priceLabel(0)).toBeNull();
  });

  it("captions a car with its facts, the dealership and the link", () => {
    const text = carCaption(car, dealer);
    expect(text).toContain("Fresh on Rynet: 2021 Toyota Hilux 2.8 GD-6 Raider");
    expect(text).toContain("At Smith Motors in Pretoria");
    expect(text.endsWith(car.url)).toBe(true);
  });

  it("captions a showroom with its real count", () => {
    expect(showroomCaption(dealer, 1)).toContain("1 car in their showroom");
    expect(showroomCaption(dealer, 86)).toContain("86 cars in their showroom");
  });

  it("uses no dashes or ellipses", () => {
    const banned = new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026, 0xb7)}]`);
    expect(carCaption(car, dealer)).not.toMatch(banned);
    expect(showroomCaption(dealer, 3)).not.toMatch(banned);
  });
});
