# OPEN QUESTIONS (Phase 0)

Sixteen, batched. Where I have a recommendation I have said so, and where you do not have a strong
view, take the recommendation and I will proceed.

## Blocking. I cannot build the foundation without these.

**1. Domain split.** Marketplace on `rynet.co.za`, agency at `rynet.co.za/digital`? Or
`digital.rynet.co.za`? Or a separate domain?
*Recommendation: subfolder.* The marketplace will carry tens of thousands of URLs and will be the
only side of the business building real domain authority. A subfolder lets the agency inherit it. A
subdomain is treated as a separate site and starts from zero. The cost is that the agency feels
subordinate to the marketplace, which may be exactly wrong commercially. Your call, not mine.

**2. Hosting.** Set out in full in `docs/ARCHITECTURE.md` section 4. The short version: Vercel has a
Cape Town region, but Neon and Supabase do not, so the default Vercel-plus-Neon combination puts
your database roughly 170ms from your functions and makes the TTFB budget unreachable.
*Recommendation: Vercel Pro with functions pinned to `cpt1`, managed Postgres in AWS `af-south-1`
(Aiven or RDS), media on Cloudflare R2.* If monthly cost is the constraint, a single VPS in
`af-south-1` with Docker is the right answer instead and I will build that path properly.

**3. Payments in v1, and which gateway.**
**Stripe is not viable.** It does not support South African registered entities for ZAR settlement
or Connect payouts. If Rynet Digital is a South African company, Stripe is off the table regardless
of what the brief assumed.
Three options: (a) no billing in v1, invoice the first dealer cohort manually, add billing in Phase
6; (b) Peach Payments, which has native recurring billing and debit order support and is the
strongest local option for subscriptions; (c) Paystack, cleaner API, same-day payouts, card
recurring but weaker on debit order.
*Recommendation: (a) for v1, then (b).* Your first dealers will be hand-signed anyway, and building
billing before you know your plan structure is how you build the wrong billing.

**4. Where does launch stock come from?** Do you have dealers signed already? If so, how many, and
can you get me one real stock feed to build the import mapper against? If not, is v1 launching with
seeded demo stock, and is that stock clearly labelled as demonstration?
This changes Phase 5 completely. Building a feed importer against an imagined schema is guaranteed
rework, because South African DMS vendors have no common format.

## Materially changes the build.

**5. Dealer verification: what do we actually check?** My assumption is CIPC registration number,
VAT number where applicable, motor trade number, proof of business address, and membership of RMI,
NADA or MIWA where held, with a named human making the decision and the decision recorded. Confirm
or correct. The whole product argument rests on this being real.

**6. Agency pricing: public tiers or a qualification path?** Public numbers filter better and
convert warmer traffic. A qualification path protects your margin and suits dealer groups. I would
publish a starting-from figure with tiers and gate the rest, but this is a commercial call.

**7. Reviews and ratings.** Do we collect our own dealer reviews, import Google reviews, or ship v1
without ratings? Section 13 says never to mark up a rating we have not earned, and I agree, so if
there is no review source then `aggregateRating` is omitted entirely rather than faked.
*Recommendation: v1 collects our own, verified against a real lead, and shows no rating until a
dealer has five.*

**8. WhatsApp.** A `wa.me` deep link is free and works today. The WhatsApp Business API gives you
templated messages, delivery receipts, and lead routing into the portal inbox, but costs per
conversation and needs a Meta business verification. Which are we building?
*Recommendation: deep link in v1, API in a later phase once lead volume justifies it.*

**9. Afrikaans.** Structure only in v1, or real Afrikaans content at launch? Structure costs almost
nothing now and a great deal later, so it is scaffolded either way. Real content means translating
every template string, every taxonomy label, and every legal page, plus an `af-ZA` editorial
workflow. If it is coming within a year, tell me now.

**10. Typefaces.** Argued in `docs/DESIGN-SYSTEM.md` section 4. Montserrat for display is right and
I would keep it. Poppins as the interface and body face is, I think, a mistake on a platform that is
mostly dense numeric tables. My proposal is Montserrat for display, Inter for interface and body and
all numerals, and Poppins kept for the agency site's large marketing type where it looks good. If
you want Poppins throughout, say so and I will build it that way.

**11. Finance calculator: whose numbers?** Are we showing our own estimate with a clear disclaimer,
or integrating a real finance partner (WesBank, MFC, Absa, Nedbank MFC) whose rates we quote? These
have very different compliance profiles under the National Credit Act. Default assumption: our own
estimate, labelled an estimate, prime plus a configurable offset, total cost of credit shown, and a
disclaimer field that is required and marked "requires legal review" until a lawyer has seen it.
Prime is currently 10.5 percent on a 7.00 repo, effective 28 May 2026, and it lives in the CMS so
an admin updates it the day it moves.

**12. Trade-in valuation.** Is there a real data source (TransUnion Auto Dealers' Guide, Lightstone)
we can license, or is the estimator a lead capture form that produces a range and hands off to the
dealer? The second is honest and cheap. The first is a real product feature and a real licence fee.

## Confirm and I proceed.

**13. Analytics.** Plausible, which needs no consent banner because it collects no personal data, plus
our own server-side lead event log. GA4 would have to sit behind the POPIA consent gate and would
lose most of its data to refusals. *Recommendation: Plausible.*

**14. Email.** Resend, sending from `rynet.co.za`, which needs SPF, DKIM and DMARC records on the
domain. Who controls that DNS, and can I have access or a contact?

**15. Timeline.** Is there a launch date, or a date by which you need something live to show
dealers? `docs/DELIVERY-PLAN.md` ends with the two levers that actually move a date. I have not
assumed either.

**16. Legal review.** Privacy policy, terms, POPIA notice, cookie policy, credit disclaimer and the
dealer agreement all need a South African lawyer. I will write plain-language drafts marked
"requires legal review" and list them in `docs/CONTENT-NEEDED.md`, but none of them ships as final
without a human who is qualified signing them off. Do you have someone, or should I write the drafts
so they are cheap for a lawyer to review?
