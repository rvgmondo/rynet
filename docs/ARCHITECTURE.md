# ARCHITECTURE (proposed, Phase 0)

## 1. Shape

One Next.js 16 application. Payload 3.88 runs inside it. One deployment, one database, one auth
system, one generated type file that both the front end and the API read from.

```
src/app/
  (marketplace)/        Rynet Showroom. Consumer facing.
  (agency)/             Rynet Digital. Dealer principal facing.
  (portal)/             Dealer portal. Custom UI, scoped to one dealership.
  (payload)/admin/      Payload admin. Platform staff.
  (payload)/api/        Payload REST + GraphQL.
  api/                  Our own route handlers: search, feeds, webhooks, sitemaps.
```

Route groups give separately themeable layouts without separate deployments. The marketplace and
the agency share the token layer and share nothing else in the presentation layer: different type
scale, different density, different layout grammar.

### The dealer portal is not the Payload admin

This is the first place I depart from the obvious reading of the brief. Section 8 asks for a lead
pipeline board, a feed mapping UI with dry-run preview, drag-to-reorder galleries with client-side
compression, and SLA timers. Payload's admin is an excellent content editor and a poor application
shell. Bending it into that shape means fighting it on every screen.

So the dealer portal is a normal Next.js route group at `/portal`, built with our own component
library, talking to Payload through the **Local API** (in-process, no HTTP hop, access control
still applied). Dealers never see `/admin`. Platform staff use `/admin` for content and moderation,
plus a small set of custom admin views for the approval queue and the health dashboard.

## 2. Enforcing "only dealerships list"

Section 2 says this must hold at the schema, the API and the UI. Three layers.

**Schema.** Two separate auth collections, not one collection with a role field:

- `users` covers platform staff, agency staff and dealer staff. Every dealer-role user has a
  required `dealer` relationship.
- `buyers` covers consumers. It has no role field, no dealer field, and appears in no create or
  update access function anywhere in the vehicles config.

A buyer cannot be promoted into a seller because there is no field to promote. A private individual
who signs up gets a `buyers` record, and the write path does not exist for that collection. This is
stronger than a role check, because a role check is one bad boolean away from being wrong.

**API.** On `vehicles`:

- `access.create` returns false unless the requester is a `users` document, holds a dealer or
  platform role, and, for dealer roles, the linked dealer has `verificationStatus: verified`.
- `beforeValidate` **overwrites** `data.dealer` with the session user's dealer for dealer-role
  users, discarding whatever the client sent. That single line is what stops dealer A posting stock
  under dealer B, and it is the line the adversarial tests aim at.
- `access.read` returns a `Where` clause, not a boolean, so filtering happens inside the query.
  Public sees `status in (live, sold-within-window)`. A dealer user additionally sees their own
  drafts. Platform staff see everything.
- `access.update` and `access.delete` return `{ dealer: { equals: user.dealer } }` for dealer roles.

The same pattern applies to `leads`, `branches`, `import-jobs`, `subscriptions` and `dealer-users`.
Each gets a paired test that authenticates as dealer A, tries to read and mutate dealer B, and
asserts a 403 or an empty result set.

**UI.** No sell-your-car route exists. No consumer listing form exists. The buyer account area has
no stock section. The only route that mentions listing a vehicle is the agency site telling a dealer
to book a call.

### Row-level security in Postgres: considered, not used

Postgres RLS with `SET LOCAL app.dealer_id` per request would be a fourth layer. Rejected because
Payload pools connections and runs migrations and hooks through the same pool, so the session
variable has to be set and cleared reliably on every checkout or the isolation is worse than
useless. Payload access control already produces a real `WHERE` clause inside the query, which is
genuine row-level filtering. Defence in depth comes from the adversarial test suite instead, which
is testable, whereas RLS-that-sometimes-does-not-get-set is not.

## 3. Search

Vehicle search is the product, so it gets its own layer rather than going through the CMS API.

**Index table.** A denormalised `vehicle_index` table, one row per vehicle, maintained by a Payload
`afterChange` hook and a nightly reconciliation job. It carries every facet as a typed column
(make_id, model_id, variant_id, body_type_id, price_cents, mileage_km, year, transmission_id,
fuel_id, drivetrain_id, colour_family_id, condition, province_id, city_id, dealer_id,
dealer_group_id, franchise_ids, feature_ids, monthly_estimate_cents, published_at, geog) plus a
`tsvector` and trigram indexes on the free-text fields.

A table rather than a materialised view, because a materialised view cannot be updated
incrementally and a dealer who edits a price expects to see it in search immediately.

