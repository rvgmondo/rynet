# RYNET SHOWROOM: STOCKLIST

The final direction. Everything below is buildable against the repo as it stands at `C:\CC\rynet`. Existing files that change are named. Every contrast figure was computed against the real hex values with the same maths as `src/lib/contrast.ts`, so the numbers below are what `scripts/contrast-report.ts` will print.

---

## 1. THE CONCEPT

Every car on Rynet is a colour plate. The image area of every listing is a field of that vehicle's own recorded paint colour, pushed to a single fixed tonal value so that 311 different paints produce 311 different hues at exactly one lightness, with the manufacturer's own name for that colour set 11px in the corner like a gallery label, the province registration code stamped opposite it, and the brand's tachometer arc drawn across it as a real mileage gauge. There are no boxes, no borders, no radii and no shadows anywhere in the product: the results page is one ruled sheet where the gutters between cards are 1px hairlines showing through the grid background, and the whole thing renders with zero image requests and about 10KB of inline SVG. The promise is a negative claim, no private sellers, and a negative claim is made by subtraction, so the page that has removed almost everything is the only page whose layout agrees with its copy.

**The unforgettable detail:** twenty-four vehicles as tonally locked fields of their own real paint, each captioned with the manufacturer's name for that colour, prices set two and a half times the model name, one red object in the entire viewport. Nobody in South Africa has that. The screenshot wins the argument with the client without a paragraph of explanation.

**Why the lightness is discarded and only the hue kept, which is the load-bearing idea:** contrast stops being 311 checks against dealer-entered hex and becomes four checks against fixed constants. The wall cannot go muddy, cannot go garish, and cannot fail the build, because the tonal value is not a variable.

---

## 2. THE COMPLETE TOKEN SET

Replaces the semantic layer of `src/styles/tokens.css`. The palette ramp block at the top of that file stays; the three brand values are unchanged. Every ratio below is real.

```css
/* ============================================================== LIGHT ===== */
:root {
  /* Grounds. Plaster, not white. Pure #FFFFFF is the largest single
     contributor to the current site reading cheap. */
  --rn-paper:            #EDEDEA;  /* page ground, and the card ground */
  --rn-paper-raised:     #F7F7F5;  /* inset panels. used ~4 times in the product */
  --rn-paper-sunken:     #E2E2DE;  /* filter rail, register band, table heads */

  /* Ink. Navy-cast near-black, so the brand survives in the darkest value. */
  --rn-ink:              #0A1017;  /* headlines, prices, 2px rules, inverse band  16.28 on paper */
  --rn-ink-body:         #232A33;  /* running body copy                           12.34 on paper */
  --rn-ink-muted:        #545E6A;  /* labels, spec values, dealer town, counts      5.62 on paper
                                      6.14 on raised, 5.07 on sunken */

  /* Ink for use ON the inverse band and on a hover-flipped card. */
  --rn-ink-inverse:       #EDEDEA; /* 16.28 on --rn-ink */
  --rn-ink-muted-inverse: #9BA3AD; /*  7.49 on --rn-ink */

  /* Rules. Three, because WCAG asks three different things of them. */
  --rn-hairline:         #C8C8C2;  /* decorative: grid gutters, row rules   1.43, no obligation */
  --rn-hairline-strong:  #A2A29A;  /* structural: section openers, mobile   2.19, no obligation */
  --rn-line-interactive: #69727E;  /* SOLE boundary of a control            4.15 paper / 3.75 sunken
                                      / 4.54 raised. Clears SC 1.4.11's 3:1 everywhere. */
  --rn-silver:           #B1B4BB;  /* BRAND silver. Decorative rules on the ink band ONLY.
                                      9.20 on --rn-ink. Never on paper, never body text,
                                      never an input border. */

  /* Red. Rationed to near zero. See the rule below the block. */
  --rn-red:              #E32432;  /* BRAND red. GRAPHIC MARKS ONLY, never behind text. */
  --rn-red-solid:        #CC2231;  /* the only red fill. white on it: 5.47 */
  --rn-red-text:         #B81B29;  /* inline links, price drops   5.55 paper / 5.01 sunken */
  --rn-red-text-inverse: #F4626B;  /* the same job on the ink band / flipped card  6.19 on ink */

  --rn-focus-ring:       #B81B29;  /* 2px, with a 2px --rn-paper offset. 5.55 */
  --rn-focus-offset:     #EDEDEA;

  /* The plate. These five numbers ARE the imagery system. */
  --rn-plate-ink:        #EDEDEA;  /* the only colour ever drawn on a plate, both themes */
  --rn-plate-ink-soft:   rgb(237 237 234 / 0.72); /* arc track. decorative */
  --rn-plate-edge:       rgb(10 16 23 / 0.16);    /* 1px inset frame. decorative */
  --rn-plate-l-chromatic:   0.40;  /* every non-neutral paint lands here */
  --rn-plate-l-neutral-min: 0.28;  /* Midnight Black */
  --rn-plate-l-neutral-max: 0.48;  /* Glacier White */

  /* Depth comes from rules and ground shifts. Nothing else. */
  --rn-shadow-1: none; --rn-shadow-2: none;
  --rn-shadow-3: none; --rn-shadow-4: none;
  --rn-radius-sm: 0; --rn-radius-md: 0; --rn-radius-lg: 0;
  --rn-radius-xl: 0; --rn-radius-full: 9999px; /* pills only, and there is one pill */

  color-scheme: light;
}

/* Under 768px, structure has to survive a cheap panel in direct sun. */
@media (max-width: 47.9375rem) {
  :root { --rn-hairline: #A2A29A; }
}

/* =============================================================== DARK ===== */
/* Not a different design. The same two values, swapped. A screenshot of either
   theme is obviously the same product. */
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* block below */ } }
:root[data-theme="dark"] {
  --rn-paper:            #080D14;  /* the light theme's ink, one step deeper */
  --rn-paper-raised:     #121821;
  --rn-paper-sunken:     #05080D;

  --rn-ink:              #F7F7F5;  /* 18.16 on paper */
  --rn-ink-body:         #E3E3DF;  /* 15.14 on paper, 13.85 on raised */
  --rn-ink-muted:        #99A0A9;  /*  7.38 on paper, 6.75 on raised, 7.60 on sunken */

  --rn-ink-inverse:       #080D14; /* 18.16 on --rn-ink (a flipped card is near-white) */
  --rn-ink-muted-inverse: #545E6A; /*  5.35 on --rn-ink */

  --rn-hairline:         #262D37;  /* 1.40, decorative */
  --rn-hairline-strong:  #3B434F;  /* 1.95, decorative */
  --rn-line-interactive: #7D8691;  /* 5.28 paper / 5.44 sunken / 4.83 raised */
  --rn-silver:           #B1B4BB;  /* 9.20 on the ink band, unchanged */

  --rn-red:              #E32432;  /* unchanged across themes. That is the point of a brand colour. */
  --rn-red-solid:        #CC2231;  /* white on it: 5.47. One button spec, two themes. */
  --rn-red-text:         #F4626B;  /* 6.31 paper / 6.50 sunken / 5.78 raised */
  --rn-red-text-inverse: #B81B29;  /* 6.07 on --rn-ink (the flipped, near-white card) */

  --rn-focus-ring:       #F4626B;  /* 6.31 */
  --rn-focus-offset:     #080D14;

  --rn-plate-ink:        #EDEDEA;
  --rn-plate-ink-soft:   rgb(237 237 234 / 0.72);
  --rn-plate-edge:       rgb(237 237 234 / 0.28); /* 3.42 minimum against the page. Load-bearing:
                                                     it is what stops a Midnight Black plate
                                                     melting into a near-black page. */
  --rn-plate-l-chromatic:   0.44;
  --rn-plate-l-neutral-min: 0.32;
  --rn-plate-l-neutral-max: 0.50;

  color-scheme: dark;
}
```

