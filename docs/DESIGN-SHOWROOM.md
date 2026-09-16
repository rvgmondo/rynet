# RYNET DESIGN: SHOWROOM

The authority on tokens, type, components and rules, from September 2026. It supersedes
[DESIGN-STOCKLIST.md](DESIGN-STOCKLIST.md) and the direction sections of
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

Values live in `src/styles/tokens.css`. Component styling lives in `src/styles/globals.css`
inside `@layer components`. React components live in `src/components/ui/`. Contrast is proven by
`npm run contrast`, which writes [contrast-report.md](contrast-report.md) and fails CI on any pair
below its minimum.

---

## 1. The direction

Premium, calm, photograph-led, trustworthy and fast. The benchmark for polish is Carvana, Cazoo,
carwow and AutoTrader UK; the benchmark for what a South African buyer expects is AutoTrader SA
and Cars.co.za. It should read as a well-funded product team, not a magazine and not a template.

In one line: a light cool-grey page, white cards with a soft navy-tinted shadow, navy ink, one
family at normal width, photographs doing the selling, and red spent on the one action that matters.

What it replaced, and why it had to go: STOCKLIST set everything on a plaster ground with no radii
and no shadows, used letterspaced grey capitals for navigation, buttons, notices and data, set
prices as giant expanded black slabs with a shrunken R, and drew a colour field with a mileage gauge
where a photograph should be. Once photographs arrived, that system made the site look cheap.

## 2. Hard rules

These override any taste, benchmark or finding.

1. **Honesty.** All dealerships and listings are demonstration data today. Every listing card shows
   one quiet `Demo listing` badge; every listing and dealership page carries one calm `Notice`.
   A demonstration dealership gets `Demo dealership`, never `Verified`
   (`<DealershipStatusBadge isDemonstration>` does this). Platform copy describes how Rynet works
   ("every dealership is checked before it can list"), never a verification claim about seeded data.
   Structured data, sitemap and metadata gating on `isDemonstration` do not change.
2. **Never fabricate** statistics, reviews, ratings, testimonials, logos, case studies, phone numbers,
   addresses, registration numbers, response times, hours or prices. Agency prices are null and
   render as "on application". Placeholders go in `docs/CONTENT-NEEDED.md`.
3. **Legal.** Unreviewed legal copy carries `<LegalReviewMarker>` ("Requires legal review"). The POPIA
   section 18 notice on `/sell-to-a-dealer` stays fully visible; no rand figure appears on that page;
   `/sell-your-car` does not exist; there is no private-seller listing path.
4. **WCAG 2.2 AA.** 4.5:1 text, 3:1 control boundaries and focus rings, visible focus, 24px minimum
   targets and 44px for primary actions on a phone, a label on every control, reflow at 320px,
   `prefers-reduced-motion` respected. No overlays.
5. **Performance.** LCP under 2.0s on a throttled mid-range Android. `images.unoptimized` stays true.
   Ask for renditions through `pick()` / `vehiclePhoto()` ("card" on cards, "gallery" on the listing
   hero). One priority image per page. No JavaScript carousels or autoplay video; scroll-snap rows
   are the carousel. Repeated grid items keep `content-visibility: auto`.
6. **South African English.** "R 249 900". No em dashes, en dashes, ellipsis characters or middots
   in copy or comments.
7. **Backend guarantees** (access control, tenant isolation, VIN hiding, the no-JavaScript GET search
   with hidden inputs for everything the buyer arrived with, migrations, the demo-photo machinery,
   enquiry and consent writes) are untouched by design work.

## 3. Colour

Brand: navy `#001123`, red `#E32432`, silver `#B1B4BB`.

