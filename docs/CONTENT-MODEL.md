# CONTENT MODEL (schema sketch, Phase 0)

Payload collections. `->` is a relationship. Names differ from the brief where a better one exists,
and the reason is noted.

## Auth

### `users` (staff and dealer staff)
```
email, password (argon2id), name, phone
role: platform_admin | platform_editor | agency_account_manager
    | dealer_owner | dealer_manager | dealer_sales | analyst
dealer            -> dealers          required when role starts with dealer_
branchScope       -> branches[]       optional narrowing for dealer_sales
twoFactor: { enabled, secret (encrypted), backupCodes (hashed), enforcedAt }
passkeys[]        { credentialId, publicKey, signCount, label, lastUsedAt }
status: active | invited | suspended
lastLoginAt, lastLoginIp, invitedBy -> users
```
Two-factor is **mandatory** for `platform_admin` and `dealer_owner`. Enforced at sign-in, not by
a settings toggle.

### `buyers` (consumers)
```
email, password (argon2id), name, phone, province -> provinces, city -> cities
marketingConsent -> consent-records
alertFrequency: instant | daily | weekly | off
status: active | suspended | deletion_requested
deletionRequestedAt
```
No role field. No dealer field. Named `buyers`, not `customers`, because the name should make the
constraint obvious to whoever reads the config next.

## Dealers

### `dealers`
```
legalName, tradingName, slug (unique, reserved-word checked)
registrationNumber (CIPC), vatNumber, motorTradeNumber
verificationStatus: pending | verified | suspended | archived
verificationDecisions -> verification-decisions[]   append only
plan -> plans, subscription -> subscriptions
logo -> media, heroImages -> media[]
theme: { accent (hex, contrast-validated on save), surface, heroLayout, cardVariant }
aboutRichText, foundedYear
franchises -> franchises[], group -> dealer-groups
principal: { name, email, phone }
salesContacts[] { name, role, email, phone, whatsapp, photo -> media }
branches -> branches[]  (reverse)
emailRouting[] { leadType, toAddress, ccAddresses[], branch -> branches }
whatsappNumber, socialProfiles[] { platform, url }
accreditations -> accreditations[]     RMI, NADA, MIWA and similar
warrantyOfferings[], serviceOfferings[]
financePartners -> finance-partners[]
reviewScore (computed, read-only), reviewCount (computed, read-only)
feedConfig -> feed-configs
listingLimit, listingCount (computed)
```

`theme.accent` runs through the contrast validator on save. A colour that fails 4.5:1 against the
dealer's chosen surface is rejected with a message naming the ratio and the nearest passing shade,
per Section 6.

### `branches`
```
dealer -> dealers (required)
name, slug, addressLine1, addressLine2, suburb
city -> cities, province -> provinces, postalCode
latitude, longitude (geocoded on save, manually overridable)
  mirrored into an R-tree index for radius search, since SQLite has no PostGIS
phone, whatsapp, email
tradingHours[] { day, opensAt, closesAt, closed }
holidayOverrides[] { date, opensAt, closesAt, closed, label }
directionsNote, photos -> media[]
isPrimary
```
Separate collection rather than an array on `dealers`, because vehicles reference a branch, leads
route per branch, and each branch needs its own indexable `LocalBusiness` page.

## Vehicles

### `vehicles`
```
dealer -> dealers (required, force-set server side)
branch -> branches (required, must belong to dealer)
publicRef            short Crockford base32, stable, used in the URL
condition: new | demo | pre_owned
make -> makes, model -> models, variant -> variants, derivative (text)
modelYear, registrationYear
bodyType -> body-types, transmission -> transmissions, drivetrain -> drivetrains
fuelType -> fuel-types, engineCapacityCc, cylinders, powerKw, torqueNm
mileageKm
exteriorColour -> colours, interiorColour -> colours
doors, seats
vin (encrypted at rest, never returned to a public query, last 6 shown to the owning dealer only)
stockNumber
price, priceType: retail | on_the_road | poa
previousPrice, priceHistory[] { price, changedAt, changedBy }
monthlyEstimate (computed from finance-defaults, recomputed when prime moves)
vatStatus: vat_inclusive | vat_exclusive | non_vat
serviceHistory: full_franchise | full_independent | partial | none | unknown
warrantyRemaining { months, km, provider }
roadworthy: current | expired | not_required | unknown
licenceExpiry
features -> features[]
description (lexical rich text)
gallery[] { image -> media, alt, order, isPrimary }
video { url, provider }, spin360 { url }
documents -> documents[]
status: draft | pending_review | live | reserved | sold | expired | archived
publishedAt, soldAt, expiresAt
viewCount, leadCount, saveCount   (buffered in memory, flushed by cron, never written per request)
_versions (Payload drafts and version history)
```

VIN is stored encrypted with a field-level key, is never selected by the public read path, and never
appears in the `Vehicle` JSON-LD. Section 13 asks for `vehicleIdentificationNumber` to be omitted
publicly and this is how.

`monthlyEstimate` is derived, not entered. It is recomputed for the whole index when an admin
changes the prime rate in `finance-defaults`, which is a background job, not a request.

## Taxonomies (managed data, never enums)

