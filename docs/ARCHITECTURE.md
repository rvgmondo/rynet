# ARCHITECTURE

Revised 24 August 2026 after four decisions: agency at `rynet.co.za/digital`, hosting on your
existing cPanel, PayFast for dealer billing, and a launch on seeded demonstration stock.

## 1. Shape

One Next.js 16 application. Payload 3.88 runs inside it. One deployment, one database, one auth
system, one generated type file that both the front end and the API read from. Started by
`server.cjs` under cPanel's Setup Node.js App, the same pattern as Amico and Verboten.

```
src/app/
  (marketplace)/        Rynet Showroom. Consumer facing. rynet.co.za
  (agency)/digital/     Rynet Digital. Dealer principal facing. rynet.co.za/digital
  (portal)/portal/      Dealer portal. Custom UI, scoped to one dealership.
  (payload)/admin/      Payload admin. Platform staff.
  (payload)/api/        Payload REST + GraphQL.
  api/                  Our own route handlers: search, feeds, PayFast ITN, sitemaps.
```

Route groups give separately themeable layouts without separate deployments. The marketplace and
the agency share the token layer and share nothing else in the presentation layer.

### The dealer portal is not the Payload admin

Section 8 of the brief asks for a lead pipeline board, a feed mapping UI with dry-run preview,
drag-to-reorder galleries with client-side compression, and SLA timers. Payload's admin is an
excellent content editor and a poor application shell. Bending it into that shape means fighting it
on every screen.

So the dealer portal is a normal Next.js route group at `/portal`, built with our own component
library, talking to Payload through the **Local API** (in-process, no HTTP hop, access control
still applied). Dealers never see `/admin`. Platform staff use `/admin` for content and moderation,
plus a small set of custom admin views for the approval queue and the health dashboard.

## 2. Enforcing "only dealerships list"

Three layers. The first is the one that matters.

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
- `access.update` and `access.delete` return `{ dealer: { equals: user.dealer } }` for dealer roles.

The same pattern applies to `leads`, `branches`, `import-jobs`, `subscriptions` and `dealer-users`.
Each gets a paired test that authenticates as dealer A, tries to read and mutate dealer B, and
asserts a 403 or an empty result set.

**UI.** No sell-your-car route exists. No consumer listing form exists. The buyer account area has
no stock section. `/how-verification-works` is a real page, linked from the badge on every listing.

## 3. Database: SQLite, and what that actually costs

Your cPanel's own PostgreSQL is version 10, released 2017 and long out of support, which Payload 3
does not accept. Payload supports Postgres, SQLite and MongoDB, and not MySQL or MariaDB, so the
host's MariaDB is not an option either. That leaves **SQLite**, the same choice Amico and Verboten
run on.

The config switches on the connection string, exactly as those two do, so moving to a managed
Postgres later is an environment variable and a data copy rather than a rewrite:

```ts
db: (process.env.DATABASE_URI || "").startsWith("postgres")
  ? postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })
  : sqliteAdapter({ client: { url: process.env.DATABASE_URI || "file:./rynet.db" } })
```

### I want to be straight about the ceiling

Amico is one dealership with 97 cars. Verboten is a shop. Rynet is a national marketplace with many
dealers writing concurrently, and SQLite serialises writes. It will be fine at launch and it has a
ceiling, so three things become mandatory rather than optional:

**1. Nothing writes on the read path.** View counts, lead counts and save counts are batched
in memory and flushed by a cron job, never written per request. On Postgres a counter update per
page view is merely wasteful. On SQLite it is a write lock on your busiest page, so this is the
difference between working and not.

**2. Feed imports are chunked and scheduled.** A dealer importing 500 vehicles in one transaction
blocks every other writer for its duration. Imports run in small transactions through a cron-driven
queue, off-peak by default, with progress reported to the dealer rather than a spinner.

**3. The SQL stays portable.** No SQLite-only syntax in any hand-written query. Everything is
expressed so it runs on both engines, because the migration to Postgres is a when rather than an if
if this platform works.

**The trigger to move**, written down so it is a measurement and not a mood: sustained write
contention showing as `SQLITE_BUSY` in the logs, or more than roughly 25 dealers actively managing
stock, or p95 search above 300ms. At that point the answer is managed Postgres in AWS `af-south-1`,
which is in the same country as your host, so the added round trip is small.

### Two host questions I need answered before Phase 1

Both are genuinely load-bearing and I cannot check them from here:

- **Is the home directory on local disk or NFS?** SQLite's file locking is safe on local disk and
  unsafe on NFS. Almost every cPanel host uses local disk, but "almost every" is not good enough
  for the file that holds every dealer's stock.
- **Does Passenger run one Node process or several?** Several processes writing one SQLite file is
  fine in WAL mode on local disk, and it also means the in-memory caches and the counter buffer are
  per-process, which changes how the flush job has to work.

## 4. Search

Vehicle search is the product, so it gets its own layer rather than going through the CMS API.

**Index table.** A denormalised `vehicle_index` table, one row per vehicle, maintained by a Payload
`afterChange` hook and a nightly reconciliation job. Every facet is a typed column, so the query
planner can use real indexes rather than digging through JSON.

**Facet counts.** One round trip. A CTE builds the base filtered set, then each facet dimension is
aggregated against the base set *minus its own filter*, which is the standard semantics: ticking
"Toyota" must not collapse the make list to Toyota alone. SQLite supports `FILTER (WHERE ...)`
aggregates, so this is the same query shape on both engines.

