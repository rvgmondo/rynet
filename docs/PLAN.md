# RYNET: PHASE 0 PLAN

Prepared 24 August 2026, revised the same day after four decisions. No application code written
yet, as briefed.

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
Marketplace      Rynet Showroom          rynet.co.za
Agency           Rynet Digital           rynet.co.za/digital
Market           South Africa, ZAR, en-ZA, +27, POPIA
HQ               Pretoria, Gauteng
Positioning      More Test Drives. More Sales.
Colours          #E32432 red, #001123 navy, #B1B4BB silver
Logo             brand/ (five lockups, icon, favicon)
```

The mark is a tachometer arc sweeping silver into red, needle forming the crossbar of an R, motion
streaks trailing. Two lockups: navy for light grounds, silver gradient for dark. Tagline in the mark
reads "Success is the destination".

## Decisions taken

| Question | Answer |
|---|---|
| Domain | Marketplace on the apex, agency at `/digital` |
| Hosting | Your existing cPanel with Node, as with Amico and Verboten |
| Billing | PayFast, shipping in v1 |
| Launch stock | No dealers yet, launching on seeded demonstration stock |

## What the hosting decision cost, honestly

cPanel is the right call for where this business is today, and it is not free. Four things changed:

**SQLite instead of Postgres.** Your cPanel's PostgreSQL is version 10, which Payload 3 does not
support, and Payload does not support MariaDB at all. So SQLite, the same as Amico and Verboten,
with the adapter switching on the connection string so the move to Postgres is later a config change
rather than a rewrite. It will be fine at launch. It has a ceiling, and the trigger to move is
written down: `SQLITE_BUSY` under normal load, or roughly 25 dealers actively managing stock, or p95
search above 300ms.

**Three things become mandatory rather than nice-to-have.** Nothing writes on the read path, so view
counters are buffered and flushed by cron rather than written per page view. Feed imports run
chunked through a queue rather than as one long transaction. And no hand-written SQL uses
SQLite-only syntax, because the Postgres migration is a when rather than an if.

**No PostGIS and no pg_trgm.** Radius search becomes an R-tree bounding box plus an exact haversine
filter, which is exactly MotoHubSA's `geo.ts` pattern, so that file moves from optional reuse to
load-bearing. Fuzzy text becomes FTS5 prefix search, which matters less than it sounds because the
typeahead does its real work in a deterministic parser.

**No per-pull-request preview deployments.** The brief asks for them and this host cannot do them.
The substitute is CI building and testing every pull request against a local production build, plus
a staging Node app on a subdomain. That is a genuine gap and I would rather name it than gloss it.

Two host questions now block Phase 1, and both take one support ticket: **is the home directory on
local disk or NFS** (SQLite locking is unsafe on NFS, and if it is NFS then SQLite is off the table),
and **does Passenger run one Node process or several** (it changes how the counter flush and the
cache invalidation have to work).

## The other things I want to flag

**1. I am not taking the newest TypeScript, and the brief told me to.** TypeScript 7.0 is stable and
roughly ten times faster, and it dropped the JavaScript compiler API that Next needs, so Next 16.3
only supports it behind an experimental flag and typescript-eslint has declined to support it at
all. 7.1 fixes this around October 2026. Taking 5.9.3 now, with the revisit date written down.

**2. Your brand red fails contrast in two places, and I have the numbers.** `#E32432` on white is
4.60 to 1, which passes AA body text by 0.10, too thin to build on. On your navy it is 4.13, which
fails. And `#B1B4BB` silver on white is 2.08, which fails everything including the 3:1 minimum for
interactive boundaries. Not a problem, it just means the palette needs a proper ramp: red-600 for
link text, red-300 for accents on dark, and silver demoted to a dark-theme text colour and a
light-theme decorative rule. Full computed table in the design system doc.

**3. Poppins is the wrong body face for this product.** Fine as display, wrong at 14px in a spec
table, a facet rail or a lead pipeline, and it has no useful tabular figures on a platform that is
mostly numbers. Montserrat for display, Inter for interface and numerals, Poppins for the agency
site's large marketing type. Argued properly in the design doc. **This is the last design question
standing and it gates Phase 1b.**

**4. The dealer portal should not be the Payload admin.** A pipeline board, a feed mapping UI with
dry-run preview and drag galleries is an application, not a content editor. Own route group, Payload
Local API, so the access control still applies without fighting the admin shell.

**5. SEO cannot be Phase 7.** Server rendering, URL shape, canonicals and structured data are
decisions made while a template is built. SEO architecture moves into Phases 3 and 4, and Phase 7
becomes sitemaps, redirects, cutover and Search Console.

**6. PayFast holds up, with one caveat.** It does support recurring billing, through Subscriptions
and Tokenisation, with an API to update, pause, cancel and query, and Verboten's integration ports
across. The caveat: PayFast recurring is credit card only, no debit order, and some dealer principals
will want a debit order for a monthly plan.

**7. With no dealers signed, I think the agency site should move ahead of the marketplace.** It is
the smallest phase, it does not depend on the marketplace existing, it is the only one that earns on
its own, and it is what you send a dealer principal first. Reasoning at the end of the delivery plan.
I have not reordered anything yet.

## The one hard rule, and how it is enforced

Only verified dealerships list. Never private sellers. Three layers, and the first is the one that
matters:

Consumers are a **different auth collection** (`buyers`) from staff and dealers (`users`). A buyer
has no role field and no dealer field, so there is nothing to escalate. The write path for vehicles
does not reference that collection anywhere in the config. On top of that,
`vehicles.access.create` requires a verified dealer, and a `beforeValidate` hook overwrites the
dealer field with the session user's own dealer, discarding whatever the client sent. That single
line is what stops dealer A posting under dealer B, and it is what the adversarial test suite aims
at.

And it is visible in the product, not just the code: `/how-verification-works` is a real page
explaining what we check, linked from the verified badge on every listing.

## What I need next

Read [QUESTIONS.md](QUESTIONS.md). Two host questions block Phase 1 and take one support ticket. The
typeface call gates the component library. The rest can be answered as we go.

Nothing gets built until you approve this.
