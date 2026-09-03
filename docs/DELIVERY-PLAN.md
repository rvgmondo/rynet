# DELIVERY PLAN

Ten phases, as briefed, with two changes I want to argue for. Each phase stops for your review.
"Done" below means evidenced, not asserted: the checks named are the checks that must pass.

## Two changes to the phase order

**1. Split SEO out of Phase 7 and move most of it into Phases 3 and 4.**
Phase 7 as written treats SEO as a pass over finished pages. It is not. Server rendering, URL
shape, canonical rules, breadcrumbs and structured data are decisions made while a template is
built, and retrofitting them means rebuilding the template. What genuinely belongs in a later
phase is sitemap generation, the redirect map import from any old site, Search Console setup and
the launch checklist. So: SEO architecture ships inside each template phase, and Phase 7 becomes
"SEO operations and cutover", which is a smaller, real phase.

**2. Add a Phase 1b: the component library, reviewed on its own, before any page is assembled.**
Your working rule says "show me the component before the page". That needs somewhere to live. Phase
1b delivers a running component gallery at `/dev/components` (dev-only route, stripped from
production) showing every primitive in every state, in both themes, at 320px and 1440px, with its
axe result inline. You approve the primitives there, once, rather than re-litigating a button inside
a search page review.

---

## Phase 1: Foundation

Repo, pnpm workspace, Biome, Husky, commitlint, GitHub Actions, portable Postgres for local dev
matching your Amico and Verboten pattern, Payload wired into Next 16, argon2id auth with the two
separate auth collections, the token file, and the theme system.

**Done when:** a clean machine runs `npm install && npm run dev` and reaches a themed page and a
working `/admin` login in under ten minutes following `README.md` only. CI runs typecheck, lint,
and an empty-but-green test suite on a pull request. `docs/contrast-report.md` is generated and
committed with every pair passing. `docs/STACK.md` and `docs/THREAT-MODEL.md` exist. A deploy
bundle builds locally and starts under `server.cjs`, and `staging.rynet.co.za` is running it.

Note against the brief: this host cannot do per-pull-request preview deployments. CI compensates by
building and testing every pull request against a local production build, and the staging Node app
is the shared preview. That is a real gap and it is stated rather than glossed.

## Phase 1b: Component library

Every primitive: button, link, input, select, combobox, checkbox, radio, switch, slider, range
slider, date field, tabs, accordion, dialog, drawer, popover, tooltip, toast, table, pagination,
badge, chip, avatar, breadcrumb, skeleton, empty state, error state, card, gallery, lightbox.

**Done when:** `/dev/components` renders all of them in all nine states, light and dark, and:
zero axe violations; every one operable by keyboard alone with visible focus on both themes; every
touch target 44px or larger; screen reader pass recorded for dialog, combobox, tabs, slider and
lightbox with NVDA and VoiceOver; `prefers-reduced-motion` verified on every animated primitive.
Visual regression baselines captured.

## Phase 2: Content model and admin

All collections, globals, taxonomies and access functions. The block library. Drafts, autosave,
version history with diff and restore, scheduled publish and unpublish. Live preview rendering the
real templates. Form builder. Media library with alt enforcement, focal points and usage tracking.
Redirect manager. SEO field group and template system. Localisation structure.

**Done when:** the adversarial dealer-isolation test suite exists and passes for every scoped
collection. A non-technical person creates a page, adds five block types, uploads an image, cannot
publish it without alt text, schedules it, and rolls it back, following `docs/CMS-GUIDE.md` only,
with me not in the room. Migrations are checked in, forward and reversible, and a down-then-up
round trip is verified.

## Phase 3: Marketplace public

Search with all facets, instant counts, URL state, map view, restorable state and server-rendered
first paint. Listing detail with gallery, sticky rails, finance calculator, trade-in estimator,
spec tables, dealer card and similar vehicles. Dealer microsites. Comparison. Consumer accounts,
saved vehicles, saved searches and alerts.

This is the biggest phase by a wide margin. I would like to break the review into three: search,
then listing detail, then microsites and accounts.