### The red rule, and write it into the stylesheet as prose

`tokens.css` already documents that brand red on white is 4.60:1 and on brand navy is 4.13:1 and fails. Pair the finding with the rule, or the next developer reaches for a red button fill and reopens a problem that was solved by rationing:

> **Red is a mark, never a surface behind text.** `--rn-red` #E32432 appears in exactly two places on any page: the terminus of the 2px masthead rule, and the RynetMark. It carries no text and no text sits on it, so it has no contrast obligation and it can never fail. Every red *fill* is `--rn-red-solid` #CC2231 with white on it at 5.47. Every red *word* is `--rn-red-text`. There is never more than one red object in a viewport.

### The plate contrast gate, which is four pairs and not 311

`--rn-plate-ink` #EDEDEA against every possible plate, computed:

| | light | dark |
|---|---|---|
| worst seeded swatch (Glacier White) | **5.65** | **5.17** |
| worst of all 360 hues at `l-chromatic` and max chroma | **7.47** (H 163) | **6.30** (H 159) |
| lightest possible neutral plate (`l-neutral-max`) | **5.58** | **5.10** |
| primer fallback, no swatch supplied | **7.80** | **6.66** |

The whole imagery system costs four rows in the report, and the worst case is 5.10:1 against a 4.5 floor. Compare: computing ink per swatch, which the current `inkFor()` does, requires re-verifying on every colour a dealer ever enters.

### CI

Extend `scripts/contrast-report.ts` **in the same commit that adds the tokens**, never afterwards. Add: the four plate rows as a generated sweep rather than four literals (loop 0 to 359 at `l-chromatic`, plus both neutral band ends, and assert the minimum); the two `*-inverse` tokens against `--rn-ink`; and register `--rn-red` as `kind: 'decorative'`, which the script already supports. That is a data change, not a code change. If anyone later needs red as text it must be registered `kind: 'large-text'` with the size class documented, or CI reads a legal pair as a failure and someone "fixes" it by weakening the token.

---

## 3. TYPOGRAPHY

Two families. Both variable, both self-hosted by `next/font`, latin subset only, roughly 90KB total, which is the price of not having a hero image.

```ts
// src/app/(marketplace)/layout.tsx  (replaces Montserrat + Inter on marketplace routes)
import { Archivo, Newsreader } from "next/font/google";

/**
 * Archivo is a variable grotesque with a real WIDTH axis (wdth 62-125) alongside
 * wght 100-900, and that axis is the whole typographic idea. At wdth 118 / wght 800
 * a headline fills a 12-column measure edge to edge with no manual tracking hack.
 * The same file at wdth 100 / wght 700 sets an 11px uppercase label at 0.16em
 * without turning to mush. One family, two completely different registers.
 * It also ships genuine tnum, which every price on the platform depends on.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
  preload: true,
});

/**
 * Newsreader does ONE job: running prose. The verification explanation, dealership
 * descriptions, editorial. Never in a card, never in the search UI, never in a
 * button. This is the load-bearing decision of the whole system, because a heavy
 * expanded grotesk on its own is what makes brutalism read as a student project.
 * Students do not set body copy in an optically sized serif. It is the adult in
 * the room, and it is what makes the enormous grotesk read as restraint.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
});
```

```css
--rn-font-display: var(--font-archivo), "Archivo", system-ui, sans-serif;
--rn-font-body:    var(--font-archivo), "Archivo", system-ui, sans-serif;
--rn-font-prose:   var(--font-newsreader), "Newsreader", Georgia, serif;
```

Weights used, and no others: **400** UI and body, **500** card titles and dealer names, **700** every label-caps string, **800** display and prices. Newsreader **400** and **400 italic** only.

### The scale

```css
--rn-text-label:   clamp(0.6875rem, 0.665rem + 0.11vw, 0.75rem);   /* 11 -> 12 */
--rn-text-xs:      clamp(0.8125rem, 0.79rem  + 0.11vw, 0.875rem);  /* 13 -> 14 */
--rn-text-sm:      clamp(0.9375rem, 0.915rem + 0.11vw, 1rem);      /* 15 -> 16 */
--rn-text-base:    clamp(1rem,      0.955rem + 0.22vw, 1.125rem);  /* 16 -> 18 */
--rn-text-lead:    clamp(1.1875rem, 1.06rem  + 0.63vw, 1.5rem);    /* 19 -> 24 */
--rn-text-price:   clamp(1.75rem,   1.32rem  + 2.15vw, 2.5rem);    /* 28 -> 40 */
--rn-text-head:    clamp(2rem,      1.45rem  + 2.75vw, 3.5rem);    /* 32 -> 56 */
--rn-text-display: clamp(2.75rem,   1.35rem  + 7vw,    7.5rem);    /* 44 -> 120 */
--rn-text-mega:    clamp(3.5rem,    1.2rem   + 11.5vw, 11rem);     /* 56 -> 176 */

--rn-leading-display: 0.88;   /* display and mega only */
--rn-leading-tight:   1.04;
--rn-leading-snug:    1.24;
--rn-leading-body:    1.6;
--rn-leading-prose:   1.65;   /* Newsreader */

--rn-tracking-display: -0.03em;
--rn-tracking-tight:   -0.02em;
--rn-tracking-price:   -0.015em;
--rn-tracking-label:    0.16em;

--rn-measure: 64ch;           /* prose only. NEVER applied to the results grid. */
```

Roles as variation settings, not weight names:

