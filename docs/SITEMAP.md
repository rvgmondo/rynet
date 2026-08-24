# SITEMAP AND URL STRUCTURE (proposed, Phase 0)

Two front doors. The domain split is open question 1 and this document assumes the recommendation:
marketplace on the apex, agency in a `/digital` subfolder.

## Why the marketplace gets the apex

The marketplace will carry tens of thousands of indexable URLs and is the only side of the business
that can build real domain authority. The agency site is a handful of pages whose job is booked
calls, and it benefits from sitting inside that authority rather than starting from zero on its own
domain. Dealers browsing stock are the agency's warm pipeline, so a same-domain path also keeps the
click cheap.

The alternative, `digital.rynet.co.za`, is a subdomain and Google treats it as a separate site for
most purposes. That costs the agency the authority it would otherwise inherit. If you want the
agency to feel like its own company, say so and I will build it that way, but it is a real trade.

## Marketplace: rynet.co.za

### Facet landing pages: the only indexable filter URLs

The pattern is borrowed from what actually works in this market. Cars.co.za indexes exactly ten
facet shapes and blocks everything else in `robots.txt` (`/usedcars/*/*/*/*/`, `/*?sort=`,
`/*?page=`, `/*?filter=`, `/*?search=`). We do the same thing, deliberately, with our own shapes:

```
/cars                                            all live stock
/cars/[make]                                     /cars/toyota
/cars/[make]/[model]                             /cars/toyota/hilux          <- model hub
/cars/[make]/[model]/[variant]                   /cars/toyota/hilux/2-8-gd-6-raider
/cars/in/[province]                              /cars/in/gauteng
/cars/in/[province]/[city]                       /cars/in/gauteng/pretoria
/cars/in/[province]/[make]                       /cars/in/gauteng/toyota
/cars/in/[province]/[city]/[make]                /cars/in/gauteng/pretoria/toyota
/cars/in/[province]/[city]/[make]/[model]        /cars/in/gauteng/pretoria/toyota/hilux
/cars/body/[body-type]                           /cars/body/bakkie
/cars/in/[province]/body/[body-type]             /cars/in/gauteng/body/bakkie
/cars/fuel/[fuel-type]                           /cars/fuel/diesel
/cars/new   /cars/demo   /cars/used
```

Everything else is a query string on the nearest landing page and is `noindex, follow`:
`/cars/toyota/hilux?transmission=automatic&maxPrice=450000&sort=price_asc`.

Three rules make this work:

1. `in`, `body`, `fuel`, `new`, `demo`, `used`, `under`, `near` are reserved slugs. No make may take
   them. Validated on the `makes` collection.
2. A facet landing page with **zero live stock** returns `noindex, follow` and shows the nearest
   populated parent plus alternatives, rather than 404ing. Stock comes and goes; the URL should not.
3. `/cars/[make]/[model]` is both the search results page and the model hub. One page, one canonical,
   live stock count and price range at the top, editorial and spec guidance below. Splitting these
   into `/cars/toyota/hilux` and `/research/toyota/hilux` is how sites cannibalise their own best
   query, so we do not.

Index eligibility is one function, `resolveIndexRules(route, context)`, in `src/lib/seo/`, unit
tested against a table of routes. It is not scattered `<meta>` tags. Documented in `docs/SEO.md`.

### Listing detail

```
/vehicles/[make]/[model]/[year]-[variant]-[publicRef]
/vehicles/toyota/hilux/2023-2-8-gd-6-raider-4x4-at-rn48213
```

`publicRef` is a short stable Crockford base32 id, not the database id and not the dealer's stock
number, because dealers change stock numbers. Any change to make, model, variant or year writes a
301 automatically.

Sold listings keep the URL with a clear sold state and strong similar-vehicle links for 90 days,
then 301 to `/cars/[make]/[model]`. That window is a setting, not a constant.

### Dealers

```
/dealers                                    directory
/dealers/in/[province]                      /dealers/in/gauteng
/dealers/in/[province]/[city]
/dealers/franchise/[franchise]              /dealers/franchise/toyota
/dealers/group/[group]
/dealers/[slug]                             microsite home
/dealers/[slug]/stock                       their stock, own filtered search
/dealers/[slug]/about
/dealers/[slug]/branches                    list
/dealers/[slug]/branches/[branch]           per branch, LocalBusiness schema, map, hours, directions
/dealers/[slug]/team
/dealers/[slug]/reviews
/dealers/[slug]/offers
/dealers/[slug]/contact
```

### Editorial

```
/news        /news/[slug]        /news/category/[slug]
/reviews     /reviews/[slug]
/guides      /guides/[slug]
/authors/[slug]
/compare/[a]-vs-[b]              editorial comparisons, indexable
```

### Tools and utility

```
/compare?v=ref1,ref2,ref3        live comparison, noindex
/finance-calculator
/value-my-car                    trade-in estimator, feeds a lead
/search                          typeahead landing, noindex
```

### Accounts and auth

```
/sign-in            buyers
/create-account     buyers
/dealer-login       clearly separate entry point, links to /portal
/account/*          saved, alerts, enquiries, preferences, data export, deletion. noindex + disallow
```

### Legal and trust

```
/privacy   /terms   /popia   /cookies   /accessibility   /security   /disclosure
/how-verification-works        the trust proposition, made into a real page
```

`/how-verification-works` is not decoration. "Only verified dealerships" is the whole product
argument, so it gets a page that explains what we check, links from the badge on every listing, and
carries the badge's `title` text.

## Agency: rynet.co.za/digital

```
/digital
/digital/services
/digital/services/dealership-websites
/digital/services/stock-feeds-and-inventory
/digital/services/paid-media
/digital/services/seo-and-local-search
/digital/services/photography-and-video
/digital/services/crm-and-lead-routing
/digital/services/reporting
/digital/work                     /digital/work/[slug]
/digital/pricing                  or /digital/how-we-price, see open question 4
/digital/about   /digital/team   /digital/process
/digital/insights                 /digital/insights/[slug]   /digital/insights/category/[slug]
/digital/resources                /digital/resources/[slug]
/digital/contact                  multi-step qualification form
/digital/book                     embedded calendar
/digital/careers                  /digital/careers/[slug]
```

Each service page is a real page: the dealer problem in dealer language, what we actually do, what
it costs to not do it, what the dealer has to supply, how long it takes, and proof. Not a stub.

## Portal and admin

```
/portal/*      dealer portal. noindex, disallow, auth required
/admin/*       Payload. noindex, disallow, auth required, 2FA for platform_admin
```

## Sitemaps

Split by type, chunked at 45 000 URLs, regenerated on write via tag invalidation, all referenced
from `robots.txt`:

```
/sitemap.xml                       index
/sitemaps/vehicles-[n].xml         lastmod = vehicle updatedAt
/sitemaps/facets-makes.xml
/sitemaps/facets-make-model.xml
/sitemaps/facets-make-model-variant.xml
/sitemaps/facets-area.xml
/sitemaps/facets-area-make.xml
/sitemaps/facets-body.xml
/sitemaps/facets-fuel.xml
/sitemaps/dealers.xml
/sitemaps/branches.xml
/sitemaps/editorial.xml
/sitemaps/agency.xml
/sitemaps/pages.xml
```

A facet URL only enters its sitemap when it has live stock above a floor (default 3). Submitting
empty pages to Google is how a large site earns a crawl-budget problem.

## hreflang

Scaffolded from day one, `en-ZA` self-referencing plus `x-default`. Afrikaans slots in as `af-ZA`
without a URL change: the locale prefix pattern (`/af/cars/...`) is reserved and the routing already
accounts for it. See open question 9.
