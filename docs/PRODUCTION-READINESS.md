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

**What is still missing is scope, not soundness:** buyer accounts, the dealer portal, the agency
site, and vehicle photography. None of those stop the site being public. Two things below do.

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
| Isolation was asserted, never proven | 32 adversarial tests over HTTP, which found four real holes |
| No backups | `scripts/backup.sh` plus a runbook, using a consistent SQLite snapshot |

### The isolation suite, and what it found

The gap this document listed first is closed. `e2e/isolation.spec.ts` signs in as a real dealer
over real HTTP and tries, by every route the REST API offers, to read and write another
dealership's data: 32 tests covering leads, stock, staff, dealership records, consent records
and the anonymous baseline.

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

Worth noting how close this came to looking fixed when it was not. The fix appeared to fail twice
because a Next server left running from before the rebuild was still bound to the port, and
Playwright's `reuseExistingServer` adopted it and tested the previous build. `reuseExistingServer`
is now off even locally, so a stray process is a loud "address already in use" rather than a quiet
wrong answer.

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

**Seven documents from the brief are still missing:** `SEO.md`, `SECURITY.md`, `THREAT-MODEL.md`,
`ACCESSIBILITY.md`, `DEPLOYMENT.md`, `CMS-GUIDE.md`, `SEO-LAUNCH-CHECKLIST.md`. The threat model
was meant to precede the build and did not.

---

## Evidence

Everything below is checked on every push, and a failure blocks the deploy branch.

- **103 unit tests.** Access control 33, finance 25, contrast 15, formatting 16, slugs 14.
- **82 end-to-end tests** across desktop and mobile, 32 of them adversarial.
- **Zero axe violations** under WCAG 2.0 A through 2.2 AA on home, search, filtered search, the
  vehicle page and the enquiry dialog.
- **No horizontal overflow** at 320, 375, 768, 1024, 1440 or 1920.
- **62 contrast pairs** passing in both themes, computed from the tokens rather than eyeballed.
- **Theme correct in all three states**, including with JavaScript disabled.
- **No VIN anywhere in a public response**, asserted rather than assumed.
- **Every link in the header and footer resolves.**
- **A dealership cannot read or write another dealership's leads, stock or staff**, proven over
  HTTP rather than argued from the source.
- **A dealership cannot verify itself, rate itself, or claim an accreditation**, same.
- **The sitemap lists nothing robots.txt blocks.**
