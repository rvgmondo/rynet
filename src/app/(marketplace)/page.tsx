import { BadgeCheck, ChevronRight, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Marketplace home.
 *
 * Direction is "Forecourt": light, dense, silver hairline structure, red reserved for
 * actions. The hero leads with the search, not with a photograph, for two reasons. The
 * first is that a buyer arriving here wants to start filtering, and every scroll they have
 * to do first is friction. The second is the performance budget: a full-bleed hero image
 * becomes the LCP element, and 2.0s on a throttled mid-tier mobile is not a lot of room.
 */
export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-page py-[var(--section-base)]">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[var(--tracking-widest)] text-accent">
              <BadgeCheck aria-hidden="true" className="size-4" />
              Verified dealerships only
            </p>
            <h1 className="mt-4 text-4xl">
              Every car here comes from a dealership we have checked.
            </h1>
            <p className="measure mt-5 text-lg text-ink-secondary">
              No private sellers. No dummy listings. No arriving at a house in Benoni to find the
              car was sold last week. Every listing on Rynet traces back to a registered dealership
              with a name, an address and a trading licence we have seen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/cars">
                  Search all stock
                  <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/how-verification-works">How verification works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="trust-heading" className="border-b border-line bg-surface-raised">
        <div className="container-page py-[var(--section-tight)]">
          <h2 id="trust-heading" className="sr-only">
            What verified means
          </h2>
          <ul className="grid gap-8 sm:grid-cols-3">
            {[
              {
                Icon: ShieldCheck,
                title: "A registered business, checked",
                body: "We verify the CIPC registration, the trading address and the motor trade number before a single car goes live.",
              },
              {
                Icon: FileCheck2,
                title: "Stock that is actually there",
                body: "Dealerships keep their listings current through their own portal, and stale stock is flagged and pulled rather than left to waste your Saturday.",
              },
              {
                Icon: BadgeCheck,
                title: "One dealership per listing",
                body: "Every car belongs to exactly one verified dealership. You always know who you are dealing with before you pick up the phone.",
              },
            ].map(({ Icon, title, body }) => (
              <li key={title}>
                <Icon aria-hidden="true" className="size-6 text-accent" />
                <h3 className="mt-3 text-base">{title}</h3>
                <p className="mt-2 text-sm text-ink-secondary">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/*
        Everything below the fold on the finished home page is bound to live queries:
        featured stock, popular makes with real counts, dealer spotlights, editorial. Those
        arrive with Phase 3, when the search layer they read from exists. Shipping a
        hardcoded grid of pretend cars now would mean throwing it away then, and it would
        put invented stock in front of anyone who opened the site in the meantime.
      */}
    </>
  );
}