| role | settings | step |
|---|---|---|
| hero / display | `wdth` responsive, `wght` 800, uppercase | `--rn-text-display` |
| section head | `wdth` 112, `wght` 800 | `--rn-text-head` |
| card price | `wdth` 118, `wght` 800, tnum | `--rn-text-price` |
| card title | `wdth` 100, `wght` 500 | `--rn-text-sm` |
| label caps | `wdth` 100, `wght` 700, uppercase, `--rn-tracking-label` | `--rn-text-label` |
| UI and body | `wdth` 100, `wght` 400 | `--rn-text-base` |
| prose | Newsreader, `opsz` matched to px size | `--rn-text-base` |

The display width axis is responsive, and this is how the hero is guaranteed never to overflow at 320px:

```css
.rn-display { font-variation-settings: "wdth" 88; }                 /* < 480px  */
@media (min-width: 30rem) { .rn-display { font-variation-settings: "wdth" 105; } }
@media (min-width: 56.25rem) { .rn-display { font-variation-settings: "wdth" 118; } }
```

### Numerals, and how tabular figures are enabled

**Archivo renders every numeral on the site.** Prices, previous prices, mileage, model year, engine capacity, power, torque, monthly estimates, facet counts, result counts, the mega counter. Nothing else is allowed to render a number, and there is no separate mono family, which keeps the kit to two files.

South African price format groups thousands with a space, `R 249 900`. With proportional figures that space plus the digit widths jitter card to card, so a column of 24 prices never aligns and the grid reads sloppy at exactly the moment it is meant to read expensive. `globals.css` already has the base rule, and it stays exactly as it is:

```css
.tabular, td.numeric, th.numeric, [data-numeric] {
  font-variant-numeric: tabular-nums slashed-zero;
}
```

The Rand mark is a typographic move, not a string. `R` is wrapped in a span at `0.58em`, `wght` 400, in `--rn-ink-muted`, with `letter-spacing: -0.02em` on the following space, so the numerals dominate and the R sits back like a unit. That single detail is most of the distance between a price that looks like a sticker and a price that looks like a figure.

**The build gate, and do not skip it.** Font subsetting pipelines strip OpenType features silently, and a lost `tnum` degrades every listing page for a month before anyone can name why the grid looks sloppy. Add `src/lib/typography.spec.ts` as a Playwright test beside the existing e2e suite:

```ts
test("tabular figures survive the font subset", async ({ page }) => {
  await page.goto("/cars");
  const widths = await page.evaluate(() => {
    const probe = (t: string) => {
      const el = document.createElement("span");
      el.className = "tabular";
      el.style.cssText = "font:800 40px/1 var(--rn-font-display);"
        + "font-variation-settings:'wdth' 118;position:absolute;visibility:hidden";
      el.textContent = t;
      document.body.append(el);
      const w = el.getBoundingClientRect().width;
      el.remove();
      return w;
    };
    return [probe("111"), probe("000")];
  });
  expect(Math.abs(widths[0] - widths[1])).toBeLessThan(0.5);
});
```

Same principle as the contrast gate: fail the build, not the design review.

### The 320px no-horizontal-scroll guard

`R 1 249 900` is eleven glyphs, and 40px expanded Archivo needs roughly 300px for that. So a large number is never sized by viewport alone. Its wrapper takes `container-type: inline-size` and the element is sized by container width, with the plain clamp declared first as the fallback for any engine without container queries:

```css
.rn-figure { font-size: var(--rn-text-price); }
@supports (width: 1cqw) {
  .rn-figure { font-size: min(var(--rn-text-price), calc(100cqw / var(--fig-chars) * 1.85)); }
}
```

`--fig-chars` is set inline by the server component from the formatted string's length. The `1.85` is calibrated for the Rand format specifically, where the three thin spaces pull the per-character average below a digit advance. Re-check it if `formatRand` ever changes. The same pattern sizes the hero headline, where `--fig-chars` is the longest hand-broken line and the factor is `1.62` at `wdth` 88.

Sub-1 line-height clips caps in Safari and older Chrome. Every element at `--rn-leading-display` carries `padding-block: 0.08em`.

---

## 4. THE VEHICLE CARD

### The technique

The image area is a fixed **16:10** block built from four layers and one 400-byte inline SVG. No raster assets, no network requests, no canvas, no client JS at render, no runtime colour maths in the browser. Server rendered, cacheable, sharp at any DPR, works with JS off.

16:10 and not 4:3 because `src/components/vehicles/vehicle-gallery.tsx:22` already reserves `aspect-[16/10]`. Matching it means zero CLS and zero row-height change on the day the first dealership uploads.

**The discipline rule, and put it in the component's comment verbatim:** *every mark on the plate is a value from the vehicle record, or it does not ship.* This plate is the most abstract object in the product and therefore the most likely to accumulate decorative flourishes. The moment someone adds a mark that is not a reading, it stops being a colour index and becomes a novelty, and a novelty is cheaper than the plain site it replaced.

### The data it derives from

All of it already exists in this repo. `toCard` in `src/lib/search.ts:60` already carries every field:

| field | source | what it draws |
|---|---|---|
| `colourSwatch` | `colours.swatch`, 16 real hexes in `src/seed/data/taxonomies.ts:156` | the field hue |
| `colourFamily` | `colours.family`, a 14-value select | chromatic or neutral branch **(add to `toCard`)** |
| `colourName` | `colours.title` | the gallery label, and the source of truth for the colour |
| `mileageKm` | `vehicles.mileageKm` | the arc sweep and the label's second line |
| `provinceName` | `branch.province` | the two-letter stamp |
| `cityName` | `branch.city` | the line under the stamp |
| `publicRef` | `vehicles.publicRef` | the FNV-1a grain offset, so no two plates tile identically |
| `condition` | `vehicles.condition` | the top-left mark, only when it is not `pre_owned` |

### Layer 0, the ground

A pure function in `src/lib/vehicle-plate.ts`, extending the module that already exists and is already unit-tested. Keep `normaliseSwatch`, `sweepFor`, `grainFor` and `MILEAGE_CEILING_KM` exactly as they are. Replace `inkFor` with the fixed rule, which is a simplification and makes the existing tests simpler.

**The hex is computed on the server and emitted as a plain hex custom property.** Do not emit `oklch()` into CSS. That removes every browser colour-function dependency, removes all client colour maths, works on the Safari 16 slice of South African mobile traffic, and lets the contrast test assert on real hexes.

