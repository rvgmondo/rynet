# PRODUCTION READINESS

Updated 2 September 2026. The first version of this document said the site deployed but was not
ready to be public. Most of what it listed is now done.

---

## Where it stands

**The marketplace works end to end.** A buyer can search 311 vehicles, filter and sort, open a
listing, read the full specification, see a finance estimate with the cost of credit, and send an
enquiry that reaches the selling dealership with a POPIA consent record attached.

Every link in the header and footer resolves. A test walks all of them on every build and fails if
one 404s, which is what stops the seventeen dead links coming back.

**The agency site is built.** `/digital` was an empty directory that 404ed. It is now twelve
routes: home, a services index, seven service pages from one template, how we price, how we work,
about, and a three step qualification form that writes a lead and a POPIA consent record. Its own
header, footer and metadata, because a dealer principal reading about stock feeds should not be
offered a bakkie search.

It has no logo wall, no testimonials, no case studies and no metrics, because Rynet Digital has no
clients. The home page says that in as many words and a test asserts the sentence is still there.
The proof used instead is Rynet Showroom, which a dealer can open and judge. Pricing publishes no
figures for the same reason, and the bands render real numbers the moment
`src/content/agency/pricing.ts` has them.

**What is still missing is scope, not soundness:** buyer accounts, the dealer portal, agency case
studies, insights and resources, and vehicle photography. None of those stop the site being
public. Two things below do.

---

## Fixed since the first audit

| Was | Now |
|---|---|
| Three pages existed; all 311 cards linked to a 404 | Vehicle detail page, with gallery, spec, finance, dealer card, similar vehicles, structured data |
| The platform could not generate a lead | Enquiry flow writing a lead plus an append-only consent record, with rate limiting, a honeypot and a timing check |
| Seventeen linked routes 404ed | Facet pages, dealer directory and microsites, verification, privacy, terms, cookies, accessibility, contact. Nav trimmed to what exists, enforced by a test |
| Nothing told a search engine anything | robots.txt, sitemap, canonicals, Car/Offer/AutoDealer/LocalBusiness/BreadcrumbList JSON-LD |
| 468KB favicon, no app icon | Generated at build from the mark |
| Next's default 404 and error page | A 404 with a search box, and an error boundary that says what to do |
| No unit tests | 103, including 25 on the finance calculator |
| Isolation was asserted, never proven | 34 adversarial tests over HTTP, which found six real problems |
| No backups | `scripts/backup.sh` plus a runbook, using a consistent SQLite snapshot |

### The isolation suite, and what it found

The gap this document listed first is closed. `e2e/isolation.spec.ts` signs in as a real dealer
over real HTTP and tries, by every route the REST API offers, to read and write another
dealership's data: 34 tests covering leads, stock, VINs, staff, dealership records, consent
records and the anonymous baseline.

It follows three rules, each because the obvious version of the test passes while proving nothing.
It goes over HTTP rather than through the local API, which has different defaults and an
`overrideAccess` flag. Every refused write is checked twice, because an unhappy status code means
the response was unhappy, not that nothing happened, so each attempt is followed by a read as a
platform admin asserting the row is unchanged. And it fails rather than skips when its fixtures
are missing: a security test that skips itself still reports green.

**It found a real hole on the first run.** Every check on the boundary *between* dealerships held.
The boundary *inside* one did not exist. Any dealer role could write the role field on any
colleague, so a sales agent could:

- PATCH its own record to `dealer_owner`, gaining the right to delete stock and manage the team;
- demote the actual dealer principal to sales agent;
- change the principal's email address, which is an account takeover with a password reset on the
  end of it.

None of that crosses a dealership boundary, which is exactly why every scoping test passed while it
was true, and why unit tests on the predicates could never have caught it. It is now a rank ladder:
you may grant a role no higher than your own, you may not touch anyone standing above you, and
nobody changes their own role at all. Inviting a colleague is a management act, so a sales agent
cannot mint an account either.

