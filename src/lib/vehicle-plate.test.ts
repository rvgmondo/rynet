import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";
import {
  FALLBACK_SWATCH,
  grainFor,
  MILEAGE_CEILING_KM,
  normaliseSwatch,
  oklchToHex,
  PAINT_L_DOMAIN,
  PLATE,
  PLATE_CHROMA_MAX,
  PLATE_INK,
  plateField,
  plateFor,
  primerField,
  provinceCodeFor,
  srgbToOklch,
  sweepFor,
} from "./vehicle-plate";

/**
 * The colour plate fills the image area on a site with no vehicle photography, using the
 * car's real paint colour and the manufacturer's own name for it.
 *
 * The block that matters most is the contrast sweep. Because the plate discards the
 * dealer's lightness and substitutes a theme constant, readability stops being 311 checks
 * against whatever hex someone typed and becomes a bounded set: every hue at the chromatic
 * value, plus the two ends of the neutral band. If that sweep passes, no vehicle anyone
 * ever lists can produce an unreadable plate.
 */

/** Copied from the seeded `colours` taxonomy. If a colour is added there, add it here. */
const REAL_COLOURS: [string, string, string][] = [
  ["Glacier White", "#F4F5F7", "white"],
  ["Pearl White", "#F0F0EC", "white"],
  ["Silver", "#C4C7CC", "silver"],
  ["Platinum Silver", "#B6BABF", "silver"],
  ["Graphite Grey", "#5A5E63", "grey"],
  ["Titanium Grey", "#7A7E84", "grey"],
  ["Midnight Black", "#141518", "black"],
  ["Panther Black", "#1B1C1F", "black"],
  ["Deep Sea Blue", "#1F3A5F", "blue"],
  ["Aegean Blue", "#2C5C8A", "blue"],
  ["Chilli Red", "#B4232C", "red"],
  ["Emotion Red", "#C0242E", "red"],
  ["Racing Green", "#1E3B2A", "green"],
  ["Sandstone Beige", "#C9BBA3", "beige"],
  ["Bronze", "#6E4B32", "brown"],
  ["Solar Orange", "#D2622A", "orange"],
];

const THEMES = ["light", "dark"] as const;

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

