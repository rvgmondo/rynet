# RYNET: PHASE 0 PLAN

Prepared 24 August 2026. No application code written yet, as briefed.

| Deliverable | Where |
|---|---|
| 1. Clarifying questions | [QUESTIONS.md](QUESTIONS.md) |
| 2. Proposed architecture and where I disagree | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 3. Content model | [CONTENT-MODEL.md](CONTENT-MODEL.md) |
| 4. Sitemap and URL structure | [SITEMAP.md](SITEMAP.md) |
| 5. Design directions and tokens | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) |
| 6. Phased delivery plan | [DELIVERY-PLAN.md](DELIVERY-PLAN.md) |
| 7. Version-pinned stack | [STACK.md](STACK.md) |
| Reference project audit | [REFERENCE-NOTES.md](REFERENCE-NOTES.md) |

## Brand

```
Brand            Rynet
Marketplace      Rynet Showroom
Agency           Rynet Digital
Domain           rynet.co.za
Market           South Africa, ZAR, en-ZA, +27, POPIA
HQ               Pretoria, Gauteng
Positioning      More Test Drives. More Sales.
Colours          #E32432 red, #001123 navy, #B1B4BB silver
Logo             brand/ (five lockups, icon, favicon)
```

Logo assets copied from your desktop into `brand/`. The mark is a tachometer arc sweeping silver
into red, needle forming the crossbar of an R, motion streaks trailing. Two lockups: navy for light
grounds, silver gradient for dark. Tagline in the mark reads "Success is the destination".

## The seven things I want to flag before you read the detail

**1. Stripe is not an option.** It does not support South African registered entities for ZAR
settlement or Connect payouts. If dealer subscriptions ship, it is Peach Payments or Paystack. The
brief assumed otherwise, so this needs a decision rather than an assumption.

**2. Hosting is a genuine fork with no free answer.** Vercel has a Cape Town region. Neon and
Supabase do not have any African region. So the obvious stack puts your database roughly 170ms from
your functions, which makes the sub-500ms TTFB budget in Section 13 unreachable. Three options with
costs are in the architecture doc. My recommendation is Vercel `cpt1` with Postgres in AWS
`af-south-1`.

**3. I am not taking the newest TypeScript, and the brief told me to.** TypeScript 7.0 is stable and
roughly ten times faster, but it dropped the JavaScript compiler API that Next needs, so Next 16.3
only supports it behind an experimental flag, and typescript-eslint has declined to support it at
all. TypeScript 7.1 fixes this around October 2026. Taking 5.9.3 now, with the revisit date written
down.

**4. Your brand red fails contrast in two places, and I have the numbers.** `#E32432` on white is
4.60 to 1, which passes AA body text by 0.10, too thin to build on. On your navy it is 4.13, which
fails. And `#B1B4BB` silver on white is 2.08, which fails everything including the 3:1 minimum for
interactive boundaries. None of this is a problem, it just means the palette needs a proper ramp:
red-600 for link text, red-300 for accents on dark, and silver demoted to a dark-theme text colour
and a light-theme decorative rule. Full computed table in the design system doc.

**5. Poppins is the wrong body face for this product.** It is a fine display face and it is wrong at
14px in a spec table, a facet rail or a lead pipeline, and it has no useful tabular figures on a
platform that is mostly numbers. I want Montserrat for display, Inter for interface and numerals,
and Poppins kept for the agency site's large marketing type. Argued properly in the design doc, and
I will build it your way if you disagree.

**6. The dealer portal should not be the Payload admin.** A pipeline board, a feed mapping UI with
dry-run preview and drag galleries is an application, not a content editor. It goes in its own route
group using Payload's Local API, so we get the access control without fighting the admin shell.

**7. SEO cannot be Phase 7.** Server rendering, URL shape, canonicals and structured data are
decisions made while a template is built. Retrofitting them means rebuilding the template. SEO
architecture moves into Phases 3 and 4, and Phase 7 becomes sitemaps, redirects, cutover and Search
Console, which is a real and smaller phase.

## The one hard rule, and how it is enforced

Only verified dealerships list. Never private sellers. Three layers, and the first is the one that
matters:

Consumers are a **different auth collection** (`buyers`) from staff and dealers (`users`). A buyer
has no role field and no dealer field, so there is nothing to escalate. The write path for vehicles
does not reference that collection anywhere in the config. On top of that, `vehicles.access.create`
requires a verified dealer, and a `beforeValidate` hook overwrites the dealer field with the session
user's own dealer, discarding whatever the client sent. That single line is what stops dealer A
posting under dealer B, and it is what the adversarial test suite aims at.

And it is visible in the product, not just the code: `/how-verification-works` is a real page
explaining what we check, linked from the verified badge on every listing.

## What I need from you

Read [QUESTIONS.md](QUESTIONS.md). Four of the sixteen block the foundation: the domain split,
hosting, whether billing ships in v1, and where launch stock comes from. The rest can be answered as
we go, but sooner is cheaper.

Nothing gets built until you approve this.
