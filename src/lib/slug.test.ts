import { describe, expect, it } from "vitest";

import { generatePublicRef, isReservedSlug, RESERVED_ROUTE_SLUGS, slugify } from "./slug";

/**
 * Slugs and public references.
 *
 * The accent cases below are the ones that cost time on MotoHubSA, where four near-copies
 * of this function existed and only one handled them. They are pinned here so the fifth
 * copy never gets written.
 */

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Toyota Hilux Raider")).toBe("toyota-hilux-raider");
  });

  it("decomposes accents to their base letter rather than dropping them", () => {
    // Without NFKD the combining mark becomes a hyphen and the word loses a letter, which
    // is how "Ténéré" became "te-ne-re" and then "t-n-r".
    expect(slugify("Ténéré 700")).toBe("tenere-700");
    expect(slugify("Citroën C4 Picasso")).toBe("citroen-c4-picasso");
    expect(slugify("Škoda Octavia")).toBe("skoda-octavia");
  });

  it("drops apostrophes instead of hyphenating them", () => {
    expect(slugify("Owner's manual")).toBe("owners-manual");
    expect(slugify("Owner’s manual")).toBe("owners-manual");
  });

  it("collapses runs of punctuation into a single hyphen", () => {
    expect(slugify("2.8 GD-6  Legend / RS")).toBe("2-8-gd-6-legend-rs");
  });

  it("never starts or ends with a hyphen", () => {
    expect(slugify("  Hilux  ")).toBe("hilux");
    expect(slugify("---Hilux---")).toBe("hilux");
    expect(slugify("(Hilux)")).toBe("hilux");
  });

  it("returns an empty string for input with nothing usable", () => {
    // The caller rejects this rather than saving it. An empty slug would take out the
    // whole collection's URL space.
    expect(slugify("///")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("truncates without leaving a trailing hyphen", () => {
    const long = `${"a".repeat(20)} ${"b".repeat(20)}`;
    expect(slugify(long, 21)).toBe("a".repeat(20));
  });

  it("survives a pasted path, which is what someone will do", () => {
    // A real incident: a pasted path went in verbatim, the URL became `/articles//slug/`,
    // and the post was live and unreachable with no error anywhere.
    expect(slugify("/toyota-hilux-2026/")).toBe("toyota-hilux-2026");
  });
});

describe("reserved slugs", () => {
  it("blocks the words that would shadow a facet route", () => {
    // `/cars/[make]` sits alongside `/cars/in/...` and `/cars/body/...`. A make slugged
    // `in` would silently shadow every location landing page on the site.
    for (const word of ["in", "body", "fuel", "new", "demo", "used"]) {
      expect(isReservedSlug(word)).toBe(true);
    }
  });

  it("allows a normal manufacturer name", () => {
    for (const make of ["toyota", "volkswagen", "mercedes-benz", "bmw"]) {
      expect(isReservedSlug(make)).toBe(false);
    }
  });

  it("keeps the reserved list and the route segments in step", () => {
    // If a route segment is added under /cars/ it must be added here too, or the next
    // manufacturer with that name breaks the site quietly.
    for (const segment of ["in", "body", "fuel"]) {
      expect(RESERVED_ROUTE_SLUGS).toContain(segment);
    }
  });
});

describe("generatePublicRef", () => {
  it("is prefixed and uses Crockford base32", () => {
    const ref = generatePublicRef();
    expect(ref).toMatch(/^RN[0-9A-HJKMNP-TV-Z]{6}$/);
  });

  it("excludes the letters that get misread aloud", () => {
    // Crockford drops I, L, O and U so a reference read over the phone cannot be confused
    // with 1 or 0, and cannot accidentally spell anything.
    const refs = Array.from({ length: 300 }, () => generatePublicRef().slice(2));
    expect(refs.join("")).not.toMatch(/[ILOU]/);
  });

  it("does not collide across a realistic number of listings", () => {
    const refs = new Set(Array.from({ length: 5000 }, () => generatePublicRef()));
    expect(refs.size).toBe(5000);
  });
});
