/**
 * The colour plate: what fills a listing's image area when there is no photograph.
 *
 * There is no vehicle photography and there will not be any at launch. The usual answers
 * are both bad: a grey rectangle with a car icon looks broken, and a stock photo of a car
 * that is not this car is a lie on a site whose entire promise is that you know what you
 * are dealing with.
 *
 * So the image area is a field of the car's ACTUAL PAINT COLOUR, with the manufacturer's
 * own name for it set in the corner like a gallery label. Every listing already carries a
 * real exterior colour with a real hex swatch, so this is honest: it is a fact about the
 * car, drawn large.
 *
 * ---------------------------------------------------------------------------------------
 * THE LOAD-BEARING IDEA, and do not undo it.
 *
 * A dealer's raw swatch is not used as the field colour. The hue is kept and the LIGHTNESS
 * IS DISCARDED, replaced by one constant per theme. So 311 vehicles produce 311 different
 * hues at exactly one tonal value.
 *
 * That is what turns contrast from 311 checks against dealer-entered hex into four checks
 * against fixed constants. The wall cannot go muddy, cannot go garish, and cannot fail the
 * build, because the tonal value is not a variable. Every mark drawn on a plate is
 * PLATE_INK and nothing else, in both themes.
 *
 * Roughly 40% of South African stock is white, silver or grey, and eight of the sixteen
 * seeded swatches are achromatic, so those get the opposite treatment: no usable hue, so
 * the hue is discarded and the lightness is remapped into a narrow ORDERED band. Glacier
 * White is the lightest plate on the site, Midnight Black the darkest, silvers and greys
 * stepped between them. Contrast is still solved by construction, because the band is
 * bounded and only its lightest end has to be checked.
 *
 * All of this runs on the SERVER and emits a plain hex. No `oklch()` reaches the
 * stylesheet, so there is no browser colour-function dependency, no client colour maths,
 * and it works on the older Safari and WebView slice of South African mobile traffic.
 */

/** Where the tachometer sweep tops out. Beyond it the needle simply sits at full. */
export const MILEAGE_CEILING_KM = 250_000;

/** Where the redline band starts, as a fraction of the arc. Drawn as weight, never colour. */
export const REDLINE_FROM = 0.8;

/** Used when a listing somehow has no colour on it. Neutral, and obviously not a paint. */
export const FALLBACK_SWATCH = "#8A8F98";

/** The only colour ever drawn on a plate, in either theme. */
export const PLATE_INK = "#EDEDEA";

/** The tonal constants. These mirror the --rn-plate-l-* comments in tokens.css. */
export const PLATE = {
  light: { chromaticL: 0.4, neutralMinL: 0.28, neutralMaxL: 0.48 },
  dark: { chromaticL: 0.44, neutralMinL: 0.32, neutralMaxL: 0.5 },
} as const;

export type PlateTheme = keyof typeof PLATE;

/** Above roughly 0.09 the grid starts looking like podcast cover art. Muted IS the design. */
export const PLATE_CHROMA_MAX = 0.085;
/** A whisper of chroma on the neutrals, cool, so a grey plate never drifts brown. */
export const PLATE_NEUTRAL_C = 0.01;
export const PLATE_NEUTRAL_H = 250;
/** Real car paint runs black to white. Used to spread the neutral band. */
export const PAINT_L_DOMAIN = [0.15, 0.98] as const;

const NEUTRAL_FAMILIES = new Set(["white", "silver", "grey", "black"]);

export type Plate = {
  /** The field colour for the light theme, as a hex the CSS can use directly. */
  field: string;
  /** The same field for the dark theme. Both are emitted, so no client work is needed. */
  fieldDark: string;
  /** The manufacturer's name for the paint, or null when there is nothing honest to print. */
  colourName: string | null;
  /** True when no usable colour was recorded and the plate is drawn as primer. */
  isPrimer: boolean;
  /** 0 to 1, how far round the arc sweeps. Real mileage, not decoration. */
  sweep: number;
  /** A stable 0 to 359 offset for the grain tile, so no two plates tile identically. */
  grain: number;
};

// ------------------------------------------------------------------ input cleaning

/**
 * Normalises whatever is in the database into a usable hex.
 *
 * Three-digit hexes and a missing leading hash both turn up in hand-entered data, and a
 * colour that fails to parse must not take the page down.
 */
export function normaliseSwatch(value: string | null | undefined): string {
  if (!value) return FALLBACK_SWATCH;

  const cleaned = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [r, g, b] = cleaned.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return FALLBACK_SWATCH;
}

/**
 * Mileage as a fraction of the arc.
 *
 * Linear to the ceiling and then clamped. A logarithmic scale would make a 30 000km car and
 * a 90 000km car look similar, and that difference is most of the buying decision.
 */
export function sweepFor(mileageKm: number | null | undefined): number {
  if (typeof mileageKm !== "number" || !Number.isFinite(mileageKm) || mileageKm <= 0) return 0;
  return Math.min(1, mileageKm / MILEAGE_CEILING_KM);
}

/**
 * A stable number from the listing reference.
 *
 * Deterministic on purpose: the same car must draw the same plate on every render, or the
 * grid flickers between server and client and looks broken. FNV-1a, because it is four
 * lines and needs no dependency.
 */
export function grainFor(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 360;
}

