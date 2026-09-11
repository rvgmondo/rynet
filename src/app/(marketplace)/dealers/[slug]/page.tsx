import config from "@payload-config";
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
    // A dealership that does not exist is not offered for indexing. `follow` stays on so the
    // stock links are still crawled once real dealerships replace the seed.
    ...(dealer.isDemonstration ? { robots: { index: false, follow: true } } : {}),
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

  /*
   * A demonstration dealership publishes no structured data.
   *
   * Every branch below carries a street address, a postal code, a telephone number, GPS
   * coordinates and trading hours. For the twelve seeded dealerships none of that describes
   * a real business, and the page says so in its own copy. Handing it to Google as an
   * AutoDealer says the opposite to the one reader that cannot see the disclaimer.
   */
  const localBusinessJsonLd = dealer.isDemonstration
    ? []
    : branches.docs.map((branch) => ({
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
      {localBusinessJsonLd.length > 0 ? (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and this is serialised from typed data we constructed.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      ) : null}

      {/*
        REDRAWN. This is the page Rynet shows a dealership when it sells them on listing, so it
        is a commercial surface, and it was a single flat band with the whole of its right-hand
        column given to one bordered box: at three branches the box ran 500px while the stock
        grid beside it ran 3,800, leaving three and a half thousand pixels of empty column. The
        address, phone and hours a buyer drives to are now a ruled band across the full width,
        directly under the header, where they are read before the stock rather than beside it.
      */}
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs
            trail={[
              { href: "/dealers", label: "Dealerships" },
              { href: `/dealers/${dealer.slug}`, label: dealer.tradingName },
            ]}
          />

          <h1 className="rn-head mt-8 max-w-[16ch]">{dealer.tradingName}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {dealer.verificationStatus === "verified" ? (
              /* The same ruled stamp the cards carry, in ink. It was a red link behind a
                 BadgeCheck glyph: the one glyph the direction names and rejects, and the only
                 red object on a page that has no other. */
              <Link
                href="/how-verification-works"
                className="rn-label inline-flex min-h-11 items-center border border-current px-2 py-1 transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse"
              >
                Verified dealership
              </Link>
            ) : null}
            <span className="rn-label tabular text-ink">
              {stock.totalDocs} {stock.totalDocs === 1 ? "vehicle" : "vehicles"} in stock
            </span>
            {cheapest ? (
              <span className="rn-label tabular text-ink-muted">from {formatRand(cheapest)}</span>
            ) : null}
            {dealer.foundedYear ? (
              <span className="rn-label text-ink-muted">Trading since {dealer.foundedYear}</span>
            ) : null}
          </div>

          {dealer.isDemonstration ? (
            /* The same sentence the cards set as a ruled label. It was a bordered box here and
               a rule there, for one fact. */
            <p className="rn-label mt-8 border-t border-line-interactive pt-4 text-ink-muted">
              Demonstration listing. This dealership is seeded example data. It is not a real
              business, and its stock is not for sale.
            </p>
          ) : null}
        </div>
      </section>

      <section
        aria-labelledby="branches-heading"
        className="container-page py-[var(--section-base)]"
      >
        <h2 id="branches-heading" className="rn-label text-ink-muted">
          {branches.docs.length === 1 ? "Where they are" : "Branches"}
        </h2>

        <div className="mt-4 grid border-t border-line md:grid-cols-2 md:gap-x-12 xl:grid-cols-3">
          {branches.docs.map((branch) => (
            <div key={branch.id} className="border-b border-line py-6">
              {branches.docs.length > 1 ? (
                <h3 className="font-display text-base font-bold">{branch.name}</h3>
              ) : null}

              <address className="mt-2 text-sm not-italic text-ink-secondary">
                {branch.addressLine1}
                {branch.suburb ? <>, {branch.suburb}</> : null}
                <br />
                {relName(branch.city)}
                {relName(branch.province) ? `, ${relName(branch.province)}` : ""}
                {branch.postalCode ? ` ${branch.postalCode}` : ""}
              </address>

              {branch.phone ? (
                <p className="mt-3">
                  <a
                    href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
                    className="rn-label inline-flex min-h-11 items-center tabular text-ink underline decoration-line-interactive underline-offset-4 hover:decoration-ink"
                  >
                    {branch.phone}
                  </a>
                </p>
              ) : null}

              {branch.email ? (
                /* `break-all` was breaking the address mid-word: it rendered as "...exam / ple".
                   `break-words` breaks at the longest opportunity the string offers and only
                   splits a word when there is no other choice. */
                <p className="mt-1">
                  <a
                    href={`mailto:${branch.email}`}
                    className="break-words text-sm text-ink-secondary underline decoration-line-interactive underline-offset-4 hover:text-ink hover:decoration-ink"
                  >
                    {branch.email}
                  </a>
                </p>
              ) : null}

              {branch.tradingHours && branch.tradingHours.length > 0 ? (
                <details className="group mt-4 border-t border-line">
                  {/* It rendered identically to the static lines above it and gave no sign at
                      all that it opened. Same fix as the specification groups on a vehicle. */}
                  <summary className="rn-label flex min-h-11 cursor-pointer items-center justify-between gap-3 text-ink-muted transition-colors duration-[var(--duration-micro)] [&::-webkit-details-marker]:hidden [&::marker]:content-[''] hover:text-ink">
                    Trading hours
                    <span aria-hidden="true" className="w-3 text-center">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">-</span>
                    </span>
                  </summary>
                  <dl className="pb-3 text-xs">
                    {DAYS.map((day) => {
                      const hours = branch.tradingHours?.find((h) => h.day === day);
                      if (!hours) return null;
                      return (
                        <div key={day} className="flex justify-between gap-4 py-1">
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
        </div>
      </section>

      {/*
        The stock, at the full width of the container rather than in a column beside an empty
        one. This is what the page is for.

        No reviews section. The dealership has none, and an empty "Reviews (0)" panel invites
        the question of whether the platform has any at all. It appears when there is something
        in it.
      */}
      <section aria-labelledby="stock-heading" className="container-page pb-[var(--section-base)]">
        <h2 id="stock-heading" className="rn-head">
          Their stock
        </h2>
        <hr className="rn-rule mt-6" />

        <div className="mt-8">
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
      </section>
    </>
  );
}
