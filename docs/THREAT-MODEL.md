# THREAT MODEL

Written 2 September 2026, after the adversarial suite rather than before the build. That is the
wrong order and it is worth saying so: the brief asked for a threat model up front, and had one
existed, at least two of the four holes found on 2 September would have been obvious on paper
before they were ever written. This document exists now so the next feature gets the benefit.

Scope: the marketplace, the Payload admin, and the REST and GraphQL APIs. The dealer portal, the
agency site and buyer accounts are not built, so nothing here claims anything about them.

---

## What is worth stealing

Ranked by how bad the day would be, not by how likely.

| Asset | Why it matters | Where it lives |
|---|---|---|
| **Leads** | A competitor reading your enquiries is the single worst failure this product can have. It is somebody's name, phone number and buying intent, handed to the one party who must not have it | `leads`, scoped by dealer |
| **Consent records** | The evidence that POPIA processing was lawful. Losing or altering one turns a defensible position into an indefensible one | `consent-records`, append only |
| **The verification badge** | The entire product argument. A dealership able to verify itself makes every badge on the site worthless, including the honest ones | `dealers.verificationStatus` |
| **Buyer accounts** | The consumer base. A dealership reading it would have the whole market's contact list | `buyers`, self-scoped |
| **VINs** | Enables cloning and fraudulent finance applications. Collected because dealers need it, never public | `vehicles.vin`, platform staff and the owning dealership only |
| **Stock and pricing** | A dealership writing a competitor's prices could destroy a business in an afternoon | `vehicles`, scoped by dealer |
| **Platform admin session** | Everything above, at once | `users` with `platform_admin` |

---

## Who might go after it

| Actor | Capability | What they want |
|---|---|---|
| **A rival dealership on the platform** | A real, authenticated account with legitimate API access | Competitor leads, competitor pricing, a badge they have not earned |
| **A disgruntled sales agent** | A legitimate low-privilege account inside one dealership | Their employer's lead list on the way out, or control of the account |
| **A private seller** | Anonymous, or a buyer account | To list a car, which the platform exists to prevent |
| **An opportunist** | Anonymous, scripted, scanning | Anything unauthenticated. Spam, scraped contact details, a resold copy of the stock feed |
| **A scraper** | Anonymous, patient, high volume | The whole listing set, to republish |

The first two are the ones this model takes seriously. They hold valid credentials, which defeats
every perimeter control, so the only thing standing between them and someone else's data is
per-row access control. That is why it now has 34 tests aimed at it.

---

## Trust boundaries

```
  anonymous internet
        |
        |  (1) public read: live stock, verified dealerships, no VIN, no leads
        v
  Next.js request handler ......... rate limit, honeypot, timing check on the enquiry path
        |
        |  (2) authenticated: two separate collections, users and buyers
        v
  Payload access control .......... Where clauses folded into the query, not filters after it
        |
        |  (3) tenant: dealer id on the request user, never on the request body
        v
  SQLite
```

**Boundary 1** is crossed by anyone. Everything past it must assume a hostile caller.

**Boundary 2** is where the "only dealerships list" rule stops being policy and becomes structure.
A buyer is a document in a different collection with no role field and no dealer field, so the
escalation path is absent rather than closed. `isStaffUser` tests `collection === "users"`, so a
`buyers` document holding a forged `role: "platform_admin"` satisfies nothing.

**Boundary 3** is the one that failed. Crossing between dealerships was well defended. Crossing
*within* one was not defended at all until 2 September.

---

## Threats, and what stands in the way

### T1. A dealership reads another dealership's leads

The headline risk. Mitigated by access functions returning a Payload `Where` clause rather than a
boolean, so the constraint is compiled into the SQL and a row that does not belong to the caller is
never fetched, not fetched and then hidden. Proven by `e2e/isolation.spec.ts`, including the
obvious attack of naming the target dealership in the query string rather than relying on the
default scope.

**Residual risk:** a future collection that stores lead-shaped data and forgets the scope. The
mitigation is the suite, which fails if a new collection is readable by the wrong dealership only
when someone adds a case for it. Adding one is a checklist item in `SECURITY.md`.

### T2. A dealership publishes stock under another dealership's name

Mitigated in `Vehicles.beforeValidate`, which **overwrites** `data.dealer` with the requesting
user's own dealership rather than validating what was sent. Validation would hold right up until a
code path forgot to call it. Proven, including the case where the create body names another
dealership and the listing is nonetheless born owned by its author.

### T3. A private individual lists a car

Structural. `buyers` has no role and no dealer, and `vehicles.access.create` requires a `users`
document with a dealer role and a dealership. Proven anonymously and as an authenticated buyer,
asserting 403 specifically rather than "not 2xx", because a 400 would mean the request had already
passed access control and reached validation.

### T4. Privilege escalation inside a dealership

**This was live until 2 September.** Any dealer role could write the role field on any colleague,
so a sales agent could promote itself to principal, demote the real principal, and change the
principal's email address, which is an account takeover with a password reset on the end of it.
Nothing crossed a dealership boundary, which is exactly why every scoping test passed while it was
true.

Now a rank ladder: you may grant a role no higher than your own, you may not touch anyone standing
above you, nobody changes their own role, and inviting a colleague is a management act. Six tests.

### T5. A dealership manufactures its own trust