```ts
// src/lib/vehicle-plate.ts  (additions)

/** These five numbers ARE the imagery system. They mirror the CSS tokens. */
export const PLATE = {
  light: { chromaticL: 0.40, neutralMinL: 0.28, neutralMaxL: 0.48 },
  dark:  { chromaticL: 0.44, neutralMinL: 0.32, neutralMaxL: 0.50 },
} as const;

export const PLATE_CHROMA_MAX   = 0.085; // above this the wall reads as podcast-cover UI
export const PLATE_NEUTRAL_C    = 0.010;
export const PLATE_NEUTRAL_H    = 250;   // a cool neutral, so grey never goes brown
export const PAINT_L_DOMAIN     = [0.15, 0.98] as const; // real car paint, black to white
export const PLATE_INK          = "#EDEDEA";
const NEUTRAL_FAMILIES = new Set(["white", "silver", "grey", "black"]);

/**
 * The field colour for one vehicle in one theme.
 *
 * Two branches, and the split is the entire answer to the hardest problem in the
 * dataset. Roughly 40% of South African stock is white, silver or grey, and eight
 * of the sixteen seeded swatches are achromatic.
 *
 * CHROMATIC paints: the lightness is DISCARDED and replaced with one theme
 * constant, the chroma is clamped, and the HUE IS KEPT UNTOUCHED. That is the
 * honest datum. 311 vehicles then produce 311 hues at exactly one value, so the
 * wall is tonally perfect by construction and cannot fail contrast.
 *
 * ACHROMATIC paints have no usable hue, so hue is discarded instead and the
 * lightness is remapped into a narrow ORDERED band. Glacier White is the lightest
 * plate on the site, Midnight Black the darkest, silvers and greys stepped in
 * between. Contrast is still solved by construction, because the band is bounded
 * and only its lightest end has to be checked.
 */
export function plateField(
  swatchHex: string,
  family: string | null,
  theme: "light" | "dark",
): string {
  const k = PLATE[theme];
  const [L, C, H] = srgbToOklch(normaliseSwatch(swatchHex));

  if (family && NEUTRAL_FAMILIES.has(family)) {
    const t = clamp01((L - PAINT_L_DOMAIN[0]) / (PAINT_L_DOMAIN[1] - PAINT_L_DOMAIN[0]));
    return oklchToHex(k.neutralMinL + t * (k.neutralMaxL - k.neutralMinL),
                      PLATE_NEUTRAL_C, PLATE_NEUTRAL_H);
  }
  return oklchToHex(k.chromaticL, Math.min(C, PLATE_CHROMA_MAX), H);
}

/**
 * The primer. A live dealer WILL type "Cosmic Bronze Metallic" or leave it blank
 * on day one, and this ships in the first commit rather than after the first real
 * listing. Chroma zero, so it reads as an unpainted panel, and the caption says so.
 */
export function primerField(theme: "light" | "dark"): string {
  return oklchToHex(PLATE[theme].chromaticL, 0, PLATE_NEUTRAL_H);
}

/** OKLCH -> sRGB with a simple chroma-reduction gamut clip. ~30 lines, no dependency. */
function oklchToHex(L: number, C: number, H: number): string { /* see below */ }
function srgbToOklch(hex: string): [number, number, number] { /* see below */ }
```

The two conversion helpers are the standard Björn Ottosson OKLab matrices plus a loop that reduces chroma by 0.002 until all three linear channels land in `[0, 1]`. About 40 lines total, no dependency, fully deterministic, and the whole thing is unit-testable.

What that produces from the real taxonomy, light theme:

```
Glacier White   #F4F5F7 -> #595D62      Deep Sea Blue   #1F3A5F -> #2D486F
Pearl White     #F0F0EC -> #585C61      Aegean Blue     #2C5C8A -> #1E4A73
Silver          #C4C7CC -> #4F5459      Chilli Red      #B4232C -> #6E3331
Platinum Silver #B6BABF -> #4D5156      Racing Green    #1E3B2A -> #324F3D
Graphite Grey   #5A5E63 -> #393D42      Sandstone Beige #C9BBA3 -> #524631
Titanium Grey   #7A7E84 -> #404549      Bronze          #6E4B32 -> #613F26
Midnight Black  #141518 -> #282C30      Solar Orange    #D2622A -> #6D371E
Panther Black   #1B1C1F -> #2A2E32      no swatch       (primer) -> #484848
```

Eight distinguishable neutrals in the correct order, eight saturated hues at one value. That is a wall, not a repeated tile.

### Layer 1, the arc

One inline SVG, about 400 bytes, the brand tachometer finally used at a size that deserves it. A shallow 106-degree sweep entering at the left edge of the plate and leaving at the right edge, apex 50 units above its ends. `pathLength="100"` is set once, so every dash calculation is a percentage and the identical component renders at 260px on a card and at 400px on the detail page with no `2 * pi * r` arithmetic anywhere.

```tsx
<svg className="rn-plate__gauge" viewBox="0 0 200 125" aria-hidden="true" focusable="false">
  {/* track */}
  <path d="M 0 96 A 125 125 0 0 1 200 96" pathLength={100}
        className="rn-plate__track" />
  {/* value: the real odometer against a 250 000 km ceiling */}
  <path d="M 0 96 A 125 125 0 0 1 200 96" pathLength={100}
        className="rn-plate__value"
        style={{ "--sweep": plate.sweep * 100 } as CSSProperties} />
  {/* redline: 200 000 km to the stop. WEIGHT, never colour. */}
  {plate.sweep > 0.8 && (
    <>
      <path d="M 0 96 A 125 125 0 0 1 200 96" pathLength={100}
            className="rn-plate__redline" />
      <line x1="162.3" y1="70.8" x2="169.7" y2="58.9" className="rn-plate__tick" />
    </>
  )}
</svg>
```

```css
.rn-plate__track, .rn-plate__value, .rn-plate__redline {
  fill: none; stroke-linecap: butt;
}
.rn-plate__track   { stroke: var(--rn-plate-ink); opacity: .22; stroke-width: 2; }
.rn-plate__value   { stroke: var(--rn-plate-ink); stroke-width: 2;
                     stroke-dasharray: var(--sweep) 100; }
.rn-plate__redline { stroke: var(--rn-plate-ink); stroke-width: 6;
                     stroke-dasharray: 20 100; stroke-dashoffset: -80; }
.rn-plate__tick    { stroke: var(--rn-plate-ink); stroke-width: 2; }
```

Redline as stroke weight rather than colour does three things at once: it keeps status off colour-alone per SC 1.4.1, it keeps red off the plates entirely, and it deletes a contrast pair that would have failed at 2.86:1.

### Layer 2, the grain

One `feTurbulence` tile inlined once as a ~330-byte data URI, applied via `::after`, shared by all 311 plates and decoded by the browser exactly once. **This layer is not cosmetics.** It is the entire difference between a coloured div and printed ink. Ship it in the same PR as the plates or not at all.

```css
.rn-plate::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  background-position: calc(var(--plate-grain) * 1px) calc(var(--plate-grain) * 0.7px);
  opacity: .05; mix-blend-mode: overlay;
}
```

`--plate-grain` is the existing `grainFor(publicRef)`, 0 to 359, so no two plates tile identically. Check it on a 1x panel; if it reads as screen dirt rather than as ink, drop to `.035`. Do not raise it.

