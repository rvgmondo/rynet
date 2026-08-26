import { describe, expect, it } from "vitest";

import { contrastRatio, darkenToMeet, hexToRgb, relativeLuminance } from "./contrast";

/**
 * Contrast.
 *
 * Three callers must agree on these numbers: the CI token report, the dealer microsite
 * colour validator, and the design system documentation. If this drifts, a dealership gets
 * told their brand colour is fine when it is not.
 *
 * The expected values are the WCAG 2.x reference results, not this implementation's output
 * recorded after the fact.
 */

describe("hexToRgb", () => {
  it("parses six-digit hex", () => {
    expect(hexToRgb("#E32432")).toEqual([227, 36, 50]);
    expect(hexToRgb("#001123")).toEqual([0, 17, 35]);
  });

  it("expands three-digit hex", () => {
    expect(hexToRgb("#FFF")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000")).toEqual([0, 0, 0]);
  });

  it("does not care about the leading hash or the case", () => {
    expect(hexToRgb("e32432")).toEqual([227, 36, 50]);
    expect(hexToRgb("#e32432")).toEqual([227, 36, 50]);
  });
});

describe("relativeLuminance", () => {
  it("anchors at the two extremes", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("gives 21 for black on white, the maximum", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });

  it("gives 1 for a colour against itself", () => {
    expect(contrastRatio("#E32432", "#E32432")).toBeCloseTo(1, 5);
  });

  it("is symmetrical", () => {
    expect(contrastRatio("#E32432", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#E32432"),
      10,
    );
  });

  /**
   * The three brand findings the whole design system is built around. If any of these
   * numbers move, the token set is wrong and the design documentation is lying.
   */
  it("pins brand red on white at 4.60, which clears AA body text by 0.10", () => {
    expect(contrastRatio("#E32432", "#FFFFFF")).toBeCloseTo(4.6, 2);
  });

  it("pins brand red on brand navy at 4.13, which FAILS AA body text", () => {
    const ratio = contrastRatio("#E32432", "#001123");
    expect(ratio).toBeCloseTo(4.13, 2);
    expect(ratio).toBeLessThan(4.5);
  });

  it("pins brand silver on white at 2.08, which fails even the 3:1 non-text minimum", () => {
    const ratio = contrastRatio("#B1B4BB", "#FFFFFF");
    expect(ratio).toBeCloseTo(2.08, 2);
    expect(ratio).toBeLessThan(3);
  });

  it("confirms brand silver on navy passes comfortably, which is silver's real job", () => {
    expect(contrastRatio("#B1B4BB", "#001123")).toBeGreaterThan(4.5);
  });
});

describe("darkenToMeet", () => {
  it("returns a shade that actually reaches the target", () => {
    const fixed = darkenToMeet("#E32432", "#FFFFFF", 4.5);
    expect(contrastRatio(fixed, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("finds a passing shade for a colour that starts badly", () => {
    // A dealership picking a pale brand colour is the case this exists for: the validator
    // rejects it and suggests the nearest shade that works.
    const fixed = darkenToMeet("#FFD400", "#FFFFFF", 4.5);
    expect(contrastRatio(fixed, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a colour that already passes close to where it was", () => {
    const fixed = darkenToMeet("#7A0010", "#FFFFFF", 4.5);
    expect(fixed.toLowerCase()).toBe("#7a0010");
  });

  it("returns black rather than failing when nothing else will do", () => {
    expect(darkenToMeet("#FFFFFF", "#FFFFFF", 21)).toBe("#000000");
  });
});