`makes`, `models` (-> makes), `variants` (-> models), `body-types`, `fuel-types`, `transmissions`,
`drivetrains`, `colours` (with `family` so "Deep Sea Blue" filters under Blue, plus a swatch hex),
`feature-categories`, `features` (-> feature-categories), `provinces`, `cities` (-> provinces, geo),
`franchises` (-> makes), `dealer-groups`, `accreditations`, `finance-partners`.

Each carries `slug`, `aliases[]` (for the typeahead parser and for feed import mapping), `sortOrder`,
`isActive`, and `mergedInto` (self relationship) so a duplicate make can be merged without breaking
old URLs. Merging writes a redirect automatically.

**Reserved slugs.** `makes.slug` is validated against a reserved list (`in`, `body`, `fuel`, `new`,
`demo`, `used`, `under`, `near`) so a make can never collide with a facet route segment.

## Leads

### `leads`
```
type: enquiry | test_drive | finance | trade_in | callback | whatsapp_click
    | phone_reveal | dealer_contact | agency_enquiry
vehicle -> vehicles, dealer -> dealers, branch -> branches
name, email, phone, message
consent -> consent-records (required)
utm { source, medium, campaign, term, content }, referrer, landingPage
device { type, os, browser }, ipCountry   (IP itself hashed, never stored raw)
status: new | contacted | qualified | appointment_set | sold | lost
lostReason, assignedTo -> users
firstResponseAt, responseSeconds (computed), lastActivityAt
notes[] { body, author -> users, createdAt }
tradeIn { make, model, year, mileageKm, condition, estimate }
finance { deposit, termMonths, balloonPercent, quotedInstalment, ratePercent }
```

### `lead-events` (append only, no update or delete access for anyone)
```
lead -> leads, type, actor -> users | buyers | system, payload (json), createdAt, ip (hashed)
```

## Consumer

`saved-vehicles` (buyer, vehicle, savedAt), `saved-searches` (buyer, name, filterState, alertFrequency,
lastNotifiedAt, lastResultCount), `comparison-sets` (buyer or anonymous token, vehicles up to 4),
`recently-viewed` (buyer or anonymous token, capped ring buffer).

## Agency

`services` (+ `serviceTiers` array), `packages`, `case-studies` (headline metric, situation, work,
result, pull quotes, before and after media, dealer -> dealers optional, `metricsVerified` boolean
that must be true before it renders a number), `testimonials`, `team-members`, `faqs`, `resources`
(gated lead magnets with file, gate form and consent), `job-postings`.

`case-studies.metricsVerified` exists because Section 16 forbids fabricated metrics. An unverified
case study renders the narrative and hides the numbers rather than showing a placeholder to the
public.

## Editorial

`pages` (block-based, nested-docs for breadcrumbs), `posts` (`type: news | review | guide`,
categories, author -> users, related vehicles query), `categories`, plus a `modelPage` field group
**on the `models` collection itself** rather than a separate collection, so every model has a hub
page that an editor enriches. That avoids the classic orphan-content problem where the CMS model
page and the search results page compete for the same query.

## Operational

`media` (alt required unless `isDecorative`, focal point, folder, `usedIn` computed so nobody deletes
a live image), `documents`, `forms` and `form-submissions`, `redirects`, `feature-flags`,
`audit-log` (actor, action, collection, docId, before, after, ip hashed, userAgent, createdAt, no
update or delete access), `import-jobs` and `import-job-rows`, `feed-configs`,
`verification-decisions`, `consent-records` (purpose, policyVersion, grantedAt, withdrawnAt,
evidence, ip hashed).

### `plans`, `subscriptions`, `invoices` (PayFast)
```
plans:         name, slug, monthlyPrice, listingLimit, branchLimit, userLimit,
               microsite theming allowance, featureFlags[], isPublic, sortOrder

subscriptions: dealer -> dealers (one active at a time)
               plan -> plans
               payfastToken            the tokenisation token, encrypted at rest
               payfastSubscriptionId
               status: pending | active | past_due | paused | cancelled | expired
               currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd
               lastItnAt, lastItnSignature
               events[] { type, raw (json), receivedAt }   append only

invoices:      subscription -> subscriptions, dealer -> dealers, amount, vatAmount,
               periodStart, periodEnd, status, payfastPaymentId, pdf -> documents
```

Subscription state changes only on a verified PayFast ITN webhook, never on the customer landing on
a success page. Every ITN is signature-checked, confirmed server to server, and stored raw in
`events` before anything is acted on, so a disputed charge can be reconstructed from what PayFast
actually sent rather than from what we concluded.

`payfastToken` is encrypted with a field-level key. It is a payment instrument, and it is treated
like one.

## Globals

`marketplace-settings`, `agency-settings`, `navigation` (one per front door), `footer`,
`announcement-bar`, `seo-templates`, `legal-documents`, and:

### `finance-defaults`
```
primeRatePercent            10.5 as at 24 August 2026 (repo 7.00)
defaultRateOffsetPercent    dealer-tier dependent
defaultTermMonths           72
defaultDepositPercent       10
defaultBalloonPercent       0
initiationFee, monthlyServiceFee
disclaimerRichText          required, cannot be emptied, flagged "requires legal review"
lastReviewedAt, reviewedBy
```

The disclaimer is a required field with no default that can be silently accepted. South African
vehicle credit sits under the National Credit Act, and a wrong instalment shown next to a price is
a compliance problem rather than a bug. The calculator labels every output an estimate, shows total
cost of credit, and does not present itself as a quotation.