| Role | Token | Tailwind | Light | Dark |
|---|---|---|---|---|
| Page ground | `--rn-page` | `bg-page` | `#F5F7FA` | `#0A1A30` |
| Card, header, input | `--rn-card` | `bg-card` | `#FFFFFF` | `#112642` |
| Tinted panel, chip, placeholder | `--rn-subtle` | `bg-subtle` | `#EEF2F6` | `#0D203A` |
| Navy band (hero, footer), darker than the page in dark | `--rn-navy` | `bg-navy` or `.on-navy` | `#001123` | `#030B17` |
| Heading ink | `--rn-heading` | `text-heading` | `#001123` | `#F3F6FA` |
| Body ink | `--rn-body` | `text-body` | `#26324A` | `#D3DBE6` |
| Muted ink (4.5:1 on every ground) | `--rn-muted` | `text-muted` | `#5B6678` | `#9DABBF` |
| Decorative line | `--rn-line` | `border-line` | `#E3E8EF` | `#1F3657` |
| Stronger decorative line | `--rn-line-strong` | `border-line-strong` | `#CDD5DF` | `#2D4668` |
| Control border (3:1) | `--rn-line-control` | `border-line-control` | `#748196` | `#6F819C` |
| Primary action fill | `--rn-primary` | `bg-primary` | `#C81E2B` | `#C81E2B` |
| Secondary action fill | `--rn-secondary` | `bg-secondary` | `#001123` | `#24426B` |
| Red words (links, accents) | `--rn-accent` | `text-accent` | `#B81B29` | `#FF7079` |
| Brand red, graphic marks only | `--rn-brand-red` | `bg-brand-red` | `#E32432` | `#E32432` |
| Focus ring | `--rn-focus-ring` | `outline-focus` | `#1D5BD6` | `#8DB4FF` |
| Success, warning, danger, info | `--rn-success` etc. plus `-subtle` grounds | `text-success`, `bg-success-subtle` | see tokens | see tokens |

**The red rule.** White on brand red is 4.60:1, too thin to build on. Every solid red button is
`#C81E2B` (5.71:1). Red words are `#B81B29` (6.51:1 on white). Brand red is for the mark, the
current-page underline in the header and tiny accents, and never sits behind text. Aim for one red
object per viewport: the primary action.

**Older names.** `surface`, `surface-raised`, `surface-sunken`, `ink`, `ink-secondary`, `ink-muted`,
`line-interactive`, `accent-solid` and the `--rn-paper` / `--rn-ink` family still resolve (to page,
card, subtle, heading, body, muted, control border, primary). They exist so unredrawn page bodies do
not break. Do not use them in new work. `surface-inverse` and `ink-inverse` keep their old flipping
meaning; the theme-stable dark band is `navy` / `on-navy`.

## 4. Type

One family: **Archivo**, normal width, self-hosted through `next/font` in `src/lib/fonts.ts` and
preloaded on dynamic routes by `src/lib/font-preload.ts`. No serif, no width axis.

| Role | Class | Size | Weight | Notes |
|---|---|---|---|---|
| Page title | `.rn-h1` | 34 to 56px | 700 | tracking -0.018em, balanced |
| Section title | `.rn-h2` | 24 to 32px | 600 | tracking -0.012em; about 1.75 below the page title, so sections never shout as loud as it |
| Sub-section, card and item title | `.rn-h3` | 18 to 20px | 600 | tracking -0.006em, `text-wrap: pretty` |
| Lead paragraph | `.rn-lead` | 17 to 20px | 400 | |
| Body | (default) | 16px / 1.55 | 400 | |
| Small | `text-sm` | 14px | 400 to 600 | |
| Eyebrow | `.rn-eyebrow` | 12px | 600 | the ONLY uppercase role, tracking 0.08em |
| Navigation | `.rn-navlink`, `.rn-nav` | 15 / 14px | 500 to 600 | sentence case |
| Price | `.rn-price--sm/md/lg/xl` | 17 / 22 / 24 to 30 / 30 to 40px | 700 | tabular, "R 584 000" |

Sentence case everywhere. Uppercase letterspacing is allowed on eyebrows and nothing else: never on
links, buttons, notices, badges, data or navigation.

