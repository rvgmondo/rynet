# CONTENT NEEDED

Everything on the platform that is currently invented, a placeholder, or awaiting a decision.
Nothing on this list may go in front of the public as fact until it is replaced.

The rule this document enforces: **never fabricate a statistic, a testimonial, a client name, a
review, or a case study metric.** Where the build needs something in that shape to exist, it is
listed here and flagged in the interface.

---

## 1. The twelve dealerships are invented

`src/seed/data/dealers.ts`. All twelve are fictional, every one is flagged
`isDemonstration: true`, and that flag renders a "Demonstration" badge on every listing and
dealership page they appear on.

They were built to be obviously generic rather than to resemble any real business. The addresses
are real streets so the geocoding and the province facets exercise properly. The phone numbers use
the 08600 non-geographic range, so none of them can ring a real person.

**Needed:** real signed dealerships, with their own trading names, registration numbers, branches,
trading hours and contacts. Until then the demonstration flag stays on.

**One thing deliberately absent:** none of them has a review score or a review count. A fabricated
rating on a platform whose entire proposition is trust would be the single worst thing in the seed,
and `AggregateRating` structured data is not emitted for any of them.

## 2. The 311 vehicles are generated

`src/seed/index.ts`. Makes, models, variants and new prices are real South African market data.
The individual listings are generated: the mileage, the age, the depreciation, the colour and the
feature list are all synthetic, and every one is flagged `isDemonstration: true`.

They are deliberately believable, because unrealistic seed data hides design problems until late.
They are not real cars and none of them is for sale.

**Needed:** real stock, from a real feed or captured through the portal.

## 3. Plan prices are placeholders

`src/seed/data/dealers.ts`, the `PLANS` constant. Starter R 1 500, Professional R 3 500, Growth
R 6 500, Enterprise R 12 500 per month. **These numbers were invented to give the plan machinery a
realistic shape. They are not a pricing recommendation.**

Every plan is seeded with `isPublic: false`, so no pricing page renders them. That is on purpose: a
dealer principal who sees an invented price and quotes it back later is a problem that is cheap to
avoid and expensive to fix.

**Needed:** the real tier structure, the real monthly prices, the real listing limits, and what each
tier unlocks.

## 4. Legal copy requires review

Nothing in this section may ship as final without a South African attorney signing it off.

| Item | Status |
|---|---|
| Finance calculator disclaimer | Drafted in `src/globals/FinanceDefaults.ts`, opens with the words REQUIRES LEGAL REVIEW, and the field cannot be emptied |
| Privacy notice and POPIA statement | Not written |
| Terms of use | Not written |
| Cookie policy | Not written |
| Dealer agreement | Not written |
| Responsible disclosure policy | Not written |

The finance disclaimer matters most. South African vehicle credit sits under the National Credit
Act, the calculator sits directly beside a price, and a figure that reads as a quotation rather than
an estimate is a compliance problem rather than a bug.

## 5. Brand assets

**The logo is a PNG.** `brand/` holds five raster lockups plus an icon and a favicon. The mark
currently rendering in the header is a geometric reconstruction in
`src/components/brand/rynet-mark.tsx`, drawn from the tachometer arc rather than traced, because
tracing a raster produces bloated paths that look soft at small sizes.

**Needed:** the vector source (SVG, AI or EPS). When it arrives, that component is replaced by it
rather than adjusted.

Also needed: a proper favicon set and a social sharing image. The current `favicon.png` is
468KB, which is roughly two hundred times what a favicon should weigh.

## 6. Vehicle photography

There is none. The vehicle cards are spec-led and carry no image, which is honest but is not the
finished design. A grey placeholder rectangle repeated 311 times would look worse than what is
there now, so nothing was invented.

**Needed:** either real dealer photography, or a decision on what a listing with no photo looks
like, since some dealers will always upload late.

## 7. Rynet Digital has no prices

`src/content/agency/pricing.ts`. Every band's `from` is `null`, and the pricing page renders an
honest paragraph in place of the numbers: that we are new, have not done enough dealership work to
quote a range we would stand behind, and would rather say so than print a figure we invented.

**Needed from Ruben:** a real starting figure for each of the four bands, excluding VAT. Set
`from` on the band and the page renders it. Nothing else changes, and the honest paragraph
disappears on its own.

Do not put a guess in that field to make the page look finished. A guessed price gets planned
around and then revised, and the revision is the thing the dealer remembers.

## 8. Rynet Digital has no clients

Which is why the agency site has no logo wall, no testimonials, no case studies and no metrics.
The home page says so in as many words, under the heading "We have not done this for you yet", and
there is an end-to-end test asserting that heading is on the page. The temptation to add
"trusted by 40 dealerships" arrives the week before launch, when nobody is rereading the brief.

The proof used instead is Rynet Showroom itself, which is real, on the same domain, and something
a dealer principal can open and judge in ten seconds.

**When there is real client work:**

- **Case studies** carry a `metricsVerified` flag in the content model. An unverified case study
  renders its narrative and hides its numbers. It never renders an invented metric.
- **Testimonials** need real named people who have agreed to be quoted.
- `/digital/work` goes into the agency navigation, which is where it was deliberately left out.

## 9. Rynet Digital has no team page

There is no page of headshots because there is not yet a team to photograph, and a stock
photograph of people in a meeting room is not an answer to "who will I deal with". The about page
says that instead.

**Needed:** real names and faces when there are any.

## 10. Decisions still open

Tracked in full in `docs/QUESTIONS.md`. The ones that block content rather than code:

- Dealer verification checklist: exactly what we check and record.
- What the four agency price bands actually start at. Decided in shape: a three step
  qualification path, with the figure given on the call rather than published, until there is
  delivery history to quote from.
- Whether reviews are collected by us, imported from Google, or omitted from v1.
- Whether the trade-in estimator uses a licensed valuation source or produces a range and hands off.
