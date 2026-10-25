import { describe, expect, it } from "vitest";

import { looksLikeBanner } from "./photos";

describe("looksLikeBanner", () => {
  it("catches the banner Amico's 2017 Ford Focus led with", () => {
    expect(looksLikeBanner({ width: 347, height: 103 })).toBe(true);
  });

  it("catches a wide banner even at full width", () => {
    expect(looksLikeBanner({ width: 1280, height: 400 })).toBe(true);
  });

  it("catches a small logo", () => {
    expect(looksLikeBanner({ width: 300, height: 300 })).toBe(true);
  });

  it("keeps ordinary photographs of cars", () => {
    expect(looksLikeBanner({ width: 1280, height: 960 })).toBe(false);
    expect(looksLikeBanner({ width: 826, height: 612 })).toBe(false);
    expect(looksLikeBanner({ width: 500, height: 333 })).toBe(false);
    expect(looksLikeBanner({ width: 1280, height: 630 })).toBe(false);
  });

  it("keeps an image whose size is unknown rather than guessing", () => {
    expect(looksLikeBanner({ width: 0, height: 0 })).toBe(false);
  });
});