### Layer 3, the furniture

All plate text lives in one bottom band, from day one, so that on photo day there is exactly one scrim and exactly one contrast pair to verify. All of it in label caps, all of it in `--rn-plate-ink`, minimum 5.10:1 against any possible field.

- **Bottom left:** the province registration code, `GP` `WC` `KZN` `EC` `FS` `MP` `LP` `NW` `NC`, at `--rn-text-label` / `wght` 700 / `0.16em`. The codes come from the `aliases` array already seeded in `src/seed/data/taxonomies.ts:10`, so `LP` for Limpopo, not `LIM`. Under it, the city name at the same size in `wght` 400. Every South African reads a province code instantly, it is entirely honest because the car genuinely is in that province, and buying in Polokwane when you live in Cape Town is a real 1 900km problem that deserves graphic weight rather than a filter facet.
- **Bottom right, right-aligned:** the manufacturer's colour name, then the mileage tabular below it. The colour name is always printed, because the plate is a claim about the car's colour and the name is the source of truth.
- **Top left, and only when `condition !== "pre_owned"`:** `NEW` or `DEMO`. Pre-owned is the default and does not need saying, which removes furniture from most cards.
- **The 1px inset frame:** `box-shadow: inset 0 0 0 1px var(--rn-plate-edge)`. Decorative, and in dark theme it is what stops a Midnight Black plate melting into a near-black page.

### Composition, top to bottom

No border. No radius. No shadow. The card is not a box, it is a column on a ruled sheet.

1. **THE PLATE**, 16:10, full card width, edge to edge, no inset.
2. **THE PRICE**, `--space-4` clear. Archivo `wdth` 118 / `wght` 800 at `--rn-text-price` (28 to 40px), `--rn-ink`, tabular, `--rn-tracking-price`, R at `0.58em` muted. On a drop, `- R 20 000` sets beneath it in `--rn-red-text` at label size. The word "off" goes; the minus and the amount say it.
3. **THE TITLE**, `<h3>`, Archivo `wght` 500 at `--rn-text-sm` (15 to 16px). Price to title is **2.4 to 1**, not the 4.5 to 1 the direction originally proposed. A buyer hunting a bakkie under R400k has to read `Hilux 2.8 GD-6 Legend RS 4x4 AT` before they care about the number, and 12px letterspaced uppercase is the slowest text on a page to read.
4. **THE SPEC GRID.** Kept, at `--rn-text-xs` in `--rn-ink-muted`. Mileage always the first cell, then body, transmission, fuel. A card with no mileage and no transmission is prettier and worse.
5. **A 1px `--rn-hairline` rule**, then **THE FOOT**: the verification mark, the dealer name, the town. Verification is three named facts, not a green tick: `VERIFIED` in label caps inside a 1px `--rn-hairline-strong` ruled box, followed on the dealer page by `CIPC / ADDRESS / MTN` in full. A `BadgeCheck` glyph is what every template ships and it persuades nobody. Three named facts is evidence, and evidence is the entire product.
6. **The Demonstration marker** stays, because it must, but as a 2px `--rn-hairline-strong` underline under the dealer name plus the existing `title` text. Not a pill.

**Every lucide glyph comes out of the card.** `Gauge`, `MapPin`, `BadgeCheck`, `TrendingDown` are all deleted.

**Keep these four decisions from `vehicle-card.tsx` exactly as they are.** Four of five directions independently said so, and the existing comments explain why each exists. Do not let a redesign quietly undo them.
- The title is the link, the card is not. `after:absolute inset-0` extends the hit area.
- `line-clamp-2` with a matching `min-h`, so rows never go ragged.
- The 2x2 spec grid rather than a wrapping flex row.
- `min-w-0` on the dealer name, which is load-bearing at 320px.

### The grid, and the single biggest visual fix

```css
.rn-grid {
  display: grid; gap: 1px;
  background: var(--rn-hairline);
  border: 1px solid var(--rn-hairline);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
}
.rn-grid > * { background: var(--rn-paper); container-type: inline-size; }
```

The gutters between cards are hairlines showing through the container, so the results page is one continuous ruled sheet rather than 24 floating rectangles. That deletes 24 per-card borders in one line and it is the most direct possible answer to "white rectangles with thin grey borders".

Subpixel rounding is the real risk here: one bad breakpoint and the sheet looks broken rather than deliberate. Add a visual regression at 320, 375, 768, 1024, 1440 and 1920, and at 200% zoom.

### Hover and focus: the ink flip

Card ground goes to `--rn-ink`, all type to `--rn-ink-inverse`, muted to `--rn-ink-muted-inverse`, accents to `--rn-red-text-inverse`. 120ms, colour only, no lift, no scale, no shadow. The plate is untouched and now sits in a black card, which makes the colour field jump forward. Paper on ink is 16.28:1, so the hover state is more legible than the rest state.

```css
@media (hover: hover) and (pointer: fine) {
  .rn-card:where(:hover, :focus-within) {
    background: var(--rn-ink);
    color: var(--rn-ink-inverse);
    --card-muted:  var(--rn-ink-muted-inverse);
    --card-accent: var(--rn-red-text-inverse);
  }
}
.rn-card:focus-within { /* same, unconditionally, so keyboard gets it on touch devices too */ }
```

`:focus-visible` produces the identical state plus the existing 2px ring. The card is well past 280px tall, comfortably past the 44px target minimum.

### Then how a real photo replaces it

The plate is not a placeholder that gets deleted. It is the permanent substrate the photograph sits on. One conditional inside one component: `vehicle.gallery?.length ? <Image/> : <Arc/>`.

1. A `next/image` with `fill` and `object-fit: cover` mounts as a new top layer in the same 16:10 box, alt text from the existing `vehicleAlt()` helper, which already takes a colour and already produces `2019 Toyota Hilux in Ultra Blue, photo 1 of 12`.
2. **The field stays underneath and becomes the LQIP and the letterbox fill.** Instead of a grey blur or a shimmer, the loading state is a deep field of that car's own declared paint, instantly, already the right hue. Twelve dealerships will upload twelve different aspect ratios, and a portrait phone snap of a bakkie sitting in a band of its own colour is dramatically better than grey bars. Write this into the component now, not later. It is what stops the onboarding months looking broken.
3. **The furniture keeps its position** and gains one fixed scrim: `linear-gradient(0deg, rgb(10 16 23 / 0.78) 0%, transparent 42%)` across the bottom band, plus a small matching wash top-left when a condition mark is present. The pair the checker verifies is `--rn-plate-ink` against the scrim, one pair, not label against an arbitrary photograph. Do not let anyone add a second element over the plate later.
4. **The arc unrolls rather than dying.** When a gallery exists, the same component renders `variant="strip"`: a 20px calibration strip pinned directly under the photograph, same 0 to 250 000 scale, same `pathLength="100"`, same redline from 80 to 100, needle now a vertical index. It is literally the same arithmetic on a `<line pathLength="100">` instead of a `<path pathLength="100">`. So the comparative mileage read survives on exactly the cards that still need to be scannable against each other, photographed and unphotographed cards sit in the same grid at the same height, and nothing is redesigned. The gauge just changes coordinate system.
5. **Ship the crop guidance with the uploader in the same commit:** three-quarter front, 16:10, light from the upper left. A site whose plates agree on a frame and whose photos arrive in twelve ratios has no art direction.

