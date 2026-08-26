# PRODUCTION READINESS

An honest audit of what stands between the current build and a site that can face the public.

Written 26 August 2026, against commit `a3801de`.

---

## The short version

**The bundle deploys. The site is not ready to be public.**

Three pages exist: the home page, `/cars`, and the Payload admin. Everything else the site links
to is a 404, including the vehicle detail page, which every one of the 311 result cards points at.
A visitor who clicks any car gets a Next.js error page.

That is not a criticism of the work so far. Phase 1 was foundation, and the search page was pulled
forward so there was something to look at. But "deployable" and "live" are different things, and
the gap is worth being precise about rather than discovering it with a dealer principal watching.

There is also no `robots.txt`, no sitemap, no favicon, no cookie consent, no privacy policy, and no
way for a buyer to contact a dealership. That last one matters most commercially: the platform
currently cannot generate a single lead, which is the entire product.

---

## P0: the site is visibly broken without these

Roughly a week of work. Nothing below this line should go public first.

### 1. The vehicle detail page

`/vehicles/[make]/[model]/[year]-[variant]-[ref]`

**Every vehicle card links here and it does not exist.** 311 listings, 311 dead links. This is the
single most damaging gap and the most valuable page on the platform: it is where a buyer decides,
where the enquiry happens, and where the `Vehicle` and `Offer` structured data lives.

Needs: gallery (placeholder treatment until photography exists), sticky price and action rail,
full spec table, finance estimate with the disclaimer, dealer card with the verified badge,
similar vehicles, breadcrumbs, and the JSON-LD.

### 2. Seventeen routes linked from the header and footer that 404

```
/dealers                    /guides            /about
/dealers/[slug]             /reviews           /contact
/finance-calculator         /news              /accessibility
/value-my-car               /digital           /privacy
/sign-in                    /terms             /how-verification-works
/dealer-login               /cars/new  /cars/demo  /cars/body/[type]
```

Two honest options: build them, or remove the links until they exist. Shipping a navigation where
two thirds of the items 404 reads as abandoned, not as early.

`/how-verification-works` is the one I would not cut. The entire product argument is "only verified
dealerships", and a badge that links nowhere is decoration.

### 3. Nothing tells a search engine anything

No `robots.txt`. No `sitemap.xml`. No canonical tags. No Open Graph image. The SEO architecture is
designed in `docs/SITEMAP.md` and none of it is implemented. Launching without this is not
neutral: Google will crawl the query-string URLs, index the thin ones, and the facet strategy
becomes harder to fix later than to do now.

### 4. No favicon, no app icons, no social image

`brand/favicon.png` is 468 KB, roughly two hundred times what a favicon should weigh. Needs a
proper generated set, and an Open Graph image, or every share looks broken.

### 5. No 404 page and no error boundary

A visitor who mistypes a URL, or hits a listing that has sold, gets Next's default. Both need
designing, and the 404 in particular should offer a search box rather than an apology.

### 6. Confirm the domain before building again

`NEXT_PUBLIC_SERVER_URL` is inlined at build time. The current bundle is built for
`https://rynet.co.za`. If the site is going anywhere else first, even briefly, it needs rebuilding
for that origin. This is the easiest thing on the list to get wrong.

---

## P1: required before real traffic, not just before dealers

### 7. The site cannot generate a lead

There is no enquiry form, no test drive request, no phone reveal, no WhatsApp link, no callback.
The `leads` and `consent-records` collections exist and nothing writes to them.

This is the commercial heart of the product and it is entirely absent. A marketplace that cannot
pass an enquiry to a dealership has no reason to exist.

### 8. Legal pages, and they are not optional

POPIA requires a privacy notice, a lawful basis for processing, and a working data subject request
route. None exist. Neither do terms of use or a cookie policy.

I can write plain-language drafts marked "requires legal review". They must not go live as final
without a South African attorney reading them. Listed in `docs/CONTENT-NEEDED.md`.

### 9. Cookie consent that actually gates

POPIA requires non-essential scripts to be blocked *before* consent, not covered by a banner over a
page that already loaded them. Currently there is no analytics at all, which is technically
compliant and practically useless. Adding Plausible is the plan; it collects no personal data and
needs no banner, which is most of why it was chosen.