**Facet counts.** One round trip. A CTE builds the base filtered set, then each facet dimension is
aggregated against the base set *minus its own filter*, which is the standard semantics: ticking
"Toyota" must not collapse the make list to Toyota alone. Roughly ten `FILTER (WHERE ...)`
aggregates in one query. Zero-count options render disabled with the count shown, per Section 6.

**Geography.** PostGIS `geography` column on branches, GiST index, `ST_DWithin` for radius search.
This is part of why the database region matters below.

**Typeahead.** A deterministic parser, not a model call. Tokenise, then match in order against
taxonomy tables including South African aliases (bakkie maps to pickup, combi to MPV, double cab as
a body qualifier), price patterns (`under 300k`, `R200 000 to R300 000`, `under 5k pm` resolving to
a monthly instalment filter), and location tables. Whatever does not match falls through to full
text. No LLM in the request path: latency, cost, and a search box that returns different results for
the same query are each disqualifying. It gets a fixture corpus of real queries as unit tests, and
that corpus grows from the actual search log.

**When to add a search service.** p95 above 300ms at 50 concurrent, or 250 000 live listings.
Written down so the decision is a measurement and not a mood.

## 4. Hosting: a real fork that needs your call

South African latency decides this, and the numbers are awkward.

- **Vercel does have a Cape Town region** (`cpt1`, on AWS `af-south-1`), Pro plan and above.
  Vercel measured roughly a 50 percent TTFB reduction in South Africa after it opened.
- **Neon does not offer `af-south-1`.** Nearest is Frankfurt.
- **Supabase does not offer `af-south-1`** and has said it does not intend to.

So the default modern stack, Vercel plus Neon, puts functions in Cape Town and the database in
Frankfurt, roughly 170ms away, on a search page that issues several queries. Sub-500ms TTFB is not
reachable that way. Three honest options:

| Option | Latency | Ops burden | Cost shape |
|---|---|---|---|
| **A. Vercel Pro, functions pinned to `cpt1`, managed Postgres in AWS `af-south-1` (Aiven or RDS), media on Cloudflare R2 behind Cloudflare** | Best. App and database co-located in Cape Town. | Lowest. Per-PR preview deploys included. | Highest per month. Vercel image optimisation on a photo-heavy marketplace is the line item to watch, which is why images go to R2 with a Cloudflare loader instead. |
| **B. VPS or EC2 in `af-south-1`, Docker, Postgres alongside, Cloudflare in front** | Best, same as A. | Highest. We own patching, backups, restore drills, blue-green deploys and PR previews. | Lowest by a wide margin at scale. |
| **C. Vercel `fra1` plus Neon `eu-central-1`** | Worst. Every dynamic request crosses to Europe. Cached editorial is fine, live search is not. | Lowest. | Lowest of the managed options. |

**My recommendation is A.** The entire SEO argument in Section 13 rests on TTFB and LCP budgets
that option C cannot meet from South Africa, and option B trades money for ops time that is better
spent on the product in year one. If the monthly cost of A is the blocker, B is the right answer,
and I would build the Docker and deploy path properly rather than half of it.

## 5. Media

Vehicle photography is the dominant asset class. At 20 images per listing, 300 seed vehicles is
6 000 images, and a real launch cohort is far more. Media goes to **Cloudflare R2** through
`@payloadcms/storage-s3`, served via Cloudflare with a custom Next image loader. Uploads are
magic-byte validated, size capped, re-encoded through sharp to strip EXIF including GPS, and served
from a separate origin so a malicious upload cannot execute in the application origin.

## 6. Caching

Next 16 Cache Components (`use cache`) with explicit tags:

- Editorial, dealer microsite chrome, model hub copy: cached, tag-invalidated by Payload hooks.
- Search results: dynamic, but the facet-count query is cached 60 seconds per filter signature,
  because counts moving second to second helps nobody.
- Listing detail: cached with a tag per vehicle, busted on any write to that vehicle.
- Anything behind auth: never cached.

Build note: Next 16 replaced `middleware.ts` with `proxy.ts`, which runs on Node **behind** the CDN
cache rather than in front of it. Per-request logic has to account for that, and cache-varying logic
belongs in the route, not in proxy.

## 7. Dated decisions to revisit

| Date | Decision | Revisit when |
|---|---|---|
| 2026-08-24 | TypeScript 5.9.3, not 7.0.2 | TypeScript 7.1 ships the stable programmatic API, expected around October 2026 |
| 2026-08-24 | Postgres-only search, no Typesense | p95 search above 300ms at 50 concurrent, or 250 000 live listings |
| 2026-08-24 | No Postgres RLS. Access control plus adversarial tests instead | A second application gains write access to the same database |
| 2026-08-24 | Plausible, not GA4 | A paid media campaign needs conversion import that only GA4 can feed |