---

## 5. THE HOME PAGE

Everything is server rendered from live queries. `src/lib/home-data.ts` already exists and is already unused by `page.tsx`; wire it up. No fabricated content anywhere: no invented review scores, no logo wall, no testimonials, no stock photography.

**1. THE DATELINE.** A full-width strip directly under the header, above the rule. Label caps, `--rn-ink-muted`, items separated by 1px vertical hairline pseudo-elements rather than punctuation characters:

`RYNET SHOWROOM | THE REGISTER OF VERIFIED DEALER STOCK | TUESDAY 9 SEPTEMBER 2026 | 311 CARS | 12 DEALERSHIPS | 6 PROVINCES`

Every figure is a live count. The date is what makes the site read as issued today rather than built once, and the whole thing costs one flex row.

**2. THE RULE.** 2px, full container width, `linear-gradient(90deg, #B1B4BB 0%, #C2C4CA 44%, #E9505B 78%, #E32432 100%)`. The tachometer sweep unrolled to 1440px. It is the brand mark at architectural scale and it is one of only two places `--rn-red` appears. Purely decorative, no contrast obligation.

**3. THE HERO.** Ground `--rn-paper`, a 12-column grid with visible 1px `--rn-hairline` column rules running the full section height, drawn as a `repeating-linear-gradient` on the section background so it costs nothing. The exposed grid is the single thing that stops this reading as student brutalism: the structure is on purpose.

- One line of label caps in `--rn-ink`: `VERIFIED DEALERSHIPS ONLY / 311 CARS / 12 DEALERSHIPS / 6 PROVINCES`. A colophon, not a badge. No pill, no icon.
- `--space-16`. Then the headline, spanning all 12 columns, Archivo `wght` 800 at `--rn-text-display` (44 to 120px), leading 0.88, tracking -0.03em, hand-broken with explicit `<br>`:

  > NO PRIVATE
  > SELLERS.
  > NOT ONE.

  It fills the entire width by construction, which is the direct answer to the empty right half. The current hero hedges the same claim across sixty words.
- `--space-12`. **The search, which is a ruled line and not a box.** A flex row spanning columns 1 to 9 on desktop, all 12 on mobile. The input is 88px tall, transparent, `border: 0`, `border-bottom: 2px solid var(--rn-line-interactive)`, no radius, no inline padding, Archivo `wght` 500 at `--rn-text-lead`, placeholder in `--rn-ink-muted` reading `Make, model, or "bakkie under 300"`. The submit is a hard 88 by 88 square, `--rn-red-solid`, no radius, a 28px white chevron at 5.47:1. It is the only filled red object above the fold and therefore the only place the eye goes after the headline. Focus draws the standard 2px ring at 2px offset. The search box already understands `bakkie`; the aliases are seeded.
- **Eight real filter chips**, one wrapping row, each a server-rendered indexable `href` into `/cars`: Bakkie, SUV, Hatchback, Sedan, Under R150k, Under R300k, Automatic, Diesel. 36px tall pills, 44px tap target via padding, transparent fill, 1px `--rn-line-interactive`, label caps in `--rn-ink-muted`. That is a buyer's entire journey in one tap, it fabricates nothing, and it is eight free indexable landing paths.
- One label-caps text link: `OR BROWSE ALL 311 ENTRIES`. That is the whole of the copy in this hero. The current 60-word paragraph is deleted.

**4. FRESH ON THE FLOOR.** Eight live vehicles from `getHomeData()` as real cards in the real gutter grid, full container width, four-up at 1280px. Below 1280px it becomes a `scroll-snap-type: x mandatory` rail that starts at the container's left edge and runs past the right edge of the viewport with the last card half-cut. Content continuing past the frame is the confident gesture and it tells a thumb to swipe without a word of copy. Page-level horizontal scroll stays at zero, because the rail is its own `overflow-x: auto` container. This is the direct answer to "a brochure for a marketplace that shows nothing to buy": the home page now shows real stock, as colour, with not one photograph and not one invented listing.

**5. THE NUMBERS.** A band with the redline above it. Three figures in Archivo `wdth` 118 / `wght` 800 at `--rn-text-mega`, ranged left across three columns divided by full-height hairlines: `311`, `12`, `6`. Under each, a label-caps line: `CARS ON THE REGISTER`, `VERIFIED DEALERSHIPS`, `PROVINCES`.

**The counter floor rule, and it is not optional.** 311 at 176px is impressive; 40 at 176px after a data purge is an embarrassment rendered at poster scale. Below 150 the section drops the vehicle count and renders the dealership and province counts only. And flag this hard for the client: every seeded listing carries `isDemonstration`, so the current 311 is demo stock. The mega counter reads `status: live AND isDemonstration: false`. The template must never render a number at poster scale that it would be better not to shout.

**6. BROWSE BY COLOUR.** The Albers wall as navigation. The sixteen colours rendered as tall plates through the exact same `plateField()` engine, each labelled with its real name and a live count, each a real filter link into `/cars?colour=`. Generated from data, honest, and it is the single screenshot that sells this direction to the client in one look. On mobile it is a scroll-snapped rail inside its own overflow container, never a squeezed sixteen-column grid.

**7. BROWSE BY BODY TYPE, AND BY PROVINCE.** Two plain typographic lists with live counts from `getHomeData()`, right-aligned tabular figures, 1px rules between rows, no icons, no cards. Rows use the same ink flip on hover.

**8. WHAT VERIFIED MEANS.** Full-bleed `--rn-ink` band, `--rn-ink-inverse` type at 16.28:1, hairlines in `--rn-silver` at 9.20:1. Three editorial columns separated by full-height hairlines, each opening with a Newsreader drop cap set three lines deep, running text in Newsreader on a 42ch measure. **The three icon-and-paragraph cards are deleted, not restyled.** They are the most template-like object on the current site and every one of the five directions independently identified them.

**9. SELL TO A DEALER.** One band, the second red object on the page and the last: an ink block with paper type, not a red button, with the 2px redline directly beneath it.

**10. FOOTER**, continuous with section 8 on the same ink band, separated by one hairline. Column rules, label-caps heads, no logo wall, no testimonials, no invented anything, and the studio name rather than a personal byline.

---

## 6. THE SEARCH PAGE

