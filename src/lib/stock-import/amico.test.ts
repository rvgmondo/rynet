import { describe, expect, it } from "vitest";

import {
  amicoSlug,
  isAmicoListingUrl,
  listedPrice,
  listedYear,
  parseAmicoListing,
  plainText,
} from "./amico";
import { blockWithClass, listItems, sitemapLocations, textOf } from "./html";

/**
 * The fixture is a cut down copy of a real page, keeping every shape the reader depends on: the
 * body class with the post number in it, the two column table, the price widget, the prose block,
 * the feature list and the gallery links. Tests against markup invented from scratch would prove
 * only that the reader can read invented markup. The salesperson's name and number in the prose
 * are made up.
 */
const PAGE = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
{"@type":"WebPage","name":"Volkswagen Polo GP 1.2 Tsi Comfortline (66kw) 5dr 2015 - SA Multi Franchise Motor Group"},
{"@type":"ImageObject","contentUrl":"https://amicomotors.co.za/wp-content/uploads/2025/11/one.jpg"}]}</script>
</head>
<body class="single single-listings postid-8978 wp-theme-motors">
<div class="single-car-prices"><div class="single-regular-price text-center"><span class="h3"> R169 000 </span></div></div>
<div class="single-car-data"><table>
<tr><td class="t-label">Year</td><td class="t-value h6">2015</td></tr>
<tr><td class="t-label">Mileage</td><td class="t-value h6">122000km</td></tr>
<tr><td class="t-label">Body</td><td class="t-value h6">Hatchbacks</td></tr>
<tr><td class="t-label">Make</td><td class="t-value h6">Volkswagen</td></tr>
<tr><td class="t-label">Model</td><td class="t-value h6">Polo</td></tr>
<tr><td class="t-label">Fuel type</td><td class="t-value h6">Petrol</td></tr>
<tr><td class="t-label">Engine</td><td class="t-value h6">12</td></tr>
<tr><td class="t-label">Transmission</td><td class="t-value h6">Manual</td></tr>
<tr><td class="t-label">Exterior Color</td><td class="t-value h6">Dark Grey Metallic</td></tr>
<tr><td class="t-label">Interior Color</td><td class="t-value h6">Black</td></tr>
</table></div>
<div class="post-content"><p>This car still sparkles, looked after with original service books.&nbsp; Call whatsapp Thandi 0820000001</p></div>
<div class="stm-single-listing-car-features grouped_features"><div class="lists-horizontal"><ul>
<li><i class="fas fa-check-circle"></i><span>ABS</span></li>
<li><i class="fas fa-check-circle"></i><span>Cruise control</span></li>
</ul></div></div>
<div class="swiper-container motors-elementor-big-gallery"><div class="swiper-wrapper">
<div class="stm-single-image swiper-slide"><a href="https://amicomotors.co.za/wp-content/uploads/2025/11/one.jpg" class="stm_fancybox" rel="stm-car-gallery"><img src="https://amicomotors.co.za/wp-content/uploads/2025/11/one-798x466.jpg" alt="" /></a></div>
<div class="stm-single-image swiper-slide"><a href="https://amicomotors.co.za/wp-content/uploads/2025/11/two.jpg" class="stm_fancybox" rel="stm-car-gallery"><img src="https://amicomotors.co.za/wp-content/uploads/2025/11/two-798x466.jpg" alt="" /></a></div>
<div class="stm-single-image swiper-slide"><a href="https://amicomotors.co.za/wp-content/uploads/2025/11/two.jpg" class="stm_fancybox" rel="stm-car-gallery"><img src="https://amicomotors.co.za/wp-content/uploads/2025/11/two-150x150.jpg" alt="" /></a></div>
</div></div>
</body></html>`;

const URL =
  "https://amicomotors.co.za/listings/volkswagen-polo-gp-1-2-tsi-comfortline-66kw-5dr-2015/";

describe("reading one Amico listing", () => {
  const listing = parseAmicoListing(PAGE, URL);

  it("uses the WordPress post number as the identifier", () => {
    // The address changes when a title is edited. The post number does not.
    expect(listing.externalId).toBe("8978");
    expect(listing.source).toBe("amicomotors.co.za");
  });

  it("reads the car out of the table", () => {
    expect(listing.makeText).toBe("Volkswagen");
    expect(listing.modelText).toBe("Polo");
    expect(listing.year).toBe(2015);
    expect(listing.mileageKm).toBe(122000);
    expect(listing.bodyText).toBe("Hatchbacks");
    expect(listing.fuelText).toBe("Petrol");
    expect(listing.transmissionText).toBe("Manual");
    expect(listing.exteriorColourText).toBe("Dark Grey Metallic");
    expect(listing.interiorColourText).toBe("Black");
  });

  it("reads the price in whole rands", () => {
    expect(listing.price).toBe(169000);
  });

  it("takes the group's name off the end of the title", () => {
    expect(listing.title).toBe("Volkswagen Polo GP 1.2 Tsi Comfortline (66kw) 5dr 2015");
  });

  it("cleans the salesperson out of the description", () => {
    expect(listing.description).toBe(
      "This car still sparkles, looked after with original service books.",
    );
    expect(listing.removedContactDetails).toBe(1);
  });

  it("takes the full size photographs, each one only once", () => {
    expect(listing.photoUrls).toEqual([
      "https://amicomotors.co.za/wp-content/uploads/2025/11/one.jpg",
      "https://amicomotors.co.za/wp-content/uploads/2025/11/two.jpg",
    ]);
  });

  it("reads the features the page lists", () => {
    expect(listing.features).toEqual(["ABS", "Cruise control"]);
  });
});

describe("what it deliberately does not read", () => {
  it("has no engine size, because the column holds three different units", () => {
    const listing = parseAmicoListing(PAGE, URL);
    expect(listing).not.toHaveProperty("engineCapacityCc");
  });
});

describe("falling back", () => {
  it("takes the year off the end of the address when the table has none", () => {
    expect(listedYear({}, "audi-a1-sportback-1-4-t-fsi-ambition-2013")).toBe(2013);
    expect(listedYear({}, "toyota-rav4-2-0-gx-mark-ii-2013-3")).toBe(2013);
    expect(listedYear({}, "mazda-cx-3-2-0-individual-plus-auto")).toBeNull();
  });

  it("prefers what the table says over the address", () => {
    expect(listedYear({ year: "2017" }, "audi-q2-2-0-tdi-sport-2016")).toBe(2017);
  });

  it("gives back no price when the page shows none", () => {
    expect(listedPrice("<div>nothing here</div>")).toBeNull();
    expect(
      listedPrice(
        '<div class="single-car-prices"><div class="single-regular-price">POA</div></div>',
      ),
    ).toBeNull();
  });

  it("reads a price written with cents as whole rands", () => {
    expect(
      listedPrice(
        '<div class="single-car-prices"><div class="single-regular-price">R 169 000.00</div></div>',
      ),
    ).toBe(169000);
  });

  it("writes four by four with the letter a buyer types", () => {
    expect(plainText("Double Cab 4\u00d74 Auto")).toBe("Double Cab 4x4 Auto");
  });
});

describe("addresses", () => {
  it("recognises a listing page and nothing else", () => {
    expect(isAmicoListingUrl("https://amicomotors.co.za/listings/ford-fiesta-2014/")).toBe(true);
    expect(isAmicoListingUrl("https://amicomotors.co.za/listings/")).toBe(false);
    expect(isAmicoListingUrl("https://www.autotrader.co.za/listings/anything/")).toBe(false);
  });

  it("reads the name at the end of one", () => {
    expect(amicoSlug(URL)).toBe("volkswagen-polo-gp-1-2-tsi-comfortline-66kw-5dr-2015");
  });
});

describe("the small amount of HTML reading", () => {
  it("takes a block by its class, nested tags and all", () => {
    const block = blockWithClass(
      '<div class="a"><div class="b">inner</div>outer</div><div>after</div>',
      "a",
    );
    expect(textOf(block ?? "")).toBe("inner outer");
  });

  it("decodes entities and collapses whitespace", () => {
    expect(textOf("<p>One&nbsp;&amp;   two</p>")).toBe("One & two");
  });

  it("reads list items and drops the empty ones", () => {
    expect(listItems("<ul><li>One</li><li> </li><li>Two</li></ul>")).toEqual(["One", "Two"]);
  });

  it("reads every address out of a sitemap", () => {
    expect(
      sitemapLocations("<url><loc>https://a/</loc></url><url><loc>https://b/</loc></url>"),
    ).toEqual(["https://a/", "https://b/"]);
  });
});