### 10. No rate limiting, no bot protection

The moment a public form exists it will be found. Turnstile, a honeypot, a timing check and rate
limiting on submission all need to be in place before the form is, not after.

### 11. Email is not configured

`SMTP_HOST` is blank, so Payload logs to the console. No enquiry notification reaches anyone. Needs
a cPanel mailbox plus SPF, DKIM and DMARC on the domain, or every notification lands in spam.

### 12. No backups, and no restore drill

The entire platform is one file, `rynet.db`. There is no cron copying it anywhere, and no restore
has ever been attempted. A backup you have never restored is not a backup. Do this before there is
data worth losing, not after.

### 13. No structured data

`Vehicle`, `Offer`, `AutoDealer`, `BreadcrumbList`, `Organization`. Designed in `docs/SITEMAP.md`,
implemented nowhere. This is most of the SEO value of a marketplace.

---

## P2: before dealers are onboarded

- **Dealer microsites** at `/dealers/[slug]`. Twelve dealerships in the database with no page.
- **The dealer portal.** Currently a dealer has no way in at all. `/dealer-login` 404s.
- **Consumer accounts.** Save, saved searches, alerts. The `buyers` collection exists, unused.
- **The rest of search.** Fuel, transmission and province facets show no counts. No radius search,
  no map, no typeahead, no saved state. `/cars` is one page of what Section 6 describes.
- **Photography and R2.** Cards are spec-led because there are no images. Set the `R2_*` variables
  before the first upload, not after the account hits its inode ceiling.
- **The agency site.** `/digital` is linked from the footer and does not exist. It is the smallest
  phase and the only one that earns on its own.

---

## P3: the quality bars the brief set, currently unmet

- **Lighthouse CI is not wired.** Deliberately absent rather than passing vacuously, but the
  budgets in Section 13 are unenforced.
- **The adversarial dealer-isolation tests do not exist.** The access control is written and
  commented as testable, and it is not yet tested. This is the one I would least like to be wrong
  about, because the failure mode is one dealership reading another's leads.
- **Seven documents are missing:** `SEO.md`, `SECURITY.md`, `THREAT-MODEL.md`, `ACCESSIBILITY.md`,
  `DEPLOYMENT.md`, `RUNBOOK.md`, `CMS-GUIDE.md`, `SEO-LAUNCH-CHECKLIST.md`. The threat model was
  supposed to come before the build, and did not.
- **No unit tests.** `npm test` runs zero. The finance calculator in particular was promised
  exhaustive tests and has none, because the calculator does not exist yet either.

---

## What I would actually do

**Do not put this in front of a dealer principal yet.** One click on any car and the demonstration
is over.

Shortest credible path, in order:

1. **Vehicle detail page.** Turns 311 dead links into the best page on the site.
2. **Enquiry form, with consent, rate limiting and Turnstile.** Makes it a marketplace rather than
   a catalogue.
3. **The seventeen missing routes**, at minimum as real pages rather than 404s. `/dealers`,
   `/how-verification-works` and the legal set are the ones that carry weight.
4. **robots.txt, sitemap, canonicals, structured data, favicon.** A day, and it compounds from the
   moment the site is indexable.
5. **Backups and a restore drill.** Before there is anything worth losing.

That is the point at which the site is genuinely live rather than merely deployed. Everything in P2
follows naturally from having real dealers to build it against.

---

## What is genuinely solid already

Worth saying, because the list above is long:

- The data model is complete and the access control is correct, including the separation that makes
  private sellers structurally impossible rather than merely forbidden.
- The token system is contrast-verified in CI, with 62 pairs passing in both themes.
- The search page is properly server rendered with URL-carried state, working facet counts, sorting
  and pagination, and it is fast.
- 26 Playwright tests pass on desktop and mobile, with zero axe violations across three templates
  and no horizontal overflow from 320px to 1920px.
- The deploy path is verified end to end on a clean extract, and the five things that broke are
  fixed and written down.
- The seed is 311 believable vehicles across twelve dealerships, all labelled as demonstration
  content, with nothing fabricated that pretends to be real.

The foundation is sound. What is missing is most of the product on top of it, which is exactly
where a Phase 1 sign-off should leave things.