### Layout

A two-column page at `>= 900px`: a 280px filter rail on `--rn-paper-sunken` in column one, the results in columns two onward, with a full-height 1px `--rn-hairline-strong` column rule between them. The results run the **full width to `--container-max`**. If they end up centred at 65ch, the whole direction reads as a blog. `--rn-measure` is applied to prose and to nothing else.

Above the results: the results header, carrying the live count in tabular figures, the sort control, the view toggle, and **the honesty caption stated once**, in label caps, `--rn-ink-muted`:

> `COLOUR FIELDS ARE DRAWN FROM EACH DEALERSHIP'S OWN RECORD. THEY ARE NOT PHOTOGRAPHS.`

Once on the results header and once under the plate on the detail page. Never per card, where it would be noise. Saying it out loud is more confident than hoping nobody asks, and it turns the site's biggest weakness into its most self-assured line.

### Filter rail

No boxes, no radii, no fills, no shadows. Facet groups separated by 1px `--rn-hairline` rules with a label-caps group heading. Each row is 44px minimum: a 20px square control with a 2px `--rn-line-interactive` boundary at 3.75:1 on the sunken ground, filling solid `--rn-ink` with a paper tick on check; the facet label at `--rn-text-sm`; the count right-aligned, tabular, `--rn-ink-muted` at 5.07:1. Price inputs are ruled lines, not boxes, exactly like the hero search: transparent, `border-bottom: 2px solid var(--rn-line-interactive)`, values in tabular Archivo so a price you type looks like the prices you are about to scan. Active filters appear above the rail as removable chips, each a real link that drops that one parameter.

Filter state stays entirely in the URL, which the existing page already does correctly.

### Grid

The gutter grid from section 4. One column at 320px, two at 480px, two beside the rail at 900px, three at 1280px, four at 1600px.

**The sparse-results rule.** Bakkie plus diesel plus automatic plus Gauteng plus under R400 000 is a query a real buyer runs on their first visit. On a design with no boxes, no icons and no photographs, three results is close to a blank page. Below four results the grid drops to two-up at double plate height, and the accompanying copy sets at `--rn-text-price` rather than body size, so scarcity reads as editorial rather than as an error. The existing empty state in `results-grid.tsx` is already written correctly; set its heading at `--rn-text-head` and keep the copy.

### The register view

A second view, and this is the biggest single usability win available for one component. Full-width ruled rows, no boxes, prices right-aligned in a tabular column so all 24 form one vertical rule of figures you can scan in a single eye movement. Fifteen entries per screenful against three for a card grid. It is the only thing in this document that beats a card grid at the actual job of hunting for a car, and no South African competitor offers it.

Desktop row, 88px, on a 12-column grid, 1px `--rn-hairline` under every row, `--rn-hairline-strong` above the first and below the last:

| cols | content |
|---|---|
| 1 | the plate at 88 by 55, the same component at `variant="thumb"` |
| 2 | `REF 04812` in label caps muted, model year under it |
| 3 to 7 | title, Archivo `wght` 500 at `--rn-text-base`, the link with `after:inset-0` across the row. Under it the spec run in label caps muted, separated by 1px vertical hairline pseudo-elements |
| 8 to 10 | the `VERIFIED` ruled box, dealer name, town and province code under it |
| 11 to 12 | price, tabular, right-aligned, `--rn-text-lead`. Under it the monthly estimate, or the drop |

Row hover and focus is the same 120ms ink flip, no lift.

### What changes on mobile

- **The register is the default view under 768px**, the card grid above it. A persisted cookie plus a `?view=` parameter, both read on the server so there is no flash. On a 320px phone a 16:10 plate plus a 40px price is roughly two cards per screenful; the mobile row fits fifteen.
- **The mobile row is two lines, 76px, and it never grows a third.** Line one: a 56px square plate at left, the title, the price hard right in tabular. Line two: mileage, town, dealer, in label caps muted. If a third line creeps in or the spec run is allowed to wrap, density turns into noise and the site reads cheap in the other direction. 76px is comfortably past the 44px minimum and the whole row is the target.
- `--rn-hairline` substitutes `--rn-hairline-strong` under 768px, so structure survives a cheap panel in direct sun.
- The filter rail becomes a full-height sheet behind a sticky bottom bar, 56px, `--rn-paper` with a top hairline, two 44px targets: `FILTERS (3)` and `SORT`. Solid, never a backdrop blur, because a sticky bar by definition has the grid scrolling under it and blur there is a full-viewport readback per frame on a Snapdragon 4-series.
- The header collapses to the mark, a search glyph and a menu, all 44px.

---

## 7. MOTION

Four movements in the entire product, and the count is the point. Everything animates opacity, transform or colour. Nothing animates layout, height, width or filter. Nothing parallaxes, nothing is scroll-linked, nothing autoplays, there is no marquee, and scroll-reveal is deleted from the system entirely: staggered fade-ups are the loudest tell of a template site.

**1. RULE DRAW.** Every 2px structural rule enters with `transform: scaleX(0)` to `1`, `transform-origin: left`, `var(--duration-page)` 480ms, `var(--rn-ease-out)`. IntersectionObserver, fires once, `unobserve` immediately. Sections announce themselves by being ruled off, like a page being set.

**2. PLATE FADE.** Result plates animate `opacity: 0 -> 1` over `var(--duration-element)` 240ms with a 24ms stagger capped at the first eight items. No transform, so no layout cost and no scroll jank on a cheap Android. Halve the existing `--stagger` token to 24ms; 50ms across 24 cards is too slow.

**3. INK FLIP.** Hover or `:focus-visible` on a card, a register row, a browse tile or a dealer row swaps the ground to `--rn-ink` and the type to `--rn-ink-inverse` in `var(--duration-micro)` 120ms. Colour only. No lift, no scale, no shadow, no border change.

**4. THE SWEEP.** On the vehicle detail page only, and only once per page, the tachometer arc animates `stroke-dashoffset` from full to its mileage value over 640ms, `var(--rn-ease-out)`. The brand mark moves exactly once per page. Cards never animate their arcs: 24 sweeping gauges is a slot machine.

`--rn-ease-spring` is removed from this direction. Overshoot is the wrong physics for a document, and a springy card is exactly the cheapness the client is objecting to.

### prefers-reduced-motion: remove travel, keep state

This is the whole policy, and it is what makes "reduced must not mean broken" testable rather than aspirational.

- Rules render at `scaleX(1)`. Present, not missing.
- Plates render at `opacity: 1` with no stagger.
- The arc renders at its true mileage value, so the gauge still reads correctly. It is never left at zero.
- **The ink flip is KEPT at 0ms.** A colour change is not vestibular motion, and it is the only interactive feedback in a design with no shadows and no borders, so removing it would genuinely degrade the interface. Blanket `* { animation: none }` is how a reduced-motion site ends up with half its elements stuck at opacity 0.
- Filter changes swap instantly, and an `aria-live="polite"` region announces the new result count, which it does in both modes anyway.

