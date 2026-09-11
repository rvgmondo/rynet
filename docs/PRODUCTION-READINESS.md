# PRODUCTION READINESS

Updated 11 September 2026. The first version of this document said the site deployed but was not
ready to be public. Most of what it listed is now done.

---

## Read this first: none of it is on the live site

`rynet.co.za` answers 200 and serves a build from before the redesign. Its HTML still carries
Montserrat and Inter, which commit `737d061` replaced on 9 September, and its deployment id is the
format a manual bundle gets rather than the commit sha CI stamps. So what is live was
hand-uploaded, and the automatic path has never run on the host.

The pipeline itself is fine. The `deploy` branch is current on every commit, carrying 1 143 files
under `.next` with a `BUILD_ID` and the fonts. What is missing is one command in the cPanel
terminal, once, and then a cron entry. Both are steps 2 to 5 of [DEPLOY-GIT.md](../DEPLOY-GIT.md).

Everything described below this line is true of the build on the `deploy` branch. None of it is
true of what a visitor to `rynet.co.za` sees today.

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

## Redesigned, and what the redesign audit found

**The whole marketplace was redrawn onto the STOCKLIST direction on 9 September 2026.** The
client's verdict on the previous build was that it looked cheap, and the diagnosis was specific:
with no vehicle photography every element had to declare itself with a thin grey border, and three
hundred thin grey borders is what cheap looks like. `docs/DESIGN-STOCKLIST.md` is the authority on
what replaced it. There are now no radii and no shadows anywhere, the type is Archivo with
Newsreader for prose, and the image area of every listing is a field derived from that car's own
recorded paint.

**An adversarial audit ran across ten dimensions afterwards and found one genuinely serious
thing.** Every seeded listing and dealership was publishing full schema.org to search engines: a
Car with an Offer, a rand price and in-stock availability, and an AutoDealer with a street address,
a telephone number and GPS coordinates. All 311 were in the sitemap and all were indexable, while
the pages themselves said in their own copy that none of it is real. The site was telling a person
one thing and telling Google the opposite.

That is fixed at every surface: no structured data, out of the sitemap, and noindex with follow.
The sitemap went from 400 URLs to 77. **The rule to carry forward is that a visible disclaimer is
not enough. Any new machine-readable surface has to be gated on `isDemonstration` the same way.**

The same audit found the home page shouting 311 cars at poster scale when all 311 are seeded, so
the counter now reads real stock and says plainly that every car on the site is an example while
there is none. It also found four correctness bugs worth naming, because each is a class of
mistake rather than a one-off:

- **A GET form submits only its own controls.** The sort control was posting `sort` alone, so
  choosing a sort order discarded the search term and every ticked facet. The facet rail had the
  same bug for the query and the colour. Any new GET form on `/cars` needs hidden inputs for
  everything the buyer arrived with.
- **A search that understood nothing answered with everything.** "asdfgh" parsed to no filters,
  fell through to the unfiltered query, and presented all 311 cars under the buyer's own term.
- **Facet counts ignored every filter except make**, so on bakkie plus diesel the rail still
  advertised every hatchback in the catalogue.
- **Searching Cape Town, Durban or Johannesburg returned nothing**, because the branches are
  registered in Bellville, Pinetown and Sandton. A city with no stock now widens to its province
  and says so.

**The audit did not finish.** It hit the account session limit two thirds of the way through, so
accessibility, performance, responsive behaviour and dark theme were never examined by it. The axe
checks, the reduced-motion assertions and the horizontal-overflow gate in the suite all pass, but
that is not the same as having looked.

A second audit did cover those four, and everything below came out of it.

---

## Fixed since the third sweep

A nine-surface read of everything the redesign had not touched, each reader
capturing and reading the rendered page rather than the source alone. It returned
seventy-four findings. Its own verifiers and its judge panel never ran, because
the account hit its session limit, so every finding below was checked by hand
before it was acted on and one of them was refuted.

Three were not design at all.

| Was | Now |
|---|---|
| `priceRange` resolved three filter dimensions where the search resolved eight, so every province, city, fuel and condition landing page printed the range of a different set from the cars underneath it. `/cars/in/limpopo`, which holds no cars, told a buyer it had stock "from R 83 300 to R 1 489 600" | One clause builder, taken by both. A dimension added to search reaches the range by construction |
| The page number's floor was clamped and its ceiling was not, so `/cars?page=999999999999999999999` reached SQLite as an offset and answered 500. A crawler following a malformed link was enough to take search down | Clamped at both ends, on both routes that read a page number |
| An empty number input submits `""`, `z.coerce` turned that into 0, and 0 satisfied `min(0)`, so a blank mileage passed validation while every other empty field on the same screen reported an error. The lead went to five dealerships reading 0 km | A floor of 1 and an empty-to-undefined preprocess. The schema had no tests; it has twenty, four of them this bug |

