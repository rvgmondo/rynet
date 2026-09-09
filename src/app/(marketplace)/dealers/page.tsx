import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { relName } from "@/lib/relations";

/**
 * Rendered on demand, not prerendered.
 *
 * This reads the dealership list from the database. Prerendering it would freeze that list
 * at build time, so a newly verified dealership would not appear until the next deploy, and
 * it would fail the build outright anywhere there is no database, which is exactly what
 * happened in CI.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified dealerships",
  description:
    "Every dealership on Rynet is a registered business we have checked. Browse them by province, see their stock and their trading hours.",
  alternates: { canonical: "/dealers" },
};

/**
 * The dealership directory.
 *
 * Only verified dealerships appear, and that is enforced in the collection's access rule
 * rather than filtered here. A pending or suspended dealership is invisible rather than
 * greyed out: on a platform whose whole promise is "verified only", a half-listed business
 * is worse than none.
 */
export default async function DealersPage() {
  const payload = await getPayload({ config });

  const dealers = await payload.find({
    collection: "dealers",
    where: { verificationStatus: { equals: "verified" } },
    sort: "tradingName",
    limit: 100,
    depth: 0,
  });

  const branches = await payload.find({
    collection: "branches",
    limit: 500,
    depth: 1,
  });

  const counts = await Promise.all(
    dealers.docs.map(async (d) => ({
      id: d.id,
      count: (
        await payload.count({
          collection: "vehicles",
          where: { and: [{ dealer: { equals: d.id } }, { status: { equals: "live" } }] },
        })
      ).totalDocs,
    })),
  );
  const countFor = new Map(counts.map((c) => [c.id, c.count]));

  const branchesFor = new Map<number, typeof branches.docs>();
  for (const branch of branches.docs) {
    const dealerId = typeof branch.dealer === "number" ? branch.dealer : branch.dealer?.id;
    if (!dealerId) continue;
    branchesFor.set(dealerId, [...(branchesFor.get(dealerId) ?? []), branch]);
  }

  return (
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/dealers", label: "Dealerships" }]} />

      <div className="mt-5 max-w-2xl">
        <h1 className="text-3xl">Verified dealerships</h1>
        <p className="mt-3 text-ink-secondary">
          Every dealership here is a registered business with a trading address we have checked.
          There are no private sellers on Rynet, so whoever you deal with has a name, a premises and
          something to lose.{" "}
          <Link
            href="/how-verification-works"
            className="font-semibold text-accent hover:underline"
          >
            What we check
          </Link>
        </p>
      </div>

      <ul className="rn-grid mt-8">
        {dealers.docs.map((dealer) => {
          const dealerBranches = branchesFor.get(dealer.id) ?? [];
          const primary = dealerBranches.find((b) => b.isPrimary) ?? dealerBranches[0];
          const count = countFor.get(dealer.id) ?? 0;

          return (
            <li key={dealer.id}>
              <article className="rn-card h-full p-5">
                <h2 className="text-lg leading-snug">
                  <Link href={`/dealers/${dealer.slug}`} className="after:absolute after:inset-0">
                    {dealer.tradingName}
                  </Link>
                </h2>

                {/* The word inside a ruled box, not a tick. A glyph next to a name is what
                    every template ships and it persuades nobody; the claim is checkable
                    because a dealership cannot publish stock until all three checks pass. */}
                <p className="rn-label mt-3 inline-block border border-current px-1.5 py-1">
                  Verified
                </p>

                {primary ? (
                  <p className="rn-card__muted mt-4 text-sm">
                    <span>
                      {relName(primary.city)}
                      {relName(primary.province) ? `, ${relName(primary.province)}` : ""}
                      {dealerBranches.length > 1 ? (
                        <span>
                          {" "}
                          and {dealerBranches.length - 1} other branch
                          {dealerBranches.length > 2 ? "es" : ""}
                        </span>
                      ) : null}
                    </span>
                  </p>
                ) : null}

                <hr className="rn-card__rule mt-auto" />
                <p className="mt-4 flex items-baseline justify-between gap-3">
                  <span className="rn-label rn-card__muted">In stock</span>
                  <span className="rn-figure">{count}</span>
                </p>

                {dealer.isDemonstration ? (
                  <p className="rn-label rn-label--light rn-card__muted mt-2">
                    Demonstration listing, not a real business.
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
