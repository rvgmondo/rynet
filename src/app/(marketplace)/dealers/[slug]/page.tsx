import config from "@payload-config";
import { BadgeCheck, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ResultsGrid } from "@/components/vehicles/results-grid";
import { formatRand } from "@/lib/format";
import { relName } from "@/lib/relations";
import { toCard } from "@/lib/search";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const DAY_LABEL: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

async function loadDealer(slug: string) {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "dealers",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  });
  return found.docs[0] ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const dealer = await loadDealer(slug);
  if (!dealer) return { title: "Dealership not found" };

  return {
    title: `${dealer.tradingName}, verified dealership`,
    description:
      dealer.aboutRichText && typeof dealer.aboutRichText === "object"
        ? `${dealer.tradingName} is a verified dealership on Rynet. See their current stock, branches and trading hours.`
        : `${dealer.tradingName} is a verified dealership on Rynet. See their current stock, branches and trading hours.`,
    alternates: { canonical: `/dealers/${dealer.slug}` },
  };
}

/**
 * A dealership microsite.
 *
 * The verification badge is the point of the page and it links to what verification
 * actually involves, because a badge that links nowhere is decoration.
 *
 * `LocalBusiness` structured data per branch: address, geo and opening hours. No
 * `aggregateRating`, because no reviews have been collected. Marking up a rating that does
 * not exist is the single worst thing to publish on a trust-led platform, and Google
 * penalises it besides.
 *
 * Theme control from the dealer portal lands with the portal. The `theme.accent` field
 * already exists and is contrast-validated on save, so a dealership cannot choose a colour
 * that makes their own microsite unreadable.
 */
