# DESIGN SYSTEM (proposal, Phase 0)

## 1. What the logo already decides

The mark is a tachometer arc sweeping from silver into red, with the needle forming the crossbar of
an R and motion streaks trailing left. Wordmark is a heavy geometric grotesque. Tagline sits letter-
spaced and light underneath. Two lockups exist: navy on light, and a silver gradient version for
dark grounds.

Three things follow from that, and the system should honour them rather than fight them:

- **The red is a needle, not a field.** In the mark it is the smallest area and the highest energy.
  Red should be the accent that points at the action, not a background we swim in.
- **Silver is structure.** In the mark it is the gauge housing. In the interface it is rules,
  dividers, chrome and dark-theme body text. It is not a brand field colour either.
- **Navy is the ground.** Everything sits on it or on white.

## 2. Three directions

### Direction A: Forecourt
Light, bright, high density. Near-white surfaces, navy type, silver hairline structure, red reserved
for actions, price drops and the verified badge. Cards are flat with a one-pixel silver rule and a
generous internal grid, not shadowed boxes. The photography does the work and the chrome gets out of
the way. Reads like a well-run forecourt: everything visible, nothing shouting.

### Direction B: Showroom Floor
Dark navy stage. Vehicles lit like studio product photography against deep ground, silver rules
catching the light, red as a single directional accent. Large type, wide measure, generous vertical
rhythm. Editorial and expensive. Feels like a launch event rather than a classifieds site.

### Direction C: Instrument
Takes the tachometer literally. Precision-instrument language throughout: tabular numerals
everywhere, gauge arcs for stat displays, thin red needle marks as the accent vocabulary, tick-mark
dividers, dark chrome around light content wells. Distinctive and ownable, and the highest risk,
because instrument metaphors get gimmicky fast and a search results page is not a dashboard.

### Recommendation

**Forecourt for the marketplace. Showroom Floor for the agency. Instrument contributes a detail
layer to both and is not a whole direction.**

The brief itself says the marketplace should be "denser and more utilitarian in its search surfaces"
and the agency "more editorial and spacious", and that maps cleanly onto A and B. Beyond taste,
there are two hard reasons:

1. A dark search results page is measurably worse to scan for a grid of vehicle photographs, because
   every thumbnail becomes a bright rectangle on dark ground and the eye has nowhere to rest.
2. Direction B on the marketplace home would make a large hero image the LCP element on a dark
   ground, which is the single easiest way to miss the 2.0s LCP budget in Section 13.

Both share one token file. The difference is which semantic layer each route group loads plus a
different density and type scale, not two design systems.

Instrument's contribution: tabular figures locked on for every price, mileage, power and rate;
gauge arcs on the agency stat bands and the dealer portal dashboard; tick-mark rules instead of
plain dividers on spec tables. Motifs, not a skin.

## 3. Colour tokens

Every value below was computed and contrast-checked, not eyeballed. The check script becomes
`scripts/contrast-report.ts` and its output is committed and CI-gated.

### Neutral ramp
Anchored on the two brand neutrals, so the ramp is genuinely ours: it runs white to `#B1B4BB`
(brand silver, at 400) to `#001123` (brand navy, at 900).

| Token | Hex | on white | on navy |
|---|---|---|---|
| neutral-0 | `#FFFFFF` | 1.00 | 19.01 |
| neutral-25 | `#F8F8F9` | 1.06 | 17.91 |
| neutral-50 | `#F2F2F3` | 1.12 | 17.00 |
| neutral-100 | `#E7E8EA` | 1.23 | 15.51 |
| neutral-200 | `#D4D5D9` | 1.47 | 12.96 |
| neutral-300 | `#C2C4CA` | 1.74 | 10.90 |
| neutral-400 | `#B1B4BB` (brand) | 2.08 | 9.16 |
| neutral-500 | `#80858D` | 3.71 | 5.12 |
| neutral-600 | `#5E656E` | 5.89 | 3.23 |
| neutral-700 | `#414952` | 9.13 | 2.08 |
| neutral-800 | `#262F39` | 13.57 | 1.40 |
| neutral-900 | `#001123` (brand) | 19.01 | 1.00 |
| neutral-950 | `#000B16` | 19.82 | 1.04 |

### Red ramp