// ------------------------------------------------------------------ colour maths
//
// Bjorn Ottosson's OKLab matrices, plus a chroma-reduction gamut clip. About forty lines
// and no dependency, which is the whole reason this is server-side TypeScript emitting hex
// rather than an oklch() string handed to the browser.

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Hex to OKLCH. Lightness 0 to 1, chroma roughly 0 to 0.37, hue in degrees. */
export function srgbToOklch(hex: string): [number, number, number] {
  const h = normaliseSwatch(hex).slice(1);
  const n = Number.parseInt(h, 16);
  const r = srgbToLinear(((n >> 16) & 255) / 255);
  const g = srgbToLinear(((n >> 8) & 255) / 255);
  const b = srgbToLinear((n & 255) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.hypot(A, B);
  const hue = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [L, chroma, hue];
}

function oklchToLinear(L: number, C: number, H: number): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  const A = C * Math.cos(rad);
  const B = C * Math.sin(rad);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * OKLCH to hex, clipping into sRGB by reducing chroma rather than clamping channels.
 *
 * Clamping channels shifts the hue, which would break the one promise the plate makes: that
 * the colour on screen is the hue of the colour the dealership recorded.
 */
export function oklchToHex(L: number, C: number, H: number): string {
  let chroma = Math.max(0, C);
  let rgb = oklchToLinear(L, chroma, H);

  for (let i = 0; i < 200 && rgb.some((c) => c < -0.0001 || c > 1.0001); i += 1) {
    chroma = Math.max(0, chroma - 0.002);
    rgb = oklchToLinear(L, chroma, H);
    if (chroma === 0) break;
  }

  const hex = rgb
    .map((c) => {
      const v = Math.round(clamp01(linearToSrgb(clamp01(c))) * 255);
      return v.toString(16).padStart(2, "0");
    })
    .join("");
  return `#${hex.toUpperCase()}`;
}

// ------------------------------------------------------------------ the field

/**
 * The field colour for one vehicle in one theme.
 *
 * Two branches, and the split is the entire answer to the hardest problem in the dataset.
 * See the module comment: chromatic paints keep their hue and lose their lightness,
 * achromatic paints keep their ordering and lose their hue.
 */
export function plateField(
  swatchHex: string | null | undefined,
  family: string | null | undefined,
  theme: PlateTheme,
): string {
  const k = PLATE[theme];
  const [L, C, H] = srgbToOklch(normaliseSwatch(swatchHex));

  if (family && NEUTRAL_FAMILIES.has(family.toLowerCase())) {
    const [lo, hi] = PAINT_L_DOMAIN;
    const t = clamp01((L - lo) / (hi - lo));
    return oklchToHex(
      k.neutralMinL + t * (k.neutralMaxL - k.neutralMinL),
      PLATE_NEUTRAL_C,
      PLATE_NEUTRAL_H,
    );
  }

  return oklchToHex(k.chromaticL, Math.min(C, PLATE_CHROMA_MAX), H);
}

/**
 * The primer.
 *
 * A live dealership will type "Cosmic Bronze Metallic" or leave the colour blank on day
 * one, so this ships in the first commit rather than after the first real listing. Chroma
 * zero, so it reads as an unpainted panel, and the caption says so.
 */
export function primerField(theme: PlateTheme): string {
  return oklchToHex(PLATE[theme].chromaticL, 0, PLATE_NEUTRAL_H);
}

export function plateFor(vehicle: {
  publicRef?: string | null;
  mileageKm?: number | null;
  colourSwatch?: string | null;
  colourFamily?: string | null;
  colourName?: string | null;
}): Plate {
  /*
   * The FIELD needs a swatch. The LABEL only needs a name. They are separate questions and
   * conflating them threw away real information.
   *
   * `swatch` is optional on the colours taxonomy by design, so a dealership that adds
   * "Cosmic Bronze Metallic" without a hex has recorded a true fact about the car. The old
   * rule demanded both and fell back to primer with no label at all, so the plate said
   * "Colour not supplied" about a car whose colour had been supplied. Now the field is
   * primer, because there is no hue to draw, and the manufacturer's name is still printed,
   * because it is still true.
   */
  const name = vehicle.colourName?.trim() || null;
  const raw = normaliseSwatch(vehicle.colourSwatch);
  const isPrimer = !vehicle.colourSwatch || raw === FALLBACK_SWATCH;

  return {
    field: isPrimer ? primerField("light") : plateField(raw, vehicle.colourFamily, "light"),
    fieldDark: isPrimer ? primerField("dark") : plateField(raw, vehicle.colourFamily, "dark"),
    colourName: name,
    isPrimer,
    sweep: sweepFor(vehicle.mileageKm),
    grain: grainFor(vehicle.publicRef || raw),
  };
}

// ------------------------------------------------------------------ furniture

/**
 * The province registration code, which every South African reads instantly.
 *
 * These are the official codes, so this is a lookup rather than an abbreviation: Limpopo is
 * LP, not LIM, and a car in Polokwane when you live in Cape Town is a real 1 900km problem
 * that deserves graphic weight rather than a filter facet.
 */
const PROVINCE_CODES: Readonly<Record<string, string>> = {
  gauteng: "GP",
  "western cape": "WC",
  "kwazulu-natal": "KZN",
  "eastern cape": "EC",
  "free state": "FS",
  mpumalanga: "MP",
  limpopo: "LP",
  "north west": "NW",
  "northern cape": "NC",
};

export function provinceCodeFor(name: string | null | undefined): string | null {
  if (!name) return null;
  return PROVINCE_CODES[name.trim().toLowerCase()] ?? null;
}