The rest was the same finding nine times over: the redesign had reached the home
page, search, the card, the rail and the forms' primitives, and stopped. It has
now reached the facet landing pages, both contact pages, the sell page, the seven
service pages, the four legal notices, the dealership microsite, the vehicle
page's rail and finance panel, the enquiry dialog, the chrome on every page, and
the error and 404 surfaces. Each is its own commit with the measurement that
prompted it.

**One finding was refuted rather than fixed.** It claimed the focus ring on a red
primary button is invisible in light theme at 1.20:1, measuring the ring against
the button fill. The ring is not drawn on the fill: `outline-offset` puts it 2px
out and a 4px paper `box-shadow` fills that gap, so it lands on `#EDEDEA` at
roughly 6:1. Captured focused at 1440 in both themes to be sure.

---

## Fixed since the second audit

Nine findings, each verified in a real browser against a production build before and after.

| Was | Now |
|---|---|
| An unmatched top-level path served Next's own unstyled 404, on pure white or pure black, with no masthead and no way back. Both layouts on this site are scoped to a route group, and a route group's layout does not wrap the global not-found | `src/app/not-found.tsx`, carrying its own document, one font and no client JavaScript. It follows the operating system through `prefers-color-scheme`, which is what the tokens already key on when nothing is stamped on the root |
| Pressing Continue on an unanswered step redrew the same screen with red text on it, focus still on the button, and nothing announced. SC 4.1.3, on both multi-step forms | Focus moves to the first control that failed, in document order. Every one of them already carried `aria-invalid` and an `aria-describedby` pointing at its own error, so landing on it reads the label, the state and the reason in one go |
| The result count on `/cars` sat in an `aria-live` region that could never fire. Every filter is a GET form, so the region was created and read in the same paint | The region is gone and the comment claiming it worked with it. What announces a new result set is the navigation, and the count sits second in the reading order, under the heading |
| Heading levels went h1 to h3 on `/cars`, so heading navigation had a rung missing | A visually hidden h2 over the grid. axe `heading-order` clean at 390 and 1440 |
| The font preload was reaching the browser only inside the RSC payload, on exactly the two busiest pages. Next writes that link while prerendering, and both of those routes render on demand | The link is written explicitly, with the hashed filename read out of the compiled stylesheet at first request. The font request now starts at about 500ms on a throttled mid-range Android rather than at two seconds |
| Newsreader shipped with an optical size axis that no rule on the site ever asked for | Dropped. The font payload went from 726KB to 433KB, which is 40 percent of it, for no visible difference |
| `/cars` did no caching at all and spent 155 to 215ms per request. Measured, it was one `find` at depth two: twenty-four vehicles each pulling six taxonomies and a branch pulling its own city and province | The card data, the facet counts and the taxonomy lookups are each cached for sixty seconds and dropped by a tag on any write. Warm requests are 69 to 80ms |
| A full page of stock on a 390px phone was about fifteen thousand pixels of scroll | Two columns from 368px up, which halves it to seven and a half thousand. It works here only because there is no photography to shrink |
| Nothing painted on either busy page until hydration had finished, so both busted the two second budget | Cards and the bands below the fold are not laid out until they are scrolled to. The browser gets about 120ms between finishing the document and the first script taking the main thread, and the first frame now fits in it |
| The price in the vehicle page's mobile action bar rendered as "R 5..." at 320, 360 and 390 | The price has its own line above two full-width buttons. Nothing is abbreviated and both buttons became thumb-sized |

Three of those needed a second fix that the finding did not name. Making the price rigid in the
action bar only moved the truncation, because a full rand figure and two labelled buttons do not
fit across 320px at any distribution of the slack. The two-up grid put the price at a size where
its container query, which had been handing the type a sixteenth more width than existed, wrapped
every price on the page onto two lines. And the same grid narrowed the colour plate until the
place and the paint could no longer share a line, so the paint was pushed out and clipped by the
plate's own overflow: "MIDNIGHT BLACK" simply ended at the edge of the card.

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