**Done when:** Lighthouse 95 or above on all four categories, mobile, on home, search, listing,
dealer and one editorial page. LCP under 2.0s, INP under 200ms, CLS under 0.05, TTFB under 500ms at
p75 on a throttled mid-tier mobile profile, enforced in CI. Initial-route JavaScript under 150KB
gzipped. Zero axe violations. Finance calculator unit tests exhaustive against a hand-checked table
including balloon, zero deposit, and the maximum term. `Vehicle`, `Car`, `Offer`, `AutoDealer`,
`BreadcrumbList` JSON-LD validating clean in the Rich Results Test. Search load tested at realistic
concurrency with the numbers recorded.

## Phase 4: Agency site

Home, seven service pages with real substance, case study template, pricing or qualification path,
about, team, process, insights with category and author archives, gated resources, multi-step
qualification form with progress and save-and-resume, calendar booking, and the separated dealer
login entry point.

**Done when:** same Lighthouse and axe bars. The multi-step form is fully keyboard operable, its
progress is announced, a half-finished submission survives a browser close and reopen, and no step
one is a wall of fields. `Service`, `Article`, `FAQPage`, `Organization` structured data validating.
Every placeholder metric is listed in `docs/CONTENT-NEEDED.md` and no unverified number is rendered
to the public.

## Phase 5: Dealer portal

Dashboard, stock management with bulk operations, gallery reordering with a keyboard path, bulk
import with mapping UI and dry-run preview and rollback, lead inbox with pipeline and SLA timers,
branches, hours, team, microsite settings, reports, billing, users.

The second-biggest phase, and the one carrying the most real-world risk, because South African
stock feeds are not standardised. There is no common XML schema between DMS vendors here, so the
mapping UI is not a nice-to-have, it is the feature.

**Changed by the launch decision.** With no dealers signed yet, there is no real feed to build
against, and building an importer against an imagined schema is guaranteed rework. So this phase
inverts its priorities:

1. **Manual stock capture first**, including the licence disc reader ported from MotoHubSA: the
   dealer photographs the disc, the PDF417 barcode decodes (with OCR as fallback), and the VIN,
   plate, make, model, colour and disc expiry prefill the form. For a dealer with no feed, which is
   every dealer on day one, this is the fast path, and it is a better demo than an importer.
2. **The importer is built format-agnostic**, against a fixture set I write covering the shapes
   these feeds actually take: flat CSV, nested XML, one-row-per-image, one-column-per-image,
   prices as text with an R prefix, dates in three formats, and duplicate VINs.
3. **It stays unvalidated until a real feed exists.** I will say so in the docs rather than
   claiming it works. The first real feed becomes a small follow-up phase, not a surprise.

**Done when:** stock capture works end to end, disc reader included, with a keyboard path for
gallery reordering per WCAG 2.2 SC 2.5.7. Dry run reports created, updated and archived counts
correctly against every fixture shape above. Rollback restores the previous state exactly. Imports
run chunked through the cron queue and do not block other writers, verified by running an import
while a second dealer saves a listing. Dealer isolation tests still green.

## Phase 6: Admin operations

Dealer approval queue with verification checklist and audit trail. Listing moderation with
configurable rules and a review queue. Taxonomy management with merge and alias handling. Plan and
pricing configuration. Global lead view and routing. Feature flags. Users and roles. Audit log.
Health dashboard. **PayFast billing**, since you have chosen to ship it.

**Done when:** merging two makes rewrites every reference and writes the redirects, verified on a
seeded duplicate. The audit log records actor, action, before and after, and IP for every privileged
action, and has no update or delete path for anyone including platform admin. Moderation rules catch
a seeded set of bad listings.

On billing specifically: a full subscription lifecycle runs against PayFast sandbox, then once with
a real low-value charge as Verboten's deploy doc does. Signup, first charge, a failed renewal moving
the dealer to `past_due`, a pause, a resume, a cancel, and the listing limit enforcing itself when a
subscription lapses. Every state change comes from a signature-verified ITN webhook, confirmed
server to server, with the raw payload stored before it is acted on. A replayed ITN is rejected. The
browser redirect changes nothing.

