import config from "@payload-config";
import { BadgeCheck, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { relName } from "@/lib/relations";

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

      <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dealers.docs.map((dealer) => {
          const dealerBranches = branchesFor.get(dealer.id) ?? [];
          const primary = dealerBranches.find((b) => b.isPrimary) ?? dealerBranches[0];
          const count = countFor.get(dealer.id) ?? 0;

          return (
            <li key={dealer.id}>
              <article className="group relative flex h-full flex-col rounded-lg border border-line p-5 transition-shadow duration-[var(--duration-element)] hover:shadow-(--rn-shadow-2)">
                <h2 className="text-lg leading-snug">
                  <Link
                    href={`/dealers/${dealer.slug}`}
                    className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
                  >
                    {dealer.tradingName}
                  </Link>
                </h2>

                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <BadgeCheck aria-hidden="true" className="size-4" />
                  Verified
                </p>

                {primary ? (
                  <p className="mt-3 flex items-start gap-1.5 text-sm text-ink-secondary">
                    <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                    <span>
                      {relName(primary.city)}
                      {relName(primary.province) ? `, ${relName(primary.province)}` : ""}
                      {dealerBranches.length > 1 ? (
                        <span className="text-ink-muted">
                          {" "}
                          and {dealerBranches.length - 1} other branch
                          {dealerBranches.length > 2 ? "es" : ""}
                        </span>
                      ) : null}
                    </span>
                  </p>
                ) : null}

                <p className="mt-auto pt-4 text-sm font-semibold tabular">
                  {count} {count === 1 ? "vehicle" : "vehicles"} in stock
                </p>

                {dealer.isDemonstration ? (
                  <p className="mt-2 text-2xs text-ink-muted">
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