### The deploy pipeline was two defects away from an outage

Both were found by auditing it after a real failure, and both had been live for a week.

**One click could have destroyed the site.** `.cpanel.yml` opened with an unconditional
`rm -rf $APP/.next` followed by a copy of a directory that only exists on the `deploy` branch. The
checkout had ended up on `main`, where `.next` is gitignored. There was no `set -e`, so the
remaining twenty tasks would have run anyway, and the last of them rewrote `DEPLOYED.txt` with a
fresh timestamp. cPanel reports the exit status of the last command in the script, so the interface
would have said the deploy succeeded while every request returned 500.

It now refuses before writing anything if the checkout carries no build, stages the new build
beside the live one and swaps by rename, keeps the previous build for a one-line rollback, and
writes the marker last so it can only ever describe a deploy that finished. Tested against five
scenarios: wrong branch, correct branch, a repeat deploy, a first-ever deploy, and a staged copy
that lands incomplete.

**The documented flow could never have worked twice.** GitHub Actions force-pushed the deploy
branch as a fresh orphan commit every build. cPanel's Update from Remote pulls with `--ff-only`,
which cannot follow a commit with no shared ancestor, so the button worked on the initial clone and
after that either errored or silently redeployed the day-one build. The workflow now builds a
commit whose parent is the current deploy tip, verified with a local simulation of three
consecutive builds and a host-side `git pull --ff-only` that fast-forwards to the latest.

### The sell page promised something the platform cannot do

Caught by a POPIA and copy audit an hour after it shipped. Rynet has not signed a single
dealership, and the page said offers would come back. That is the same failure the agency site was
built to avoid, and it was missed here because the page was written from the mechanism rather than
from the launch state. It now carries a notice saying we are new, may not have a buyer in your
province, and will tell you rather than sit on your details. A test asserts that notice is still
there.

The same audit added the POPIA section 18 notice to the page itself. Section 18(2)(a) requires the
data subject to be told who is collecting, why, whether it is voluntary, who receives it and how to
complain **before** the information is collected, which a privacy-policy link does not satisfy.

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

## Two-factor authentication

The gap `SECURITY.md` and `THREAT-MODEL.md` both called the largest is closed. TOTP against an
authenticator app, enrolment at `/account/two-factor`, ten single-use recovery codes, and
enforcement in `beforeLogin`, which runs after the password check and before the token is signed.
A refusal there means no session was ever issued, which is why the tests assert on the token
rather than on what a screen said.

`src/lib/totp.ts` is written rather than installed. It is eighty lines of arithmetic over
`node:crypto`, and the RFCs publish vectors that prove an implementation correct, so a dependency
in the authentication path would cost more than it saved. Fifty-one unit tests run every published
RFC 4226 and RFC 6238 vector.

**One bug found by the tests, and it would have been invisible.** Confirming enrolment called
`revalidatePath`, which re-rendered the page into its "two-factor is on" branch. That branch does
not render the recovery codes, so the codes came back from the action and were never shown.
Somebody would have switched on a second factor and never been given the way back in if they lost
the phone. The success screen is now an early return that renders before any server state can
replace it.

**Rollout is in two stages, deliberately.** Right now anyone who has enrolled must present a code
and nobody is forced to enrol. Once the privileged accounts have enrolled, `RYNET_REQUIRE_2FA=true`
makes it compulsory for `platform_admin`, `platform_editor` and `dealer_owner`. Doing that first
would lock the founder out of his own live site.

**Not done: a QR code.** The setup key is typed in, which every authenticator app supports.
Rendering a QR needs a Reed-Solomon encoder, so a dependency, so an `npm install` on a host that
cannot build. Worth adding the next time something else forces a dependency change.

---

## Deployment, finally

cPanel's Git Version Control has been taken out of the deploy path. It was the wrong tool and
three sessions went into proving it rather than accepting it: it pulls with `--ff-only` and the
deploy branch carries a build that gets rewritten, the checked-out branch kept reverting to
`main` which has no build in it by design, and even when it worked it was two buttons and a
Restart and remembering to check the branch first.

The host now runs `~/deploy-rynet.sh` from cron every five minutes. It does `git fetch` and
`git reset --hard origin/deploy`, which cares about neither fast-forwards nor which branch was
checked out, then calls `scripts/host-deploy.sh` from inside the build it just pulled. So the
deploy logic ships with the app and can be fixed by pushing; the only file that lives on the host
is six lines and never changes.