## 5. Shape, depth, space, motion

- **Radius:** 8px controls (`--rn-radius-sm`), 12px cards (`md`), 16px panels (`lg`), full for chips
  and badges.
- **Elevation:** `--rn-shadow-xs` on controls, `--rn-shadow-card` at rest, `--rn-shadow-hover` on
  hover and focus-within with a 2px lift, `--rn-shadow-overlay` for sheets and dialogs. Navy-tinted
  in light, black in dark.
- **Space:** an 8px grid (4px half steps inside components). Container 1280px of content
  (`container-page`, `<Container>`), 832px narrow column (`container-narrow`). Section rhythm
  `--section-tight`, `--section-base`, `--section-loose`.
- **Motion:** 120ms micro, 200ms element, 360ms page, ease `--rn-ease-out`. Only transform,
  opacity, colour and shadow animate. Under `prefers-reduced-motion` all travel is removed and
  hover and focus shadows stay.
- **Breakpoints:** Tailwind defaults plus `xs` at 560px, where vehicle cards go two up.

## 6. Components

All in `src/components/ui/` (barrel: `@/components/ui`). None is a client component except
`Button`, so they render in server components with no JavaScript cost.

| Component | Use |
|---|---|
| `Button` / `buttonClasses()` | `variant`: primary (red), secondary (navy), outline (white, 3:1 border), ghost, link. `size`: sm 44px, md 48px, lg 56px, icon. `block` or `block="mobile"`. Server components put `buttonClasses()` on a `<Link>`. |
| `Badge` | `tone`: neutral, verified, demo, new, drop, warning. `DemoListingBadge`, `DealershipStatusBadge`. Sentence case. `onPhoto` adds a shadow. |
| `Card` | `.rn-card`, 12px radius. `interactive` for hover lift; `panel` for the 16px surface. |
| `Container` | 1280px or `size="narrow"`. |
| `Field` + `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Choice` | Field wires label, id, hint, error, `aria-describedby`, `aria-invalid`. Controls are 44px, 16px text, native. |
| `SectionHeader` | eyebrow, title (h2 by default), lead, and an arrow link action. |
| `PageHeader` | the opening band of a content page: eyebrow, H1, lead, `meta` (date, legal marker), `actions`, optional `aside`. From 1024px it is split (title left, lead and actions right) or, with an aside, title and lead left and real content right. The right half of the band is never empty. Used by /contact, /dealers and every legal document. |
| `TextLink` | the two link styles and the only two: `action` (red words and an arrow, `.rn-link-arrow`, a section's next step) and `inline` (heading ink, semibold, a quiet underline that turns red on hover, `.rn-link`, for links in sentences, notices, captions, cards, forms and email addresses). Copy nobody marks up (a legal document, a dealer's description) gets `.rn-links` on its container. |
| `IconTile` | the one icon tile: 44px, 12px radius, tinted ground, heading ink icon; `size="lg"` is 48px; raised navy inside `.on-navy`. `.rn-icon-tile` for markup that maps icons itself. |
| `PriceTag` | the price. `RandFigure` in `components/vehicles` delegates to it. Every figure from `formatRand`, `formatMonthly`, `formatKm` and `formatCc` joins its parts with no-break spaces, so "R 1 020 800" or "103 900 km" never breaks across lines anywhere; compare with `plain()` in tests. |
| `KeyFacts` | icon, label, value. `inline` on cards, `grid` on listings. |
| `EmptyState` | icon, title, body, one action. |
| `Notice` | `info`, `warning`, `neutral`. `role="note"`. The demonstration disclosure is an info Notice. |
| `LegalReviewMarker` (`components/layout`) | the one "Requires legal review" marker. |

Brand: `RynetMark` (the R and gauge) and `RynetLockup` (mark, red divider, RYNET) in
`src/components/brand/rynet-mark.tsx`. Traced from `brand/2.png` and `brand/rynet_logo_1.png`.
`tone="on-navy"` or any `.on-navy` ancestor gives the light version.

