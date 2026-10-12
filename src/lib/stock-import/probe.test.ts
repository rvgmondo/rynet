import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { PoliteFetcher } from "./fetch";
import { portalOf, probeWebsite } from "./probe";

const FIXTURES = path.resolve(__dirname, "fixtures", "amico");
const listingHtml = readFileSync(
  path.join(FIXTURES, "ford-ecosport-1-5-ambiente-2016.html"),
  "utf8",
);

function fakeFetcher(pages: Record<string, string>): PoliteFetcher {
  return {
    text: async (url) => {
      const page = pages[url];
      if (page === undefined) throw new Error(`404 Not Found for ${url}`);
      return page;
    },
    bytes: async () => {
      throw new Error("not used");
    },
    count: () => 0,
  };
}

const sitemap = (urls: string[]) =>
  `<?xml version="1.0"?><urlset>${urls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`;

describe("portalOf", () => {
  it.each([
    ["https://www.autotrader.co.za/dealers/amico", "autotrader.co.za"],
    ["cars.co.za/dealer/123", "cars.co.za"],
    ["https://m.facebook.com/amicomotors", "facebook.com"],
  ])("knows %s is a portal", (address, portal) => {
    expect(portalOf(address)).toBe(portal);
  });

  it("does not mistake a dealership for a portal because its name contains one", () => {
    expect(portalOf("https://bestcars.co.za.example.com/")).toBeNull();
    expect(portalOf("https://amicomotors.co.za/")).toBeNull();
  });
});

describe("probeWebsite", () => {
  it("refuses a portal without fetching anything", async () => {
    const result = await probeWebsite("https://www.autotrader.co.za/x", fakeFetcher({}));
    expect(result.readable).toBe(false);
    if (!result.readable) expect(result.reason).toMatch(/portal/);
  });

  it("reads the count and the first car from a Motors site", async () => {
    const car = "https://dealer.example/listings/ford-ecosport-1-5-ambiente-2016/";
    const result = await probeWebsite(
      "dealer.example",
      fakeFetcher({
        "https://dealer.example/listings-sitemap.xml": sitemap([
          car,
          "https://dealer.example/listings/another-car-2019/",
          "https://elsewhere.example/listings/not-theirs/",
        ]),
        [car]: listingHtml,
      }),
    );
    expect(result.readable).toBe(true);
    if (result.readable) {
      expect(result.count).toBe(2);
      expect(result.source).toBe("dealer.example");
      expect(result.sample?.year).toBe(2016);
      expect(result.sample?.photos).toBeGreaterThan(0);
    }
  });

  it("says plainly when a site has no car list", async () => {
    const result = await probeWebsite("https://plain.example", fakeFetcher({}));
    expect(result.readable).toBe(false);
    if (!result.readable) expect(result.reason).toMatch(/spreadsheet/);
  });

  it("says plainly when the car pages are not laid out the Motors way", async () => {
    const car = "https://other.example/listings/a-car/";
    const result = await probeWebsite(
      "https://other.example",
      fakeFetcher({
        "https://other.example/listings-sitemap.xml": sitemap([car]),
        [car]: "<html><body><h1>A car</h1></body></html>",
      }),
    );
    expect(result.readable).toBe(false);
  });
});