**The assertion that stops this rotting in three months.** Add a Playwright test that runs the full template set under `prefers-reduced-motion: reduce` and asserts that no element has a computed opacity below 1, and that no element's computed transform differs from its motion-enabled end state.

---

## 8. WHAT NOT TO DO

The specific ways this direction goes cheap if it is executed badly. Each of these is a review rejection.

1. **Do not raise `PLATE_CHROMA_MAX` above 0.085.** Somebody will say the plates look muted and turn it up. Above roughly 0.09 the grid starts looking like Spotify cover art and the whole thing cheapens instantly. Muted is the design. It is printed ink, not a podcast tile.

2. **Do not ship without the grain.** It is not cosmetics. It is the difference between a coloured div and pigment. Plates and grain land in the same PR or neither lands.

3. **Do not add a mark to the plate that is not a value from the vehicle record.** No flourish, no texture that means nothing, no second gauge, no invented score. A dial with a needle looks like a rating, and inventing a rating breaches the no-fabricated-content rule outright. If anyone asks to make the needle green for good and red for bad, that is the moment the direction breaks its own rules.

4. **Do not let headlines auto-wrap.** Expanded Archivo at 800 across three lines produces an accidental-looking rag unless every headline is hand-broken with explicit `<br>`. `text-wrap: balance` will not save it. If copy is allowed to flow into these sizes it will look unfinished within a month, which is precisely the failure this direction has to beat.

5. **Do not skip `padding-block` on sub-1 leading.** 120px at 0.88 leading clips caps and descenders in Safari and older Chrome. It looks like a rendering bug because it is one.

6. **Do not put a second red object in a viewport.** One red fill above the fold, ever. A strong red used once reads expensive; used on every button it reads discount, which is the exact thing the current build does wrong. `--rn-red` itself never sits behind text.

7. **Do not add a radius, a shadow, or a border.** All four shadow tokens resolve to `none` and all four radius tokens to `0` on purpose. That commitment leaves the design nowhere to hide, which means any component that has not been redrawn to this system, an off-the-shelf date picker, a third-party map, a Payload admin escapee, will look pasted in immediately. Rebuild every shared primitive square rather than overriding it.

8. **Do not let the price-to-title ratio go past 2.5 to 1.** The original direction wanted 4.5 to 1 with the model name at 12px. That is a gallery price list and it is a shopping failure: a buyer cannot separate a Swift 1.2 GL from a 1.2 GA. Price-first is browsing furniture. Model-first is hunting a car.

9. **Do not put an icon back on the card.** Every lucide glyph is deleted from `vehicle-card.tsx`. A `BadgeCheck` next to the dealer name is what every template ships. The word `VERIFIED` inside a ruled box, backed by three named facts on the dealer page, is evidence.

10. **Do not let the label-caps style spread.** Letterspaced caps is addictive and turns a page into shouted fragments. It is permitted on the dateline, running heads, field labels, the spec run, the plate furniture and the verification stamp. Titles, prices, dealer names and running copy are never in it.

11. **Do not test against the seed's colour distribution.** `src/seed/index.ts:490` is `pick(COLOURS)`, uniform over sixteen, so the seed will never reproduce the real concentration of white, silver and grey in South African stock. Build a fixture weighted to actual market share, roughly 40% achromatic, screenshot twelve of those at 160px wide in a grid, and put it in front of the client before building anything else. That page is where this direction has to work hardest and it is the one thing to verify rather than assume.

12. **Do not launch without the contact sheet.** `scripts/plate-sheet.ts` renders all 311 plates onto one HTML page. It catches a dealer with a mis-tagged swatch, it proves the wall does not tile, and it is also the single screenshot that sells this to the client in one look.

13. **Do not let the mega counter shout a number you would rather not shout.** The floor rule is a hard requirement, not a nicety.

14. **Do not centre the results at a text measure.** `--rn-measure` is for prose. If the results page ends up at 65ch on a 1920px screen, the whole direction reads as a blog and the empty-half complaint comes straight back.

15. **Do not emit `oklch()` into CSS.** All colour maths is server-side TypeScript producing plain hex. That is what makes it testable, deterministic, and safe on the older Safari and WebView slice of South African mobile traffic.

16. **Do not let the copy drift.** Brutal contrast plus a text serif tips pompous very easily. The type can be enormous; the words must stay plain South African English. If the copy goes fashion-brand, this becomes a luxury house pretending to sell a 2016 Polo Vivo in Boksburg, and the whole thing collapses into parody.

17. **Do not quietly undo the four correct decisions already in `vehicle-card.tsx`.** They each exist because a specific bug happened. The comments say which.

---

## FILES THIS TOUCHES

| file | change |
|---|---|
| `src/styles/tokens.css` | semantic layer replaced, palette ramp kept, red rule written in as prose |
| `src/styles/globals.css` | `@theme inline` remapped, `.rn-plate` rules rewritten, `.rn-grid` added, `.tabular` base rule kept as is |
| `src/lib/vehicle-plate.ts` | `inkFor` replaced by fixed `PLATE_INK`; `plateField`, `primerField`, OKLab helpers added; `normaliseSwatch`, `sweepFor`, `grainFor` kept |
| `src/lib/vehicle-plate.test.ts` | assert every seeded swatch and a 360-hue sweep clears 4.5 against `PLATE_INK`, both themes |
| `src/components/vehicles/colour-plate.tsx` | four layers, `pathLength="100"` arc, `variant` prop for `card` / `thumb` / `strip` / `hero` |
| `src/components/vehicles/vehicle-card.tsx` | icons out, plate furniture in, price hierarchy, four existing decisions preserved |
| `src/components/vehicles/register-row.tsx` | new, and the mobile default on `/cars` |
| `src/components/vehicles/results-grid.tsx` | gutter grid, view toggle, sparse-results rule |
| `src/components/vehicles/facet-rail.tsx` | ruled lines, no boxes |
| `src/app/(marketplace)/layout.tsx` | Archivo plus Newsreader replace Montserrat plus Inter |
| `src/app/(marketplace)/page.tsx` | ten sections, wired to the existing `getHomeData()` |
| `src/lib/search.ts` | add `colourFamily` and `provinceCode` to `toCard` |
| `scripts/contrast-report.ts` | plate sweep rows, `*-inverse` pairs, `--rn-red` registered decorative |
| `scripts/plate-sheet.ts` | new, the 311-plate contact sheet |
| `e2e/typography.spec.ts` | new, the tabular-figures build gate |
| `e2e/reduced-motion.spec.ts` | new, the remove-travel-keep-state assertion |