## Phase 7: SEO operations and cutover

Sitemap generation and chunking, `robots.txt` matching the documented rules, `resolveIndexRules`
tested against a route table, redirect map import, sold-listing lifecycle, hreflang scaffolding,
Search Console and Bing verification, analytics with consent gating.

**Done when:** `docs/SEO.md` describes the rules and a test asserts the implementation matches the
document route by route. Sitemaps generate, chunk and carry accurate `lastmod`. A sold listing
follows its full lifecycle in an accelerated test.

## Phase 8: Motion, polish, empty and error states

The motion system applied: entrance animations, View Transitions on route change, shared element on
card-to-detail and thumbnail-to-lightbox, layout animation on filter results, skeletons, optimistic
saves, route progress, stat counters. Every empty and error state designed rather than defaulted.

**Done when:** the whole site is walked with `prefers-reduced-motion: reduce` enabled and nothing is
broken, hidden or unreachable. Every animation runs on transform and opacity only, verified in
DevTools. Frame budget held on a mid-range Android. No animation above the fold delays first
meaningful paint. Every list, table and async surface has a designed empty state and a designed
error state naming the next action.

## Phase 9: Hardening

Security review against `docs/THREAT-MODEL.md`. Full accessibility audit. Performance tuning. Load
test. POPIA implementation verified end to end.

**Done when:** an external header scanner returns clean and the report is committed. CSP is strict
with nonces and no `unsafe-inline`. The adversarial authorisation suite passes. A data subject
access request and a deletion request both work end to end and the deletion actually removes the
data. The retention schedule purges automatically and is tested against seeded expired records.
Rate limiting and lockout verified. A dependency audit is clean and gated in CI. Manual screen
reader results documented for search, listing, enquiry, dealer login and stock creation.

## Phase 10: Launch prep

Seed content, all documentation, runbook, restore drill, cutover checklist.

**Changed by the launch decision.** Seed data is no longer test scaffolding, it is the launch
content. It is what a dealer principal sees when you show them the platform, so it has to survive
that scrutiny: 12 or more dealers across Gauteng, the Western Cape and KwaZulu-Natal, 300 or more
vehicles across makes actually sold here, believable rand prices and mileages, real branch addresses
that geocode, trading hours that make sense, and photography that does not look like placeholder
art. Every fictional dealer name, review and metric is listed in `docs/CONTENT-NEEDED.md` and
labelled in the UI as demonstration stock. We do not put invented dealers on a live site pretending
to be real businesses.

**Done when:** the full `docs/` set exists. The seed passes the demo test above. A
restore-from-backup drill has been run and written up with timings, restoring `rynet.db` and
confirming R2 media still resolves. `docs/SEO-LAUNCH-CHECKLIST.md` and `docs/RUNBOOK.md` are
complete. Every item in Section 17 is ticked with evidence attached.

---

## Sequencing, now that there are no dealers yet

This is a large platform. Phases 3 and 5 together are more work than 1, 2, 4, 6 and 7 combined.
With no dealers signed, the ordering question changes shape: the constraint is no longer a launch
date, it is that **you need something to show a dealer principal before you can sign one.**

That argues for a specific order:

1. **Phase 4, the agency site, moves up.** It is the smallest phase, it does not depend on the
   marketplace existing, and it is the only one that can produce revenue on its own. It is also
   what you send a dealer principal first.
2. **Then Phase 3, the marketplace, on seeded stock.** A working search over 300 believable
   vehicles across 12 dealers is the demo. It sells the platform far better than a slide.
3. **Then Phase 5, the portal**, built against the behaviour of the first real dealers rather than
   against guesses, with the feed importer validated on their actual feeds.

The cost of moving the agency site up is that its case studies have no real metrics yet, because
there are no clients. That is handled by the `metricsVerified` flag in the content model: an
unverified case study renders the narrative and hides the numbers. It never shows an invented one.

I have not reordered anything yet. Say the word and the delivery plan renumbers to 1, 1b, 2, 4, 3,
5, 6, 7, 8, 9, 10.