| Token | Hex | on white | on navy | white on it |
|---|---|---|---|---|
| red-50 | `#FDF0F1` | 1.11 | 17.12 | - |
| red-100 | `#FBDEE0` | 1.26 | 15.05 | - |
| red-200 | `#F7BDC2` | 1.61 | 11.78 | - |
| red-300 | `#F0878E` | 2.45 | 7.75 | - |
| red-400 | `#E9505B` | 3.64 | 5.22 | - |
| red-500 | `#E32432` (brand) | 4.60 | 4.13 | 4.60 |
| red-600 | `#CC2231` | 5.47 | 3.48 | 5.47 |
| red-700 | `#AA1F2E` | 7.13 | 2.67 | 7.13 |
| red-800 | `#841C2C` | 9.62 | 1.98 | 9.62 |
| red-900 | `#5F1929` | 12.67 | 1.50 | 12.67 |

### Three findings that change how the brand is used

**1. Brand red as body text on white passes at 4.60, by 0.10.** That is too thin a margin to build
on, because any anti-aliasing or font-weight change eats it. Link and inline accent text uses
**red-600 `#CC2231` (5.47)**. Brand red-500 stays for solid fills, the needle motifs and the mark
itself, where white-on-red is 4.60 and passes.

**2. Brand red on brand navy is 4.13 and fails AA body text.** Red type on the navy surface, which
the dark theme and the agency site both want, must lighten. Dark-theme accent text is **red-300
`#F0878E` (7.75)**, hover **red-200 (11.78)**. Solid red CTA on navy keeps red-500 with white text
(4.60). Never navy text on red: that pair is 4.13 and fails.

**3. Brand silver on white is 2.08 and fails everything, including the 3:1 non-text minimum.** So
silver is a **dark-theme text colour** (9.16 on navy, excellent) and a **light-theme decorative rule
only**. It may never be light-theme body text, muted text, placeholder text or an interactive
boundary. This is the constraint most likely to be broken by accident, so it is a lint rule, not a
note.

### Two border tokens, not one

WCAG 2.2 SC 1.4.11 requires 3:1 only where a boundary is the sole indicator of an interactive
control. A decorative divider is exempt. Collapsing both into one token either makes every hairline
too dark or leaves real control boundaries failing, so:

| Token | Light | Ratio | Dark | Ratio | Rule |
|---|---|---|---|---|---|
| `--border-subtle` | neutral-200 `#D4D5D9` | 1.47 | `#273544` | 1.52 | Decorative only. Dividers, card edges, table rules. |
| `--border-interactive` | neutral-500 `#80858D` | 3.71 | neutral-600 `#5E656E` | 3.23 | Any boundary that is the only thing marking a control. Inputs, unfilled checkboxes, segmented controls. |

### Semantic layer

Light theme, verified:

```
--surface              #FFFFFF
--surface-raised       #F8F8F9
--surface-sunken       #F2F2F3
--text-primary         #0C1721   18.10  PASS
--text-secondary       #414952    9.13  PASS
--text-muted           #5E656E    5.89  PASS
--accent               #CC2231    5.47  PASS
--accent-hover         #AA1F2E    7.13  PASS
--accent-solid         #CC2231    white on it 5.47  PASS
--border-subtle        #D4D5D9    decorative
--border-interactive   #80858D    3.71  PASS
```

Dark theme, verified:

```
--surface              #001123
--surface-raised       #0E1E2F
--surface-sunken       #000B16
--text-primary         #F2F2F3   17.00  PASS
--text-secondary       #C2C4CA   10.90  PASS
--text-muted           #B1B4BB    9.16  PASS
--accent               #F0878E    7.75  PASS
--accent-hover         #F7BDC2   11.78  PASS
--accent-solid         #E32432    white on it 4.60  PASS
--border-subtle        #273544    decorative
--border-interactive   #5E656E    3.23  PASS
```

### Status colours

Tuned per theme rather than shared, because a single value cannot pass on both grounds.

| Role | Light | on white | Dark | on navy |
|---|---|---|---|---|
| success | `#0F7A3D` | 5.42 | `#4FCB86` | 9.25 |
| warning | `#8A5A00` | 5.93 | `#F0B44A` | 10.26 |
| danger | `#B6202F` | 6.49 | `#F1878F` | 7.79 |
| info | `#0B5FA5` | 6.57 | `#66B6F2` | 8.64 |

Danger and accent are close in hue by necessity, so **status is never carried by colour alone**.
Every status chip pairs its colour with an icon and a text label. A sold badge says "Sold". A price
drop shows a downward arrow and the amount. That is Section 10's rule and also the only way this
palette works, given the brand is built on one strong red.