export default async function DealerPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const dealer = await loadDealer(slug);
  if (!dealer) notFound();

  const payload = await getPayload({ config });
  const page = Math.max(
    1,
    Number((Array.isArray(query.page) ? query.page[0] : query.page) ?? 1) || 1,
  );

  const [branches, stock] = await Promise.all([
    payload.find({
      collection: "branches",
      where: { dealer: { equals: dealer.id } },
      sort: "-isPrimary",
      limit: 25,
      depth: 1,
    }),
    payload.find({
      collection: "vehicles",
      where: { and: [{ dealer: { equals: dealer.id } }, { status: { equals: "live" } }] },
      sort: "-publishedAt",
      limit: 24,
      page,
      depth: 2,
    }),
  ]);

  const cheapest = stock.docs.length ? Math.min(...stock.docs.map((v) => v.price)) : null;

  const localBusinessJsonLd = branches.docs.map((branch) => ({
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: `${dealer.tradingName}${branches.docs.length > 1 ? `, ${branch.name}` : ""}`,
    url: `${process.env.NEXT_PUBLIC_SERVER_URL ?? ""}/dealers/${dealer.slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: [branch.addressLine1, branch.addressLine2].filter(Boolean).join(", "),
      addressLocality: relName(branch.city) ?? undefined,
      addressRegion: relName(branch.province) ?? undefined,
      postalCode: branch.postalCode ?? undefined,
      addressCountry: "ZA",
    },
    ...(typeof branch.latitude === "number" && typeof branch.longitude === "number"
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: branch.latitude,
            longitude: branch.longitude,
          },
        }
      : {}),
    telephone: branch.phone ?? undefined,
    openingHoursSpecification: (branch.tradingHours ?? [])
      .filter((h) => !h.closed && h.opensAt && h.closesAt)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAY_LABEL[h.day ?? ""] ?? ""}`,
        opens: h.opensAt,
        closes: h.closesAt,
      })),
    // No aggregateRating. None has been earned.
  }));

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      <div className="container-page py-[var(--section-tight)]">
        <Breadcrumbs
          trail={[
            { href: "/dealers", label: "Dealerships" },
            { href: `/dealers/${dealer.slug}`, label: dealer.tradingName },
          ]}
        />

        <header className="mt-5 border-b border-line pb-8">
          <h1 className="text-4xl">{dealer.tradingName}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {dealer.verificationStatus === "verified" ? (
              <Link
                href="/how-verification-works"
                className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
              >
                <BadgeCheck aria-hidden="true" className="size-4" />
                Verified dealership
              </Link>
            ) : null}
            {dealer.foundedYear ? (
              <span className="text-ink-secondary">Trading since {dealer.foundedYear}</span>
            ) : null}
            <span className="tabular font-semibold">
              {stock.totalDocs} {stock.totalDocs === 1 ? "vehicle" : "vehicles"} in stock
            </span>
            {cheapest ? (
              <span className="text-ink-secondary">
                from <span className="tabular">{formatRand(cheapest)}</span>
              </span>
            ) : null}
          </div>

          {dealer.isDemonstration ? (
            <p className="mt-4 rounded-md border border-line-interactive p-3 text-sm text-ink-muted">
              <strong className="font-semibold">Demonstration listing.</strong> This dealership is
              seeded example data. It is not a real business, and its stock is not for sale.
            </p>
          ) : null}
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            <h2 className="text-2xl">Their stock</h2>
            <div className="mt-5">
              <ResultsGrid
                vehicles={stock.docs.map(toCard)}
                page={stock.page ?? 1}
                totalPages={stock.totalPages}
                buildHref={(p) =>
                  p > 1 ? `/dealers/${dealer.slug}?page=${p}` : `/dealers/${dealer.slug}`
                }
                emptyTitle="Nothing in stock right now"
                emptyBody="This dealership has no live listings at the moment. Stock changes daily, and there is plenty from other verified dealerships in the meantime."
                emptyAction="Browse all stock"
              />
            </div>
          </div>

          <aside className="space-y-6">
            <section
              aria-labelledby="branches-heading"
              className="rounded-lg border border-line p-5"
            >
              <h2 id="branches-heading" className="text-lg">
                {branches.docs.length === 1 ? "Where they are" : "Branches"}
              </h2>

              {branches.docs.map((branch) => (
                <div
                  key={branch.id}
                  className="mt-4 border-t border-line pt-4 first:border-0 first:pt-0"
                >
                  {branches.docs.length > 1 ? (
                    <h3 className="text-sm font-bold">{branch.name}</h3>
                  ) : null}

                  <address className="mt-1.5 space-y-2 text-sm not-italic text-ink-secondary">
                    <span className="flex items-start gap-2">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-ink-muted"
                      />
                      <span>
                        {branch.addressLine1}
                        {branch.suburb ? <>, {branch.suburb}</> : null}
                        <br />
                        {relName(branch.city)}
                        {relName(branch.province) ? `, ${relName(branch.province)}` : ""}
                        {branch.postalCode ? ` ${branch.postalCode}` : ""}
                      </span>
                    </span>

                    {branch.phone ? (
                      <span className="flex items-center gap-2">
                        <Phone aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                        <a
                          href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
                          className="tabular hover:text-accent"
                        >
                          {branch.phone}
                        </a>
                      </span>
                    ) : null}

                    {branch.email ? (
                      <span className="flex items-center gap-2">
                        <Mail aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                        <a href={`mailto:${branch.email}`} className="break-all hover:text-accent">
                          {branch.email}
                        </a>
                      </span>
                    ) : null}
                  </address>

                  {branch.tradingHours && branch.tradingHours.length > 0 ? (
                    <details className="mt-3">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                        <Clock aria-hidden="true" className="size-4 text-ink-muted" />
                        Trading hours
                      </summary>
                      <dl className="mt-1 space-y-0.5 text-xs">
                        {DAYS.map((day) => {
                          const hours = branch.tradingHours?.find((h) => h.day === day);
                          if (!hours) return null;
                          return (
                            <div key={day} className="flex justify-between gap-4 py-0.5">
                              <dt className="text-ink-muted">{DAY_LABEL[day]}</dt>
                              <dd className="tabular">
                                {hours.closed ? "Closed" : `${hours.opensAt} to ${hours.closesAt}`}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </details>
                  ) : null}
                </div>
              ))}
            </section>

            {/*
              No reviews section. The dealership has none, and an empty "Reviews (0)" panel
              invites the question of whether the platform has any at all. It appears when
              there is something in it.
            */}
          </aside>
        </div>
      </div>
    </>
  );
}
