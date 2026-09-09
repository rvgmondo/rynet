import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";
import {
  FALLBACK_SWATCH,
  grainFor,
  inkFor,
  MILEAGE_CEILING_KM,
  normaliseSwatch,
  plateFor,
  sweepFor,
} from "./vehicle-plate";

/**
 * The colour plate fills the image area on a site with no vehicle photography, using the car's
 * real paint colour and the manufacturer's own name for it.
 *
 * The test that matters is the last block: every colour actually in the taxonomy has to carry
 * readable text. A plate is not decoration, it has a label on it, and "Glacier White" and
 * "Midnight Black" are both real entries.
 */

/** Copied from the seeded `colours` taxonomy. If a colour is added there, add it here. */
const REAL_SWATCHES: [string, string][] = [
  ["Aegean Blue", "#2C5C8A"],
  ["Bronze", "#6E4B32"],
  ["Chilli Red", "#B4232C"],
  ["Deep Sea Blue", "#1F3A5F"],
  ["Emotion Red", "#C0242E"],
  ["Glacier White", "#F4F5F7"],
  ["Graphite Grey", "#5A5E63"],
  ["Midnight Black", "#141518"],
  ["Panther Black", "#1B1C1F"],
  ["Pearl White", "#F0F0EC"],
  ["Platinum Silver", "#B6BABF"],
  ["Racing Green", "#1E3B2A"],
  ["Sandstone Beige", "#C9BBA3"],
  ["Silver", "#C4C7CC"],
  ["Solar Orange", "#D2622A"],
  ["Titanium Grey", "#7A7E84"],
];

describe("normaliseSwatch", () => {
  it("accepts what the database actually holds", () => {
    expect(normaliseSwatch("#2C5C8A")).toBe("#2C5C8A");
    expect(normaliseSwatch("2c5c8a")).toBe("#2C5C8A");
    expect(normaliseSwatch("  #2c5c8a  ")).toBe("#2C5C8A");
  });

  it("expands a three digit hex, because hand-entered data has them", () => {
    expect(normaliseSwatch("#abc")).toBe("#AABBCC");
  });

  it("falls back rather than throwing on anything unusable", () => {
    for (const rubbish of [null, undefined, "", "   ", "red", "#12345", "#GGGGGG", "rgb(1,2,3)"]) {
      expect(normaliseSwatch(rubbish), String(rubbish)).toBe(FALLBACK_SWATCH);
    }
  });
});

describe("sweepFor", () => {
  it("is zero for a car with no mileage recorded", () => {
    for (const value of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sweepFor(value as number), String(value)).toBe(0);
    }
  });

  it("is linear up to the ceiling", () => {
    expect(sweepFor(MILEAGE_CEILING_KM / 2)).toBeCloseTo(0.5, 5);
    expect(sweepFor(MILEAGE_CEILING_KM)).toBe(1);
  });

  it("clamps rather than overflowing the arc", () => {
    expect(sweepFor(MILEAGE_CEILING_KM * 3)).toBe(1);
    expect(sweepFor(9_999_999)).toBe(1);
  });

  it("keeps a difference a buyer cares about visible", () => {
    // 30 000km and 90 000km is most of the buying decision, so they must not look alike.
    expect(sweepFor(90_000) - sweepFor(30_000)).toBeGreaterThan(0.2);
  });
});

describe("grainFor", () => {
  it("is deterministic, so the plate does not flicker between server and client", () => {
    expect(grainFor("RN0S7TX5")).toBe(grainFor("RN0S7TX5"));
  });

  it("stays in range", () => {
    for (const seed of ["", "a", "RN0S7TX5", "x".repeat(200)]) {
      const value = grainFor(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(360);
    }
  });

  it("spreads across the range rather than clustering", () => {
    const seeds = Array.from({ length: 300 }, (_, i) => `RN${i.toString(36).toUpperCase()}`);
    const buckets = new Set(seeds.map((s) => Math.floor(grainFor(s) / 60)));
    expect(buckets.size).toBeGreaterThanOrEqual(5);
  });
});

describe("ink on every colour the taxonomy actually contains", () => {
  /**
   * The whole point. The plate carries the manufacturer's colour name, so a paint colour that
   * cannot hold readable text is a paint colour that breaks the page. This asserts against the
   * real seeded values rather than a convenient sample.
   */
  for (const [name, swatch] of REAL_SWATCHES) {
    it(`${name} carries readable text`, () => {
      const { ink, contrast } = inkFor(swatch);
      expect(
        contrast,
        `${name} (${swatch}) with ${ink} ink reaches only ${contrast.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("picks light ink on the dark colours and dark ink on the light ones", () => {
    expect(inkFor("#141518").ink).toBe("light");
    expect(inkFor("#1B1C1F").ink).toBe("light");
    expect(inkFor("#F4F5F7").ink).toBe("dark");
    expect(inkFor("#F0F0EC").ink).toBe("dark");
  });

  it("always picks whichever ink is genuinely better", () => {
    for (const [, swatch] of REAL_SWATCHES) {
      const { ink, contrast } = inkFor(swatch);
      const other = ink === "light" ? "#0C0D0F" : "#FFFFFF";
      expect(contrast).toBeGreaterThanOrEqual(contrastRatio(other, swatch));
    }
  });

  it("the fallback swatch is readable too", () => {
    expect(inkFor(FALLBACK_SWATCH).contrast).toBeGreaterThanOrEqual(4.5);
  });
});

describe("plateFor", () => {
  it("builds a complete plate from a real listing", () => {
    const plate = plateFor({
      publicRef: "RN0S7TX5",
      mileageKm: 125_000,
      colourSwatch: "#2C5C8A",
      colourName: "Aegean Blue",
    });

    expect(plate.swatch).toBe("#2C5C8A");
    expect(plate.colourName).toBe("Aegean Blue");
    expect(plate.ink).toBe("light");
    expect(plate.sweep).toBeCloseTo(0.5, 5);
    expect(plate.inkContrast).toBeGreaterThanOrEqual(4.5);
  });

  it("prints no label rather than a made up one", () => {
    // "Unknown" on a gallery label is worse than no label.
    expect(plateFor({ colourName: null }).colourName).toBeNull();
    expect(plateFor({ colourName: "   " }).colourName).toBeNull();
  });

  it("survives a listing with nothing useful on it", () => {
    const plate = plateFor({});
    expect(plate.swatch).toBe(FALLBACK_SWATCH);
    expect(plate.sweep).toBe(0);
    expect(plate.inkContrast).toBeGreaterThanOrEqual(4.5);
  });
});