## 4. Type: where I push back

You asked for Montserrat and Poppins. Montserrat is right and I would keep it. Poppins is the
problem.

Poppins is a single-storey-a geometric with near-circular counters, a tall x-height and wide
sidebearings. It is handsome at 32px in a marketing headline. At 14px in a spec table, in a facet
list, in a lead pipeline, it is slow to read and it sets wide, which costs horizontal space we do
not have in a filter rail. It also has no useful tabular figure set, and this platform is mostly
numbers: prices, mileage, kilowatts, instalments, rates, years.

Proposal:

| Role | Face | Why |
|---|---|---|
| Display and headings | **Montserrat** 600 / 700 / 800 | It is the logo's voice. Geometric, confident, matches the wordmark. |
| Interface, body, tables, forms | **Inter** variable | Built for screen UI at small sizes, real tabular figures (`tnum`), slashed zero available, and metric-compatible fallbacks so there is no layout shift. |
| Numerals: price, mileage, power, rate | Inter with `font-variant-numeric: tabular-nums slashed-zero` | Prices in a column must align. `R 249 900` and `R 1 249 900` cannot wobble. |
| Agency site lead paragraphs and pull quotes | **Poppins** 400 / 500, optional | If you want Poppins on the brand, this is where it earns its place: large sizes, short measures, marketing surfaces. Not in the marketplace search UI. |

That is two families core plus one optional. Self-hosted, subset to Latin plus the punctuation we
actually use, `font-display: swap`, critical faces preloaded, and metric-matched local fallbacks
declared with `size-adjust` so the swap does not shift layout. Total critical font payload budgeted
at under 45KB.

If you want Poppins as the body face across the whole platform, say so and I will build it. I think
it costs you readability and density on the surfaces that matter most, and I would rather say that
now than after the search page is built.

### Scale

Fluid with `clamp()`, two scales sharing one token file. The marketplace runs tighter, the agency
wider.

```
--step--1  clamp(0.833rem, ...)      captions, meta, table secondary
--step-0   clamp(1rem, ...)          body
--step-1   clamp(1.2rem, ...)
--step-2   clamp(1.44rem, ...)
--step-3   clamp(1.728rem, ...)
--step-4   clamp(2.074rem, ...)
--step-5   clamp(2.488rem, ...)
--step-6   clamp(2.986rem, ...)      agency hero only
```

Marketplace uses a 1.2 ratio, agency 1.25. Line height is a token per step, not a global multiplier.

## 5. Other token groups

**Spacing.** 4px base, `--space-1` through `--space-24`, no arbitrary values. Section spacing is its
own scale so the agency can breathe without the marketplace inheriting it.

**Radii.** `--radius-sm` 4px, `-md` 8px, `-lg` 12px, `-xl` 16px, `-full`. Vehicle cards use `-lg`,
inputs `-md`, badges `-full`.

**Elevation.** Four levels, each a paired shadow (ambient plus direct) tuned separately for light and
dark, because a dark theme needs a lighter surface rather than a darker shadow.

**Motion.** `--duration-micro` 120ms, `--duration-element` 240ms, `--duration-page` 480ms.
`--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`,
`--ease-spring` for layout only. Three durations and three easings, and a one-off timing in a
component is a review rejection.

**Z-index.** A named scale: `base 0`, `raised 10`, `sticky 100`, `header 200`, `overlay 300`,
`modal 400`, `popover 500`, `toast 600`, `tooltip 700`. No magic numbers.

**Focus.** `--focus-ring` is a two-part ring: a 2px accent ring with a 2px surface-coloured offset,
so it stays visible on any ground including on top of photography. Contrast checked against every
surface token. Never removed, never replaced with a background change alone.

## 6. Component states, non-negotiable

Every interactive component ships with default, hover, focus-visible, active, disabled, loading,
error, empty, and a skeleton matching its final geometry. Every list ships an empty state with a
useful next action, and every async surface ships an error state that says what to do next. A
`<div>No results</div>` fails review.

Touch targets are 44 by 44 CSS pixels minimum, and where a control looks smaller the hit area is
padded out rather than the visual shrunk.

## 7. Verification

`scripts/contrast-report.ts` walks every semantic pair in both themes, applies the correct threshold
per pair type (4.5 text, 3.0 large text and interactive boundary, none for decorative), and writes
`docs/contrast-report.md`. CI fails on any regression. That report is committed, as Section 10 asks.