**Also live until 2 September.** `reviewScore`, `reviewCount`, `listingCount` and `accreditations`
were writable by a dealer principal. `admin.readOnly` greys a field out on the screen and does
nothing to a PATCH, and a warning in a field description is guidance for whoever is looking at the
form rather than a control on the API.

The consequence was not a breach, it was the site publishing a lie in its own voice: the
verification page tells the public, as a statement of fact, that where a dealership displays RMI or
NADA membership we have seen the certificate. Platform staff only now, with tests.

### T6. Enquiry spam and lead poisoning

Four layers on the enquiry action: Zod validation, a honeypot positioned off screen rather than
`sr-only`, a submission timing check, and a per-visitor rate limit. Both bot checks fail silently
and report success, so a script gets no signal about which one caught it.

**Residual risk, accepted for now:** the rate limiter is in process memory. If Passenger runs more
than one worker the effective limit multiplies by the worker count. That is one of the two open
questions for the host, and Turnstile is deliberately not stubbed in, because a challenge that
always passes is worse than none.

### T7. VIN exposure

**This was live until 2 September, and it is the most serious finding so far in real terms.** The
field read rule was `isPlatformStaff(user) || isDealerStaff(user)`. `isDealerStaff` is true for
every dealer account on the platform, and every dealership can read every live listing, so any
dealership could request a competitor's stock and receive the VINs with it. In bulk, in one query.

A VIN is what you need to clone a vehicle's identity or put a finance application on a car you do
not own. The anonymous path was closed the whole time, which is exactly why the public VIN test
passed while this was wide open, and the seed leaves the column empty, so that test was also
asserting against a field that held nothing.

Now `fieldReadableByOwningDealer`, which compares the document's dealer against the caller's. Two
tests: a competitor cannot read it singly or in bulk, and the owning dealership still can, because
a rule that hides a field from everyone is a deletion rather than access control.

Structured data omits `vehicleIdentificationNumber` deliberately.

### T8. Consent record tampering

Append only, with no update and no delete for anyone including a platform admin. Consent that can
be edited after the fact is not evidence of anything. Tested by trying both as an admin.

### T9. Session and credential attacks

Passwords are hashed by Payload with PBKDF2-HMAC-SHA256, 25 000 iterations, 512 byte output, and a
32 byte random salt per user. Worth being precise about, because the privacy notice said argon2id
until 2 September and that was simply untrue, and because 25 000 iterations is well below current
OWASP guidance for PBKDF2-HMAC-SHA256. It is Payload's default and raising it means supplying a
custom auth strategy. Recorded here rather than quietly accepted.

Eight failed attempts locks a staff account for fifteen
minutes. Staff tokens expire after eight hours, buyer tokens after thirty days. Cookies are
`SameSite=Lax` and `Secure` in production, and CSRF has an origin allowlist.

**Not done:** two-factor is described as mandatory for platform admins and dealer principals in the
collection and is not enforced anywhere yet. The `twoFactorEnabled` field exists and nothing reads
it. This is the largest known gap in this document.

### T10. Supply chain

Every dependency pinned to an exact version, no ranges. `npm ci` in CI, so the lockfile is the
build input. Renovate or Dependabot is not configured yet.

### T11. Copy that describes controls we do not have

A category the brief anticipated and this build still walked into. The privacy notice, published
and public, stated as fact that passwords were hashed with argon2id, that sensitive fields
including the VIN were encrypted at rest, and that two-factor authentication was required on
privileged accounts. None of the three was true. The same encryption claim sat in a field
description and in a source comment, where it read as documentation of a control that had never
been written.

Under POPIA a security claim in a privacy notice is a representation about safeguards, so this is a
compliance problem and not only an accuracy one. All three are corrected, and the notice now names
what is missing rather than staying silent about it.

The rule taken from this: a statement about a control belongs next to the code that implements it,
and if there is no such code the statement is fiction. `admin.readOnly` and a warning in a
description are the same trap in a smaller frame.

### T12. Scraping

Not defended, and deliberately so. The listings are public because the point is for them to be
found. Cloudflare in front of the site gives rate limiting and bot management when it is set up,
which is a first-week item.

---

## Accepted risks

Written down so they are decisions rather than oversights.

| Risk | Why it is accepted | What would change it |
|---|---|---|
| No two-factor enforcement | Nobody but the founder has an account yet | The first external platform admin or dealer principal |
| In-process rate limiting | One Passenger worker is likely, and unconfirmed | The host answering, or any evidence of multi-worker |
| SQLite | The host's Postgres is version 10, which Payload rejects | `SQLITE_BUSY` under normal load, roughly 25 active dealers, or p95 search above 300ms |
| No WAF | No Cloudflare yet | First week |
| Scraping | Listings are meant to be found | Wholesale republication |
| No penetration test | Pre-launch, no real data | Real dealer data, or the first paying dealership |
| PBKDF2 at 25 000 iterations | Payload's default; changing it needs a custom auth strategy | Any real user base, or a Payload release that raises it |
| No encryption at rest | The host provides no transparent encryption and doing it in the application would break every query on the field | A field that must survive a stolen database file |

---

## What this model does not cover

The dealer portal, the agency site, buyer accounts, PayFast billing, feed imports and media
uploads are all unbuilt. Each one adds a trust boundary and this document must be extended before
any of them ships, not after. The pattern from 2 September is the argument: the two holes found
were both in the layer nobody had written down.