## 7. Chrome

- **Header** (`site-header.tsx`): white, sticky, 64px, 1px line and a whisper of shadow. Lockup;
  Buy a car, Dealerships, How we verify with `aria-current` and a red underline; a compact search
  from 1280px (hidden on / and /cars); "Sell your car" and "For dealers" as quiet links; last, the
  theme menu. No red button: red is spent on each page's own action. Below 1024px the bar is the
  lockup, a search button (a link to /cars that opens the menu with its search focused once
  hydrated), the theme menu and the menu, three 44px icon buttons with no gap between them. The
  menu is a full-height sheet (native `<details>`, closes on navigation, Escape and scrim tap,
  locks page scroll) with search, the destinations, quick searches by body type, make and price, and one
  outline "Sell your car to a dealership" (not shown on that page). Below 1024px the header slides
  away on scroll down and returns on scroll up (`header-scroll.tsx`), never while the theme menu
  is open.
- **Theme menu** (`theme-menu.tsx`), in the marketplace header and the agency header, and nowhere
  else: one icon button showing the current choice (sun, monitor, moon) and naming it ("Colour
  theme: Dark"), opening a small card with Light, System and Dark as `menuitemradio` items, a tick
  on the current one. Arrow keys, Home, End and first letters move; Enter, Space or a click chooses
  and closes; Escape, Tab and a click outside close. next-themes keeps the choice in localStorage
  under "theme" and writes `data-theme` on `<html>` before first paint.
- **Footer** (`site-footer.tsx`): navy in both themes. Lockup and a how-it-works line, three link
  columns, quick searches as chips from 768px, copyright, the dealer-supplied-prices disclaimer, the
  company identity line only when every part of it is real.
- **Breadcrumbs:** Home and parents only, never a single crumb repeating the H1. JSON-LD carries the
  full trail.
- **404:** one body (`not-found-body.tsx`) in both the route-group and the global 404, inside the
  full header and footer.

## 8. The vehicle card

`src/components/vehicles/vehicle-card.tsx`, in `.rn-grid` (`results-grid.tsx`).

- White card, 12px radius, soft shadow, 2px lift on hover. The title link's `::after` covers the card.
- 16:10 photograph from the "card" rendition, `object-fit: cover`, `object-position: 50% 55%`,
  gently scales on hover. Photo count chip bottom right. `Demo listing` badge top left, and
  nothing else on the photograph: New or Ex-demo is a badge beside the price.
- Price first (`PriceTag md`). A reduction is a green `Reduced by R 13 400` badge, never a negative.
- Title: year, make and model in semibold, variant in muted, clamped to two lines, model codes kept
  whole.
- Key facts: year, mileage, transmission ("Auto" on cards), fuel, as icon and value; always 2 by 2.
- Foot: dealership name (truncates first) and town. The verified check renders only for a real
  dealership.
- Grid: one up on a phone, two from 560px, three beside a filter rail, four on a full-width page.
  Only the first card of a page is `priority`.
- No photograph: `ColourPlate` (same file name, new drawing) is a light panel washed with the
  recorded paint colour, a line drawing of the body type (bakkie, SUV, hatchback, sedan) and "Photos
  coming soon". Variants `card`, `hero` (which also names the colour), `thumb`. In a one-column phone
  grid a photo-less card's media is a short 16:7 band.

## 9. Retiring STOCKLIST

The old role classes (`.rn-label`, `.rn-head`, `.rn-display`, `.rn-figure`, `.rn-prose`, `.rn-rule`,
`.rn-run`, `.rn-columns`, `.rn-shot`, `.rn-wall`, `.rn-doc`) are retuned to SHOWROOM type and colour
and kept in `@layer components` so unredrawn pages do not break. They are deprecated. When a surface
is redrawn, replace them (the map is in the LEGACY banner in `globals.css`) and delete a class once
nothing references it. The plate and gauge classes are already gone.
