import { describe, expect, it } from "vitest";

import { photoUrls } from "./motors";
import { looksLikeBanner } from "./photos";

describe("photoUrls fallback", () => {
  const logo =
    '"@type":"ImageObject","@id":"https://amicomotors.co.za/#/schema/logo/image/","url":"https://amicomotors.co.za/wp-content/uploads/2024/12/Multi-Franchise-Logo-3.jpg","contentUrl":"https://amicomotors.co.za/wp-content/uploads/2024/12/Multi-Franchise-Logo-3.jpg"';
  const primary =
    '"@type":"ImageObject","@id":"https://amicomotors.co.za/listings/focus/#primaryimage","url":"https://amicomotors.co.za/wp-content/uploads/2026/10/IMG-20261012-WA0099.jpg","contentUrl":"https://amicomotors.co.za/wp-content/uploads/2026/10/IMG-20261012-WA0099.jpg"';

  it("never takes the site's logo when a listing has no gallery yet", () => {
    expect(photoUrls(`<script>{${logo}}</script>`)).toEqual([]);
  });

  it("takes the page's own photograph over the logo, in either order", () => {
    const want = ["https://amicomotors.co.za/wp-content/uploads/2026/10/IMG-20261012-WA0099.jpg"];
    expect(photoUrls(`<script>{${logo}},{${primary}}</script>`)).toEqual(want);
    expect(photoUrls(`<script>{${primary}},{${logo}}</script>`)).toEqual(want);
  });
});

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
