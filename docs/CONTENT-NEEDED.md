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
the 08600 non-geographic range, which was chosen so they should not ring a real person, but nobody
has verified that the range is unassigned. So no demonstration phone number or WhatsApp link is
shown anywhere: a demonstration listing has no Show number, no Call in the phone bar and no
WhatsApp button, only "Calling and WhatsApp switch on for real dealerships", and an end-to-end test
(`e2e/enquiry.spec.ts`) fails if a `tel:` or `wa.me` link appears on a demonstration listing or its
dealership's page. A demonstration dealership's trading hours are labelled "Example hours" and are
never compared with today's date.

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

## 2b. The photographs illustrate the model, not the car

`src/seed/photos/`. Candidates gathered by `npx tsx scripts/fetch-demo-photos.ts <dir>`, chosen by a
person in `scripts/demo-photos/picks.json`, built by `scripts/demo-photos/build-manifest.mjs`, and
attached by `npm run seed:photos` locally or by the `demo_photographs` migration on the live host.

A hundred and thirty four photographs from Wikimedia Commons, up to four per model, every one under
a licence that permits commercial use, every one a photograph of the current shape of the model it
is attached to, taken and identified by a named photographer, and every one looked at on a contact
sheet before it was accepted. A seeded Hilux carries a photograph of a Hilux, in the listing's own
colour where one exists, and never the same photograph as the Hilux listed next to it.

It is not a photograph of THAT Hilux, because that Hilux does not exist. The listing page prints
"Photograph of this model, not of this car" with the photographer and the licence directly under
the image, and the demonstration badge on the same page says the listing itself is generated.

One listing in twelve is deliberately left without a photograph, because a dealership that adds
stock before it photographs it is a real state the site has to handle and be seen handling.

Four models have none at all, and show the colour plate throughout: Volkswagen Polo Vivo,
Mahindra Pik Up, Toyota Starlet and Chery Tiggo 4 Pro. Commons has nothing of the current shape
of any of them that is worth putting on a card, and a photograph of the wrong generation would
break the one claim the page does make.

Every media record carries `isDemonstration: true`, and the install refuses outright on a
platform with any real stock on it.

**Needed:** the dealership's own photographs of its own stock, through the portal.
**To remove all of it:** `npm run seed:photos -- --clear` locally. On the live host, deleting the
demonstration media from the admin does the same.

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

Every item below renders the one quiet "Requires legal review" marker until its date is recorded in
`src/content/legal-review.ts` (or, for the finance disclaimer, `FinanceDefaults.lastReviewedAt`).

| Item | Status |
|---|---|
| Finance calculator disclaimer | Drafted in `src/globals/FinanceDefaults.ts`. The stored text still opens with REQUIRES LEGAL REVIEW; the listing page strips that prefix for display and shows the standard marker instead. A migration removing the prefix from the stored value is still to do |
| Privacy notice (`/privacy`) | Drafted, dated 17 September 2026. Now describes the sell-to-a-dealer flow and sharing with a shortlist of verified dealerships, with no count shown to a seller. A sentence claiming deletion is automatic was removed, because no purge job exists |
| Terms of use (`/terms`) | Drafted, unreviewed |
| Cookie notice (`/cookies`) | Drafted, dated 14 September 2026. Now discloses the form drafts kept in the browser |
| POPIA section 18 notice on `/sell-to-a-dealer` | Drafted, unreviewed, always fully visible |
| Consent wording: sell form, listing enquiry, Rynet Digital form | Drafted, unreviewed, stored verbatim on every consent record. The consent policy version is now `2026-09-privacy-v3`, bumped when the sell wording changed from a count of dealerships to a shortlist |
| Dealer agreement | Not written |
| Responsible disclosure policy | Not written |

The finance disclaimer matters most. South African vehicle credit sits under the National Credit
Act, the calculator sits directly beside a price, and a figure that reads as a quotation rather than
an estimate is a compliance problem rather than a bug.

## 5. Brand assets

**The logo is a PNG.** `brand/` holds five raster lockups plus an icon and a favicon. The mark and
lockup rendering on the site (`src/components/brand/rynet-mark.tsx`) were traced from
`brand/2.png` and `brand/rynet_logo_1.png` in September 2026 and rebuilt as clean vectors: the
gauge segments and needle hub are fitted circular arcs and the RYNET wordmark is drawn geometry.
Rendered back at master size they overlap the rasters by 98.9 and 98.2 percent.

**Still needed:** the original vector source (SVG, AI or EPS). When it arrives, the path data in
that component is replaced by it and the component API stays as it is.

Also needed: a proper favicon set and a social sharing image. The current `favicon.png` is
468KB, which is roughly two hundred times what a favicon should weigh.

## 6. Vehicle photography

