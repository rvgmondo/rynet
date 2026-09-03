# OPEN QUESTIONS

Updated 24 August 2026 after your four answers.

## Answered

| # | Question | Your answer | What it changed |
|---|---|---|---|
| 1 | Domain split | Marketplace on the apex, agency at `rynet.co.za/digital` | `docs/SITEMAP.md` already assumed this. No change needed. |
| 2 | Hosting | Your existing cPanel with Node, as with Amico and Verboten | Large. Postgres out, SQLite in. Vercel, `cpt1`, pnpm and per-PR previews all removed. Node 22, not 24. See `docs/ARCHITECTURE.md` sections 3 and 5. |
| 3 | Billing | PayFast, shipping in v1 | Verboten's PayFast integration ports across. Plans, subscriptions and invoices added to the content model. Lands in Phase 6. |
| 4 | Launch stock | No dealers yet, seeded demonstration stock | Phase 5 inverts: manual capture and the licence disc reader first, importer built format-agnostic against fixtures and honestly marked unvalidated until a real feed exists. Phase 10's seed becomes launch content, not scaffolding. |

## New, and created by the hosting decision

These two are genuinely load-bearing and I cannot check them from here. Both are questions for your
host, and both take one support ticket.

**A. Is the cPanel home directory on local disk or on NFS?**
SQLite's file locking is safe on local disk and unsafe on NFS. Almost every cPanel host uses local
disk, but "almost every" is not a good enough basis for the single file that will hold every
dealer's stock. If the answer is NFS, SQLite is off the table and we need managed Postgres in AWS
`af-south-1`, which changes the cost picture.

**B. Does Passenger run one Node process or several?**
Several processes writing one SQLite file is fine in WAL mode on local disk. It also means the
in-memory caches and the view-counter buffer are per-process, which changes how the flush job has to
work and whether a Next cache tag invalidation reaches every worker. I need to know before I design
the counter flush, not after.

**C. Two smaller ones for the same ticket.** What is the disk quota and the inode limit on the
account? And has the host's PostgreSQL moved off version 10 since Amico was deployed? If it is now
14 or later, SQLite becomes optional rather than forced, and I would want to reconsider.

## Still open, and materially changes the build

**5. Dealer verification: what do we actually check?** My assumption is CIPC registration number,
VAT number where applicable, motor trade number, proof of business address, and membership of RMI,
NADA or MIWA where held, with a named human making the decision and the decision recorded. Confirm
or correct. The whole product argument rests on this being real.

**6. Agency pricing: public tiers or a qualification path?** Public numbers filter better and
convert warmer traffic. A qualification path protects your margin and suits dealer groups. I would
publish a starting-from figure with tiers and gate the rest, but this is a commercial call.

**7. Dealer plan structure.** Now that billing ships in v1, I need the actual plans: how many tiers,
what each costs per month, what the listing limit is on each, and what the higher tiers unlock
(microsite theming, extra branches, extra users, placement). I can build the plan machinery without
this, but I cannot seed it.

**8. Reviews and ratings.** Collect our own, import Google, or ship v1 without? Never mark up a
rating we have not earned, so no source means `aggregateRating` is omitted entirely rather than
faked. *Recommendation: v1 collects our own, verified against a real lead, and shows no rating until
a dealer has five.* On seeded demonstration dealers, no ratings at all.

**9. WhatsApp.** A `wa.me` deep link is free and works today. The WhatsApp Business API gives
templated messages, delivery receipts and lead routing into the portal inbox, but costs per
conversation and needs Meta business verification. *Recommendation: deep link in v1.*

**10. Afrikaans.** Structure only in v1, or real Afrikaans content at launch? Structure costs almost
nothing now and a great deal later, so it is scaffolded either way. Real content means translating
every template string, every taxonomy label and every legal page.

**11. Typefaces.** Argued in `docs/DESIGN-SYSTEM.md` section 4. Montserrat for display is right and
I would keep it. Poppins as the interface and body face is, I think, a mistake on a platform that is
mostly dense numeric tables. My proposal is Montserrat for display, Inter for interface, body and
all numerals, and Poppins kept for the agency site's large marketing type. If you want Poppins
throughout, say so and I will build it that way. **This is the last design question standing and it
gates the component library in Phase 1b.**

**12. Finance calculator: whose numbers?** Our own estimate with a clear disclaimer, or a real
finance partner whose rates we quote? Very different compliance profiles under the National Credit
Act. Default assumption: our own estimate, labelled an estimate, prime plus a configurable offset,
total cost of credit shown, and a disclaimer field that is required and marked "requires legal
review" until a lawyer has seen it. Prime is 10.5 percent on a 7.00 repo, effective 28 May 2026, and
it lives in the CMS so an admin updates it the day it moves.

**13. Trade-in valuation.** A licensed data source (TransUnion Auto Dealers' Guide, Lightstone) is a
real product feature and a real licence fee. A lead-capture form that produces a range and hands off
to the dealer is honest and free. Which?

## Confirm and I proceed

**14. Analytics.** Plausible, which needs no consent banner because it collects no personal data,
plus our own server-side lead event log. GA4 would sit behind the POPIA consent gate and lose most
of its data to refusals.

**15. Email.** cPanel SMTP through nodemailer, matching Amico and Verboten, sending from
`rynet.co.za`. Needs SPF, DKIM and DMARC on the domain. Who controls that DNS? If shared-host
deliverability disappoints, Resend is the fallback and it is a config change.

**16. Cloudflare.** I want the domain on Cloudflare for the CDN cache your host does not provide,
plus WAF, rate limiting, Turnstile for public forms, and R2 for the vehicle photography. That last
one is not optional at marketplace scale: tens of thousands of small image files will hit the
account's inode ceiling long before its disk quota. Confirm you are happy to move DNS.

**17. Legal review.** Privacy policy, terms, POPIA notice, cookie policy, credit disclaimer and the
dealer agreement all need a South African lawyer. I will write plain-language drafts marked
"requires legal review" and list them in `docs/CONTENT-NEEDED.md`. Do you have someone?

**18. Sequencing.** With no dealers signed, I think the agency site should move ahead of the
marketplace, since it is what you send a dealer principal first and it is the only phase that earns
on its own. Reasoning at the end of `docs/DELIVERY-PLAN.md`. Say the word and the plan renumbers.