describe("OKLCH conversion", () => {
  it("round trips a colour back to roughly itself", () => {
    for (const [, swatch] of REAL_COLOURS.map((c) => [c[0], c[1]])) {
      const [L, C, H] = srgbToOklch(swatch as string);
      expect(oklchToHex(L, C, H)).toBe(swatch);
    }
  });

  it("clips into gamut by dropping chroma, not by clamping channels", () => {
    // A chroma no sRGB display can show. Clamping channels would swing the hue; reducing
    // chroma keeps it, which is the plate's one promise about the dealer's colour.
    const wanted = 200;
    const [, chroma, hue] = srgbToOklch(oklchToHex(0.4, 0.4, wanted));
    expect(chroma).toBeLessThan(0.4);
    expect(Math.abs(hue - wanted)).toBeLessThan(2);
  });

  it("produces a parseable six digit hex for every hue", () => {
    for (let hue = 0; hue < 360; hue += 1) {
      expect(oklchToHex(0.4, PLATE_CHROMA_MAX, hue)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("plate ink is readable on any field this can ever produce", () => {
  /**
   * The whole point of discarding the dealer's lightness. These are not samples: between
   * them the hue sweep and the neutral band cover every field colour the function can
   * return, so passing here means no listing can ever produce an unreadable plate.
   */
  for (const theme of THEMES) {
    it(`${theme}: every hue at the chromatic value clears 4.5:1`, () => {
      let worst = { hue: -1, ratio: Number.POSITIVE_INFINITY, hex: "" };
      for (let hue = 0; hue < 360; hue += 1) {
        const hex = oklchToHex(PLATE[theme].chromaticL, PLATE_CHROMA_MAX, hue);
        const ratio = contrastRatio(PLATE_INK, hex);
        if (ratio < worst.ratio) worst = { hue, ratio, hex };
      }
      expect(
        worst.ratio,
        `worst hue ${worst.hue} (${worst.hex}) reaches only ${worst.ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme}: both ends of the neutral band clear 4.5:1`, () => {
      const { neutralMinL, neutralMaxL } = PLATE[theme];
      for (const L of [neutralMinL, neutralMaxL]) {
        const hex = oklchToHex(L, 0.01, 250);
        expect(contrastRatio(PLATE_INK, hex), `${hex} at L ${L}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${theme}: the primer clears 4.5:1`, () => {
      expect(contrastRatio(PLATE_INK, primerField(theme))).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme}: every seeded colour clears 4.5:1`, () => {
      for (const [name, swatch, family] of REAL_COLOURS) {
        const hex = plateField(swatch, family, theme);
        expect(contrastRatio(PLATE_INK, hex), `${name} -> ${hex}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("plateField", () => {
  it("keeps the hue of a chromatic paint and throws its lightness away", () => {
    const [, , sourceHue] = srgbToOklch("#2C5C8A");
    const [fieldL, , fieldHue] = srgbToOklch(plateField("#2C5C8A", "blue", "light"));

    expect(Math.abs(fieldHue - sourceHue)).toBeLessThan(2);
    expect(fieldL).toBeCloseTo(PLATE.light.chromaticL, 2);
  });

  it("lands every chromatic paint on one tonal value, which is why the wall works", () => {
    const chromatic = REAL_COLOURS.filter(
      ([, , family]) => !["white", "silver", "grey", "black"].includes(family),
    );
    const lightnesses = chromatic.map(
      ([, swatch, family]) => srgbToOklch(plateField(swatch, family, "light"))[0],
    );

    expect(Math.max(...lightnesses) - Math.min(...lightnesses)).toBeLessThan(0.01);
  });

  it("orders the neutrals, so white is the lightest plate and black the darkest", () => {
    const l = (swatch: string, family: string) =>
      srgbToOklch(plateField(swatch, family, "light"))[0];

    expect(l("#F4F5F7", "white")).toBeGreaterThan(l("#C4C7CC", "silver"));
    expect(l("#C4C7CC", "silver")).toBeGreaterThan(l("#7A7E84", "grey"));
    expect(l("#7A7E84", "grey")).toBeGreaterThan(l("#141518", "black"));
  });

  it("keeps every neutral inside the band, so no grey plate can go out of range", () => {
    for (const [name, swatch, family] of REAL_COLOURS) {
      if (!["white", "silver", "grey", "black"].includes(family)) continue;
      const [L] = srgbToOklch(plateField(swatch, family, "light"));
      expect(L, name).toBeGreaterThanOrEqual(PLATE.light.neutralMinL - 0.01);
      expect(L, name).toBeLessThanOrEqual(PLATE.light.neutralMaxL + 0.01);
    }
  });

  it("caps chroma, because a saturated wall reads as podcast covers rather than paint", () => {
    // A hue the sRGB gamut can hold at full chroma, so this tests the cap and not the clip.
    const [, chroma] = srgbToOklch(plateField("#FF0090", "purple", "light"));
    expect(chroma).toBeLessThanOrEqual(PLATE_CHROMA_MAX + 0.001);
  });

  it("never returns a colour outside the paint domain it was told to expect", () => {
    const [lo, hi] = PAINT_L_DOMAIN;
    expect(lo).toBeLessThan(hi);
  });
});

describe("plateFor", () => {
  it("builds a complete plate from a real listing", () => {
    const plate = plateFor({
      publicRef: "RN0S7TX5",
      mileageKm: 125_000,
      colourSwatch: "#2C5C8A",
      colourFamily: "blue",
      colourName: "Aegean Blue",
    });

    expect(plate.colourName).toBe("Aegean Blue");
    expect(plate.isPrimer).toBe(false);
    expect(plate.sweep).toBeCloseTo(0.5, 5);
    expect(plate.field).toMatch(/^#[0-9A-F]{6}$/);
    expect(plate.fieldDark).toMatch(/^#[0-9A-F]{6}$/);
    expect(contrastRatio(PLATE_INK, plate.field)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(PLATE_INK, plate.fieldDark)).toBeGreaterThanOrEqual(4.5);
  });

  it("draws primer when there is no hue to draw", () => {
    // The FIELD needs a swatch. Without one there is nothing to derive a hue from, so the
    // plate is an unpainted panel whether or not the colour has a name.
    for (const missing of [{ colourName: "Cosmic Bronze Metallic" }, { colourSwatch: null }, {}]) {
      const plate = plateFor(missing);
      expect(plate.isPrimer, JSON.stringify(missing)).toBe(true);
      expect(plate.field).toBe(primerField("light"));
    }
  });

  it("still prints the manufacturer's name when only the swatch is missing", () => {
    /*
     * `swatch` is optional on the colours taxonomy, so a dealership recording "Cosmic Bronze
     * Metallic" with no hex has told the truth about the car. Demanding both and falling back
     * to "Colour not supplied" said the colour was unknown when it had been supplied.
     */
    const plate = plateFor({ colourName: "Cosmic Bronze Metallic" });
    expect(plate.colourName).toBe("Cosmic Bronze Metallic");
    expect(plate.isPrimer).toBe(true);
  });

  it("prints no label rather than an invented one", () => {
    // "Unknown" on a gallery label is worse than no label.
    expect(plateFor({ colourName: null, colourSwatch: "#2C5C8A" }).colourName).toBeNull();
    expect(plateFor({ colourName: "   ", colourSwatch: "#2C5C8A" }).colourName).toBeNull();
  });

  it("survives a listing with nothing useful on it", () => {
    const plate = plateFor({});
    expect(plate.sweep).toBe(0);
    expect(contrastRatio(PLATE_INK, plate.field)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("provinceCodeFor", () => {
  it("uses the official codes rather than an abbreviation", () => {
    expect(provinceCodeFor("Limpopo")).toBe("LP");
    expect(provinceCodeFor("KwaZulu-Natal")).toBe("KZN");
    expect(provinceCodeFor("Gauteng")).toBe("GP");
    expect(provinceCodeFor("north west")).toBe("NW");
  });

  it("prints nothing rather than guessing", () => {
    expect(provinceCodeFor(null)).toBeNull();
    expect(provinceCodeFor("Lusaka")).toBeNull();
  });
});