Seeded listings are illustrated with Wikimedia Commons photographs of the model (see 2b), and about
one listing in twelve is deliberately left without one. A listing with no photograph now shows a
light placeholder with a car silhouette, the recorded paint colour and "Photos coming soon"
(`src/components/vehicles/colour-plate.tsx`), because some dealers will always upload late.

**Needed:** real dealer photography, and a per-photo focal point if dealer shots turn out to be
framed inconsistently (the card crops to 16:10 at `object-position: 50% 55%`). The library's median
aspect ratio is 1.65, which is why cards stay 16:10 rather than 4:3: a 4:3 frame would cut the
bumpers off the wide shots.

**Before launch:** commissioned or dealer studio photography for the home page. Until then the home
hero prefers a short list of the cleanest Commons photographs (plain or showroom ground, the whole
car, no other company's banners), set in `HERO_PHOTOS` in `src/components/home/home-stock.ts`, and the
body type tiles prefer a second such list, `TILE_PHOTOS`, in the same file.
Most of the library is street and motor-show photography, and it shows.

**Not built:** a stored average colour per photograph, to paint behind a slow-loading image. It
needs a field on Media, a migration and a step in the demo-photo manifest. The listing and home
photographs now load the 640px copy on a phone with a scoped preload, which shortens the empty
moment instead.

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

The proof used instead is the Rynet marketplace itself, which is real, on the same domain, and something
a dealer principal can open and judge in ten seconds.

The heading now sits as an h3 in a panel under the H2 "Judge us on a site you can open right now";
the end-to-end locator is unchanged.

**Promises in the agency copy that Ruben must confirm or change** (they are commitments, not facts
we can check in code):

- **A reply time.** "We reply within one working day" was removed from every agency page, the form
  and the server action's success message; they now say "We reply by email." Set the real figure
  here, then put it back in `agency-close.tsx`, `digital/contact/page.tsx`, `qualification-form.tsx`,
  `actions/agency-enquiry.ts` and `e2e/agency.spec.ts` together.
- **Stage durations.** "Two to three days" for the written review, "An hour" for the call and "Two
  to six weeks" for the first build were removed from `STAGES` and `NEXT_STEPS` in
  `src/components/agency/agency-content.ts`. Only "Free" and the contract term remain.
- "Month to month after three months on thirty days notice", which is a contract term shown on the
  pricing page and the agency home page.
- **One name for the marketplace: decided as "Rynet".** The agency pages used to call it "Rynet
  Showroom" (header link, hero, footer, FAQ, "Open Rynet Showroom"), the tab titles, share card and
  WebSite structured data said the same, and the marketplace itself is branded RYNET and says
  "Rynet" in every line of copy. A dealer who clicked through landed on a differently named product.
  In the September 2026 polish it became "Rynet" for the name and "the Rynet marketplace" where the
  agency needs to tell the two halves apart: the agency header and footer link read "Rynet
  marketplace", buttons say "Open the marketplace", the tab title template is "%s | Rynet", and
  `websiteJsonLd()` names the site "Rynet". If Ruben wants "Showroom" as a product name, it has to go
  on the marketplace lockup and header too, not only on the agency pages. "SHOWROOM" survives only
  as the name of the design system in `docs/DESIGN-SHOWROOM.md`, which no visitor sees.
- A WhatsApp number for Rynet Digital, if one exists. None is shown until there is one.
- Real team names for `/digital/about`, which currently says honestly who you will deal with.

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

## 10. The sell-to-a-dealer page has no valuation and unreviewed consent copy

`/sell-to-a-dealer` deliberately shows no estimated value, because Rynet holds no vehicle
valuation licence and any figure would be invented. An end-to-end test fails the build if a rand
figure appears anywhere on that page, so this cannot drift back in by accident.

**Needed, if we ever want to show a guide price:** a licensed source. TransUnion and Lightstone
both sell one. Until then the page says plainly that we do not value cars, which is honest and
also the better answer, because a wrong estimate on that page is a number somebody plans around.

**Requires legal review:** the multi-recipient consent wording, drafted against POPIA section 18
and not reviewed by an attorney. It is stored verbatim on every consent record, and a test
compares the stored evidence against the exact words on screen, so a change to one without the
other fails the build. The same review should cover the settlement explanation and the "what to
have ready" list, neither of which is legal advice and both of which a seller will treat as if it
were.

**The distribution is built** (`src/jobs/distribute-trade-ins.ts`, run from cron). What is still
missing is the notification: SMTP is not configured, so a matched dealership sees the lead when it
next looks rather than being emailed, and a seller whose car could not be placed anywhere is not
told, which this page promises they will be. Both need a mailbox before they are true.

## 11. Decisions still open

Tracked in full in `docs/QUESTIONS.md`. The ones that block content rather than code:

- Dealer verification checklist: exactly what we check and record.
- What the four agency price bands actually start at. Decided in shape: a three step
  qualification path, with the figure given on the call rather than published, until there is
  delivery history to quote from.
- Whether reviews are collected by us, imported from Google, or omitted from v1.
- Whether the trade-in estimator uses a licensed valuation source or produces a range and hands off.

## 12. Rynet's own company details

`src/content/company.ts`. Every field below is `null`, and a null field renders nothing. None of
them is in the database or anywhere else in the code, and none will be invented: a made-up
registration number or address on a verification platform is worse than a gap.

| Field | Where it appears once set | Why it matters |
|---|---|---|
| `legalName`, the registered name exactly as CIPC holds it, with "(Pty) Ltd" | Footer company line | ECT Act section 43; the Companies Act expects the registered name on the company's publications |
| `registrationNumber`, the CIPC number | Footer company line | Same. The verification page asks dealerships for theirs |
| `vatNumber`, only if registered | Footer company line | Only shown if it exists |
| `streetAddress`, a physical address someone could visit | Footer (replaces "Pretoria, Gauteng"), and the POPIA section 18 notice on `/sell-to-a-dealer` | Required by POPIA s18(1)(b) |
| `postalAddress`, if different | POPIA notice | Same |
| `phone`, a number that is answered | Footer company line | ECT Act section 43 |
| `officeHours`, when that phone is answered | Contact page | Do not set hours nobody will staff |

The footer company line renders only when name, registration number, street address and phone are
ALL set, so a half-filled identity can never ship.

## 13. Copy to restore when the demonstration data is cleared

The footer brand line used to read "Every car on Rynet comes from a registered dealership we have
checked. No private sellers, no dummy listings, no wondering who you are actually talking to." It
was untrue while every listing is demonstration data, so it now states how the platform works:
"Every dealership is checked before it can list, and private sellers cannot list at all." When real
verified dealerships are live and the seed is cleared, stronger present-tense wording can come back,
by hand, in `src/components/layout/site-footer.tsx`.

The footer's "Quick searches" row is a fixed list of makes, body types and provinces. It is not
headed "Popular searches" because nothing has measured what is popular. Once analytics exist, the
list and the heading can be driven by real search volume.

## 14. Owner decisions the September 2026 redesign surfaced

None of these is on the site as a fact. Each is either left out or described as how Rynet works.

- **VAT registration for listing dealerships.** Is it required? If so, `Dealers.vatNumber` should be
  required with South African VAT number validation, and the verification page can say so.
- **A seller response timeline.** `/sell-to-a-dealer` promises no timeline, because nobody has
  committed to one. Once decided, show it in the form, "How it works" and the success state.
- **An accessibility reply time.** The accessibility statement used to say "five working days",
  which nobody had agreed to. It was removed.
- **A retention period for sell-to-a-dealer leads.** The privacy notice has none.
- **A retention purge job.** The privacy notice claimed automatic deletion; there is no job, so the
  claim was removed. Build the job, then restore the sentence.
- **A verification decision trail.** There is no record of who approved a dealership and when
  (`verifiedBy` and `verifiedAt`, or versions on Dealers). The verification page and the home page
  no longer claim one. Build it, then say it.
- **Rynet's company street address**, which the POPIA section 18 notice needs (see section 12).
- **Dealership registration fields are editable by the dealership.** `legalName`,
  `registrationNumber`, `vatNumber` and `motorTradeNumber` on Dealers have no field-level update
  rule, so a dealership can change them after verification. A dealership profile therefore says
  "as recorded" rather than "checked by Rynet". Lock them to platform staff, then the wording can
  be stronger.
- **Suspension does not take stock down.** Vehicles stay publicly readable when their dealership
  is suspended; only publishing new stock is blocked. The verification page no longer claims
  otherwise. Filtering public vehicle reads to verified dealerships would make it true.
- **Dealership About text is not seeded.** `src/seed/data/dealers.ts` has an `about` string per
  demonstration dealership, but the seed never writes it into `aboutRichText`, so no profile shows
  an About section today. Real dealerships write their own.
- **Enquiries on demonstration listings** are still accepted (the page and dialog say the car is
  not for sale). Whether to switch enquiries off on demonstration stock is Ruben's call.
- **A dealership application form.** "List your stock" still goes to the dealer email on `/contact`.
  A proper `/list-your-stock` form with consent and rate limiting is not built.
- **A reference number on the sell-to-a-dealer confirmation**, for a seller to quote. Not built.
- **Finance teaser on listings** uses the configured defaults (a 10 percent deposit over 72 months at
  the configured rate). The rate is set in the CMS and must be a figure Ruben stands behind.