**A second pass on the same bug class found three more.** The pattern is a privileged field
writable from inside the tenant, so the audit went looking for other fields where Rynet publishes
its own assessment of a dealership. A dealer principal could write `reviewScore`, `reviewCount`,
`listingCount` and `accreditations` on its own record. That is not a data breach. It is worse for
this product: it means a dealership could award itself five stars from four hundred reviews it
never received, and claim RMI membership on a site whose verification page tells the public, as a
statement of fact, that we have seen the certificate.

Those fields were marked `admin.readOnly`, which greys a field out on the screen and does exactly
nothing to a PATCH, and `accreditations` carried a note in its description saying to add one only
once the certificate had been seen. A note in a description is guidance for whoever is looking at
the form. It is not a control. All four are platform staff only now, with tests.

**A third finding, and the worst one in real terms: any dealership could read every VIN on the
platform.** The field's read rule was `isPlatformStaff(user) || isDealerStaff(user)`, and
`isDealerStaff` is true for every dealer account there is. Every dealership can read every live
listing, so any dealership could ask for a competitor's stock and get the VINs with it, in bulk, in
one query. A VIN is what you need to clone a car's identity or put a finance application on one.

The public path was closed the whole time, which is exactly why the existing "no VIN in a public
response" test passed while this was wide open. That test was also weaker than it looked: the seed
leaves the VIN column empty, so it was asserting against a field that held nothing. It now plants a
VIN first, and there are two more tests either side of the line, because a rule that hides a field
from everyone is a deletion rather than access control.

**And the privacy notice was describing controls that do not exist.** Published and public, it
stated as fact that passwords were hashed with argon2id, that sensitive fields including the VIN
were encrypted at rest, and that two-factor authentication was required on privileged accounts.
Passwords are hashed with PBKDF2-HMAC-SHA256, nothing is encrypted at rest, and two-factor is not
implemented at all: the field exists and nothing reads it. Under POPIA a security claim in a privacy
notice is a representation about safeguards, so this was a compliance problem as well as an accuracy
one. All three are corrected, and the notice now names what is missing instead of staying quiet
about it.

Worth noting how close this came to looking fixed when it was not. The fix appeared to fail twice
because a Next server left running from before the rebuild was still bound to the port, and
Playwright's `reuseExistingServer` adopted it and tested the previous build. `reuseExistingServer`
is now off even locally, so a stray process is a loud "address already in use" rather than a quiet
wrong answer.

### Two more, from building the agency form

Both in the same component, both invisible on screen, both found only because a test reopened the
page and checked what had actually been stored.

**A component defined inside another component remounts everything below it on every render.**
`Field` was declared in the form's body, so every state change gave React a new function identity,
a different component type, and a full unmount and remount. Every uncontrolled input inside it went
blank. It looked like the draft persistence was broken and it was component identity.

**Clicking "Continue" submitted the form.** React reconciled the Continue button and the Send it
button as the same element in the same position, reused the DOM node, and changed only its `type`
from "button" to "submit". Setting state in the click handler flipped that attribute while the
browser was still processing the click, so it performed the default action and submitted. The
action then failed validation and React reset the form, wiping the first two steps on the way to
the third. The screen looked completely normal throughout. Distinct React keys fix it.

### Three bugs worth remembering

Each would have been invisible in production until someone complained.

**Every enquiry was being silently discarded.** The timing check reads an `elapsedMs` field that
was computed during render, so it was fixed at roughly zero for the life of the dialog. Every real
person failed the two-second bot check, the form reported success, and nothing was written. A
failure that looks exactly like it worked.

**Before that, the form was not a server action at all.** The action module exported a Zod schema,
and a `"use server"` file may export nothing but async functions. Next never created the action
reference, so the form fell back to a plain HTML POST.

**Inline links were distinguished by colour alone**, which axe rates serious: invisible to a reader
with a colour vision deficiency. Now a base rule, so the next inline link cannot reintroduce it.

---

## Still blocking a public launch

Two items, both small, both outside the code.

### 1. Email is not configured

`SMTP_HOST` is blank, so Payload logs enquiries to the console and sends nothing. The lead is
written and the buyer is told the dealership has their details, and no notification goes anywhere.