`scripts/host-deploy.sh` refuses before writing anything if the checkout has no build in it,
stages beside the live application and swaps by rename, keeps the previous build for a one-rename
rollback, restarts Passenger through `tmp/restart.txt`, then checks the site actually answers and
rolls itself back if it does not.

Tested rather than reasoned about, in eight scenarios: a checkout with no build in it, a first
ever deploy, a normal upgrade, the same commit twice, `--force`, a build that will not boot, a
rollback with a database and a photograph on disk, and a copy that runs out of inodes half way.
The database and the media survive the last three, which is the property that actually matters.

`.cpanel.yml` is now one line calling the same script, so the button is harmless if anybody
clicks it.

---

## Trade-ins are distributed, and the seller can be told who has their details

`/sell-to-a-dealer` told sellers their car went to "verified dealerships in my province that buy
this kind of vehicle, no more than five", stored those words verbatim as consent evidence, and
then nothing sent them anywhere. A promise in a consent record that the code does not keep is
worse than no promise, because the record is evidence of exactly what you undertook to do.

Every clause of that sentence is now a rule in `src/lib/trade-in-matching.ts`, with a test each:
verified only, in the seller's province, buying that make, and never more than five. The cap
cannot be raised by passing a bigger limit, because it is a commitment to the seller rather than
a tuning knob.

**A dealership must opt in.** `acceptsTradeIns` defaults to false and the dealership sets it
itself. Nobody receives a stranger's name and phone number because a checkbox happened to start
on, and no dealership is sent leads it never asked for.

**Fairness is deliberate.** Selection prefers the dealerships that have had the fewest recently.
Without that the same two in Gauteng take every lead, everyone else concludes the feature does
nothing, and the seller hears from a smaller pool than they were promised.

**POPIA section 23(1)(b)** gives a data subject the right to know who has had access to their
information. A count could not answer that. Every disclosure is now a row carrying the dealership
and the timestamp, and `disclosedTo` is derived from those rows by a hook so the access list and
the audit record cannot drift apart.

That derived field is a second route into the most sensitive table on the platform, so it has
five adversarial tests of its own: the dealership it was disclosed to can read it, one it was not
cannot, naming the disclosure in a query does not widen the scope, a dealership that only had it
disclosed cannot edit it, and no dealership can write itself into the list.

**Still missing, and SMTP is why:** nobody is emailed. The dealership sees the lead when it next
looks, and a seller whose car could not be placed is not yet told, which the page promises. Both
light up when there is a mailbox to send from.

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

- **239 unit tests.** TOTP 51, plate colour 34, access control 33, finance 25, sell-to-a-dealer
  schema 20, trade-in matching 18, query parsing 17, contrast 15, slugs 14, formatting 12.
- **219 end-to-end tests** across desktop and mobile: 39 adversarial, 25 on the agency site,
  16 on two-factor.
- **Zero axe violations** under WCAG 2.0 A through 2.2 AA on home, search, filtered search, the
  vehicle page, the enquiry dialog, and all seven agency templates.
- **No horizontal overflow** at 320, 375, 768, 1024, 1440 or 1920.
- **62 contrast pairs** passing in both themes, computed from the tokens rather than eyeballed.
- **Theme correct in all three states**, including with JavaScript disabled.
- **No VIN anywhere in a public response**, asserted rather than assumed.
- **A password alone will not sign in an account that has enrolled in two-factor**, asserted on
  the token rather than the screen.
- **Every link in the header and footer resolves**, on both front doors.
- **No rating, review or invented metric is emitted anywhere on the agency site.**
- **A dealership cannot read or write another dealership's leads, stock or staff**, proven over
  HTTP rather than argued from the source.
- **A dealership cannot verify itself, rate itself, or claim an accreditation**, same.
- **No VIN reaches the public or another dealership**, asserted against a row that has one.
- **The sitemap lists nothing robots.txt blocks.**
- **Largest Contentful Paint under the 2 second budget.** Median of seven cold loads against a
  production build at 390px, CPU throttled four times, link held to 1.6Mbps and 150ms of latency,
  which is the mid-range Android in the brief.

  | Page | Before | After |
  |---|---|---|
  | Home | 2252ms | 1716ms |
  | Search | 2276ms | 1932ms |

- **Warm search under 100ms**, down from 215ms, measured over eight requests per URL.