**Geography without PostGIS.** SQLite has no PostGIS, so radius search uses an R-tree index over a
latitude and longitude bounding box, then an exact haversine filter over the survivors. This is
precisely the bounding-box-then-haversine pattern in MotoHubSA's `geo.ts`, which is why that file
moved from a nice-to-have in the reference notes to a load-bearing piece of the design.

**Text without pg_trgm.** SQLite has no trigram operator, so fuzzy matching comes from FTS5 with
prefix indexes rather than similarity scoring. In practice this costs less than it sounds, because
the typeahead does its real work in the parser below rather than in the fuzzy match.

**Typeahead.** A deterministic parser, not a model call. Tokenise, then match in order against
taxonomy tables including South African aliases (bakkie maps to pickup, combi to MPV, double cab as
a body qualifier), price patterns (`under 300k`, `R200 000 to R300 000`, `under 5k pm` resolving to
a monthly instalment filter), and location tables. Whatever does not match falls through to FTS5.
No model in the request path: latency, cost, and a search box that returns different results for
the same query are each disqualifying. It gets a fixture corpus of real queries as unit tests, and
that corpus grows from the actual search log.

## 5. Hosting and deployment

cPanel, Setup Node.js App, Passenger, started by `server.cjs`. **Node 22**, because that is what
your cPanel offers and Next 16 requires 20.9 or above. Not Node 24, which is the current LTS but
is not on the host.

`server.cjs` carries the same thread-pool caps as Amico's, and they matter more here, not less:
CloudLinux reports dozens of cores on a shared box while capping your process count, so `sharp`,
the SQLite client and libuv each try to spawn a thread per core and hit the ceiling.

**The build never runs on the server.** Next 16 with Turbopack needs considerably more memory than
the Vite build that already fails on CloudLinux. Build locally, ship `.next` in the deploy bundle,
and run only `npm install` on the host. That is the Verboten pattern and it is the only one that
works reliably here.

**No per-pull-request preview deployments.** That is a real loss against the brief, which asks for
them, and there is no way to have them on this host. The substitutes: CI builds and tests every
pull request including axe and Lighthouse against a local production build, and a second cPanel
Node app on `staging.rynet.co.za` running the same bundle before anything reaches production.

**Cloudflare in front**, as MotoHubSA already does. It gives the CDN cache the host does not, plus
WAF, rate limiting, Turnstile for the public forms, and R2 for media. It also gives real-IP
handling, which needs the correct header extraction on our side or every rate limit and audit log
entry records Cloudflare's address instead of the visitor's.

## 6. Media

Vehicle photography is the dominant asset class. Twenty images per listing is 6 000 files for the
300 seed vehicles alone, and a real dealer cohort is far more. Amico keeps media on the cPanel disk
and that is right for one dealership with 97 cars. It is wrong here: shared hosting caps both disk
quota and inode count, and tens of thousands of small files will hit the inode ceiling before the
disk one.

Media goes to **Cloudflare R2** through `@payloadcms/storage-s3`, served via Cloudflare with a
custom Next image loader. Uploads are magic-byte validated, size capped, re-encoded through sharp to
strip EXIF including GPS, and served from a separate origin so a malicious upload cannot execute in
the application origin.

This keeps the cPanel disk holding one thing that matters: `rynet.db`. Which makes the backup story
a single file, and the restore drill genuinely simple.

## 7. Billing: PayFast

PayFast, as you chose. It does support recurring billing, through Subscriptions and through
Tokenisation for ad-hoc amounts, with an API to update, pause, cancel and query. Verboten already
has a working PayFast integration with signature generation and ITN webhook handling, so
`src/lib/payments/payfast.ts` and the notify route port across rather than being written again.

Two things to know going in, neither of which is a reason to change:

- **PayFast recurring billing is credit card only.** No debit order and no recurring EFT. Some
  dealer principals will want a debit order for a monthly plan, and the answer will be a card or a
  manual invoice.
- **The ITN webhook is the source of truth**, not the browser redirect. Subscription state changes
  on the webhook, validated by signature and by a server-to-server confirmation call, never on the
  customer landing back on a success page.

## 8. Caching

Next 16 Cache Components (`use cache`) with explicit tags:

- Editorial, dealer microsite chrome, model hub copy: cached, tag-invalidated by Payload hooks.
- Search results: dynamic, but the facet-count query is cached 60 seconds per filter signature.
- Listing detail: cached with a tag per vehicle, busted on any write to that vehicle.
- Anything behind auth: never cached.

Two cPanel-specific notes. The default cache handler is in-process, so if Passenger runs several
workers the cache is per-worker and a tag invalidation only clears one of them. If that is the case
we either pin to one worker or add a small shared cache handler backed by the same SQLite file.
And Next 16 replaced `middleware.ts` with `proxy.ts`, which runs on Node behind the cache rather
than in front of it, so cache-varying logic belongs in the route.

## 9. Dated decisions to revisit

| Date | Decision | Revisit when |
|---|---|---|
| 2026-08-24 | SQLite, not Postgres | `SQLITE_BUSY` appears under normal load, or roughly 25 dealers are actively managing stock, or p95 search exceeds 300ms. Then managed Postgres in AWS af-south-1 |
| 2026-08-24 | TypeScript 5.9.3, not 7.0.2 | TypeScript 7.1 ships the stable programmatic API, expected around October 2026 |
| 2026-08-24 | Node 22, not 24 LTS | The host offers a newer line |
| 2026-08-24 | No Postgres RLS. Access control plus adversarial tests instead | The database moves to Postgres and a second application gains write access |
| 2026-08-24 | Plausible, not GA4 | A paid media campaign needs conversion import that only GA4 can feed |
| 2026-08-24 | Media on R2, not the cPanel disk | Never. The inode ceiling is not negotiable at marketplace scale |