Needs a cPanel mailbox, then SPF, DKIM and DMARC on `rynet.co.za` or every notification lands in
spam. **This is the one that would embarrass you fastest**, because the site tells a buyer their
enquiry has been passed on.

### 2. No restore has ever been done

The backup script exists and is not scheduled, and nothing has been restored from it. A backup you
have never restored is not a backup. The drill is in `docs/RUNBOOK.md` and takes about twenty
minutes. Do it before there is data worth losing.

---

## Should be done in the first week

**Cloudflare and R2.** Everything currently serves from the cPanel box with no CDN, and uploads
would go to local disk. Fine with no photography. It stops being fine the moment real stock
arrives: twenty photos per listing across a few hundred vehicles is tens of thousands of files, and
shared hosting caps inodes long before disk. Setting the `R2_*` variables switches it with no code
change and no rebuild.

**Turnstile.** The honeypot, timing check and rate limiting are in place. Turnstile is deliberately
not stubbed in, because a challenge that always passes is worse than none. It goes in when the site
is behind Cloudflare.

**Legal review.** Privacy, terms and the finance disclaimer all carry a visible "requires legal
review" banner and must not lose it until a South African attorney has read them. The finance
disclaimer matters most: the calculator sits beside a price, and a figure that reads as a quotation
rather than an estimate is a National Credit Act problem.

**Register the Information Officer** with the Information Regulator. For a company that is the
managing director by default unless someone else is formally designated. The privacy notice names
the role and cannot be accurate until this is done.

**The two host questions**, one support ticket: is the home directory on local disk or NFS
(SQLite's file locking is unsafe on NFS), and does Passenger run one Node process or several (it
changes how the rate limiter and the counter flush behave).

---

## Known gaps, honestly

**No manual screen reader testing.** Automated axe checks catch roughly a third of accessibility
problems and pass on every template. A full NVDA and VoiceOver pass has not happened. The
accessibility statement says so rather than claiming conformance nobody has checked.

**Lighthouse is not wired into CI.** Deliberately absent rather than passing vacuously. The budgets
in the brief are unenforced.

**View and lead counters are not flushed.** The fields exist and nothing increments them, which is
correct for now: writing per page view on SQLite would be a write lock on the busiest page. The
cron flush is not built.

**Search is one page of what the brief describes.** No radius search, no map, no typeahead, no
saved searches. Fuel, transmission and province facets show no counts.

**Five documents from the brief are still missing:** `SEO.md`, `ACCESSIBILITY.md`,
`DEPLOYMENT.md`, `CMS-GUIDE.md`, `SEO-LAUNCH-CHECKLIST.md`. `SECURITY.md` and `THREAT-MODEL.md`
now exist. The threat model was meant to precede the build and did not, and it says so: had one
existed, at least two of the six problems above would have been obvious on paper.

---

## Evidence

Everything below is checked on every push, and a failure blocks the deploy branch.

- **103 unit tests.** Access control 33, finance 25, contrast 15, formatting 16, slugs 14.
- **134 end-to-end tests** across desktop and mobile, 34 of them adversarial and 25 on the
  agency site.
- **Zero axe violations** under WCAG 2.0 A through 2.2 AA on home, search, filtered search, the
  vehicle page, the enquiry dialog, and all seven agency templates.
- **No horizontal overflow** at 320, 375, 768, 1024, 1440 or 1920.
- **62 contrast pairs** passing in both themes, computed from the tokens rather than eyeballed.
- **Theme correct in all three states**, including with JavaScript disabled.
- **No VIN anywhere in a public response**, asserted rather than assumed.
- **Every link in the header and footer resolves**, on both front doors.
- **No rating, review or invented metric is emitted anywhere on the agency site.**
- **A dealership cannot read or write another dealership's leads, stock or staff**, proven over
  HTTP rather than argued from the source.
- **A dealership cannot verify itself, rate itself, or claim an accreditation**, same.
- **No VIN reaches the public or another dealership**, asserted against a row that has one.
- **The sitemap lists nothing robots.txt blocks.**
