import config from "@payload-config";
import { ArrowRight, CalendarDays, Car, Layers, MapPin, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload, type Where } from "payload";

import { aboutParagraphs, firstSentence } from "@/components/dealers/about-text";
import { BranchCard, DealerContactPanel } from "@/components/dealers/dealer-contact";
import { DealerMonogram } from "@/components/dealers/dealer-monogram";
import { carsCount, joinNames, makesSummary } from "@/components/dealers/names";
import { SellToDealerBand } from "@/components/dealers/sell-band";
import {
  type BodyFacet,
  STOCK_SORTS,
  StockToolbar,
  stockHref,
} from "@/components/dealers/stock-toolbar";
import { DAY_LABEL } from "@/components/dealers/trading-hours";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, DealershipStatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { EmptyState } from "@/components/ui/empty-state";
import { type KeyFact, KeyFacts } from "@/components/ui/key-facts";
import { Notice } from "@/components/ui/notice";
import { Pagination } from "@/components/vehicles/pagination";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { formatRand } from "@/lib/format";
import { relId, relName } from "@/lib/relations";
import { SORTS, safePage, toCard } from "@/lib/search";
import type { Dealer } from "@/payload-types";

type Params = Promise<{ slug: string }>;

/**
 * Twelve cards a page, not the search's twenty-four. A dealership page is read on a phone one card
 * to a row, and twenty-four made it thirteen screens long with the branches and the footer out of
 * reach; the pagination and the body-type chips carry the rest.
 */
const PER_PAGE = 12;
type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || null;

/**
 * Only a verified dealership has a public page, the same rule the directory and the
 * collection's read access apply. A pending or suspended dealership answers 404 rather than
 * rendering a profile nobody has approved.
 */
async function loadDealer(slug: string) {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "dealers",
    where: {
      and: [{ slug: { equals: slug } }, { verificationStatus: { equals: "verified" } }],
    },
    limit: 1,
    depth: 1,
  });
  return found.docs[0] ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const dealer = await loadDealer(slug);
  if (!dealer) return { title: "Dealership not found" };

  const about = firstSentence(aboutParagraphs(dealer.aboutRichText));

  return {
    // A demonstration dealership is never called verified, in the tab title or anywhere else.
    title: dealer.isDemonstration
      ? `${dealer.tradingName}, demonstration dealership`
      : `${dealer.tradingName}, verified dealership`,
    description: dealer.isDemonstration
      ? `${dealer.tradingName} is a demonstration dealership on Rynet, showing how a dealership's stock, branches and trading hours appear. It is not a real business.`
      : (about ??
        `${dealer.tradingName} is a verified dealership on Rynet. See their current stock, branches and trading hours.`),
    alternates: { canonical: `/dealers/${dealer.slug}` },
    // A dealership that does not exist is not offered for indexing. `follow` stays on so the
    // stock links are still crawled once real dealerships replace the seed.
    ...(dealer.isDemonstration ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * The registration details on record, for a real dealership only. Rows with no value are left out.
 *
 * Worded as "on record", not "checked": a dealership can still edit its registered name and
 * numbers after it is approved (only memberships and the status are staff-only fields), so a
 * sentence saying Rynet checked what is printed here could quietly stop being true.
 */
function RegistrationRecord({ dealer }: { dealer: Dealer }) {
  const memberships = (dealer.accreditations ?? [])
    .map((a) => relName(a))
    .filter((name): name is string => Boolean(name));
  const rows = [
    { label: "Registered name", value: dealer.legalName },
    { label: "CIPC registration", value: dealer.registrationNumber },
    { label: "VAT number", value: dealer.vatNumber },
    { label: "Motor trade number", value: dealer.motorTradeNumber },
    { label: "Industry membership", value: memberships.length ? joinNames(memberships) : null },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));
  if (rows.length === 0) return null;

  return (
    <div className="mt-8 rounded-md border border-line bg-page p-4 sm:p-5">
      <h2 className="text-base font-semibold text-heading">Registration details</h2>
      <p className="mt-1 text-sm text-muted">
        As recorded on this dealership's Rynet account.{" "}
        <Link href="/how-verification-works" className="rn-link">
          What we check before a dealership can list
        </Link>
      </p>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted">{row.label}</dt>
            <dd className="mt-0.5 font-semibold text-heading tabular">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * A dealership's page.
 *
 * The first screen answers who they are and how to reach them: the monogram, the name, the
 * status badge, where they are, what they stock and at what prices, and a contact panel with
 * call, WhatsApp and directions. Their stock follows straight after, as the same cards the search
 * uses, with body-type chips and a sort that work without JavaScript, so on a laptop the first
 * row of cards starts inside the first screen. A group with several branches lists them after
 * the stock, and the page closes on a band for the reader who came to sell.
 *
 * HONESTY. A demonstration dealership carries "Demo dealership", never a verified badge, and
 * one calm notice under its name. It shows no registration record (the seeded legal names and
 * memberships were never checked, and printing them as checked facts would be fabrication), and
 * its contact panel offers no call, WhatsApp or directions. The link to /sell-to-a-dealer says
 * "a dealership", not "this dealership", because that form goes to a shortlist of matching
 * dealerships in the seller's province and cannot be pointed at one.
 *
 * `LocalBusiness` structured data per branch: address, geo and opening hours. No
 * `aggregateRating`, because no reviews have been collected. Marking up a rating that does not
 * exist is the single worst thing to publish on a trust-led platform, and Google penalises it
 * besides.
 *
 * From 640px a strip of four photographs from the stock on this page runs under the key facts, so
 * the header shows what the dealership sells rather than only text. They are decorative (the
 * cards below carry the names), lazy, and not drawn on a phone, where the cards follow at once.
 *
 * PERFORMANCE. No image is preloaded. On a phone the whole first screen is text, so the headline
 * is the largest paint, and preloading a card photograph below the fold would only compete with
 * it. Every card keeps `content-visibility: auto` through `.rn-grid`.
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

  const now = new Date();
  const payload = await getPayload({ config });
  const page = safePage(one(query.page));
  const requestedSort = one(query.sort);
  const sort = requestedSort && SORTS[requestedSort] ? requestedSort : "newest";
  const requestedBody = one(query.body);
  const live: Where[] = [{ dealer: { equals: dealer.id } }, { status: { equals: "live" } }];

  const [branches, inventory] = await Promise.all([
    payload.find({
      collection: "branches",
      where: { dealer: { equals: dealer.id } },
      sort: "-isPrimary",
      limit: 25,
      depth: 1,
    }),
    // Every live car, four columns only, for the figures and the body-type counts. The page
    // of cards below is a separate query, so the figures never change with the page number.
    payload.find({
      collection: "vehicles",
      where: { and: live },
      pagination: false,
      depth: 0,
      select: { make: true, bodyType: true, price: true, priceType: true },
    }),
  ]);

  const unique = (ids: (number | null)[]) =>
    [...new Set(ids)].filter((id): id is number => id !== null);
  const makeIds = unique(inventory.docs.map((v) => relId(v.make)));
  const bodyIds = unique(inventory.docs.map((v) => relId(v.bodyType)));

  const [makes, bodyTypes] = await Promise.all([
    makeIds.length
      ? payload.find({
          collection: "makes",
          where: { id: { in: makeIds } },
          limit: makeIds.length,
          depth: 0,
        })
      : Promise.resolve({ docs: [] as { id: number; name: string; slug: string }[] }),
    bodyIds.length
      ? payload.find({
          collection: "body-types",
          where: { id: { in: bodyIds } },
          limit: bodyIds.length,
          depth: 0,
        })
      : Promise.resolve({ docs: [] as { id: number; name: string; slug: string }[] }),
  ]);

  const total = inventory.docs.length;
  const makeCounts = new Map<number, number>();
  const bodyCounts = new Map<number, number>();
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  for (const vehicle of inventory.docs) {
    const makeId = relId(vehicle.make);
    const bodyId = relId(vehicle.bodyType);
    if (makeId !== null) makeCounts.set(makeId, (makeCounts.get(makeId) ?? 0) + 1);
    if (bodyId !== null) bodyCounts.set(bodyId, (bodyCounts.get(bodyId) ?? 0) + 1);
    if (vehicle.priceType !== "poa" && typeof vehicle.price === "number" && vehicle.price > 0) {
      minPrice = minPrice === null ? vehicle.price : Math.min(minPrice, vehicle.price);
      maxPrice = maxPrice === null ? vehicle.price : Math.max(maxPrice, vehicle.price);
    }
  }

  const makeNames = makes.docs
    .map((make) => ({ name: make.name, count: makeCounts.get(make.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .map((make) => make.name);

  const bodies: BodyFacet[] = bodyTypes.docs
    .map((body) => ({ slug: body.slug, name: body.name, count: bodyCounts.get(body.id) ?? 0 }))
    .filter((body) => body.count > 0)
    .sort((a, b) => b.count - a.count);
  const activeBody = bodyTypes.docs.find((body) => body.slug === requestedBody) ?? null;

  const stock = await payload.find({
    collection: "vehicles",
    where: {
      and: [...live, ...(activeBody ? [{ bodyType: { equals: activeBody.id } }] : [])],
    },
    sort: SORTS[sort],
    limit: PER_PAGE,
    page,
    depth: 2,
  });
  const cards = stock.docs.map(toCard);
  const strip = cards
    .map((card) => card.photo)
    .filter(
      (photo, index, all): photo is NonNullable<typeof photo> =>
        Boolean(photo) && all.findIndex((other) => other?.url === photo?.url) === index,
    )
    .slice(0, 4);

  const primary = branches.docs.find((b) => b.isPrimary) ?? branches.docs[0] ?? null;
  const branchCount = branches.docs.length;
  const isDemonstration = Boolean(dealer.isDemonstration);
  const about = aboutParagraphs(dealer.aboutRichText);

  const facts: KeyFact[] = [
    { icon: Car, label: "Cars in stock", value: total === 0 ? "None right now" : String(total) },
    ...(minPrice !== null && maxPrice !== null
      ? [
          {
            icon: Tag,
            label: "Price range",
            value:
              minPrice === maxPrice ? (
                <span className="whitespace-nowrap">{formatRand(minPrice)}</span>
              ) : (
                <>
                  <span className="whitespace-nowrap">{formatRand(minPrice)}</span> to{" "}
                  <span className="whitespace-nowrap">{formatRand(maxPrice)}</span>
                </>
              ),
          },
        ]
      : []),
    ...(makeNames.length
      ? [{ icon: Layers, label: "Makes in stock", value: makesSummary(makeNames) ?? "" }]
      : []),
    ...(dealer.foundedYear
      ? [{ icon: CalendarDays, label: "Trading since", value: String(dealer.foundedYear) }]
      : []),
  ];

  const sortLabel = STOCK_SORTS.find((option) => option.value === sort)?.label ?? "Newest listed";
  const from = stock.totalDocs === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, stock.totalDocs);

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

      <section className="border-b border-line bg-card">
        <div className="container-page pt-6 pb-[var(--section-tight)] sm:pt-8">
          {/* Visible trail is Home and Dealerships; the name is the headline right below. */}
          <Breadcrumbs
            trail={[
              { href: "/dealers", label: "Dealerships" },
              { href: `/dealers/${dealer.slug}`, label: dealer.tradingName },
            ]}
          />

          <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-16">
            <div className="min-w-0">
              {/*
                The name block. On a phone the monogram shares a row with the badges and the name
                runs full width beneath, so a long trading name is never squeezed beside a tile;
                from 640px the monogram sits to the left of all three. The heading comes first in
                the source, so a screen reader meets the name before the badges.
              */}
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 sm:gap-x-6">
                <DealerMonogram
                  name={dealer.tradingName}
                  size="lg"
                  className="col-start-1 row-start-1 sm:row-span-3"
                />
                <h1 className="rn-h1 col-span-2 row-start-2 mt-4 sm:col-span-1 sm:col-start-2 sm:mt-1.5">
                  {dealer.tradingName}
                </h1>
                <div className="col-start-2 row-start-1 flex flex-wrap gap-2 sm:self-end">
                  <DealershipStatusBadge isDemonstration={isDemonstration} />
                  {branchCount > 1 ? <Badge>{branchCount} branches</Badge> : null}
                </div>
                {primary ? (
                  <p className="col-span-2 row-start-3 mt-2 flex items-start gap-2 self-start text-base text-body sm:col-span-1 sm:col-start-2">
                    <MapPin
                      aria-hidden="true"
                      className="mt-1 size-[1.125rem] shrink-0 text-muted"
                    />
                    <span>
                      {[primary.suburb, relName(primary.city), relName(primary.province)]
                        .filter((part, index, parts) => part && parts.indexOf(part) === index)
                        .join(", ")}
                      {branchCount > 1
                        ? `, and ${branchCount - 1} more ${branchCount === 2 ? "branch" : "branches"}`
                        : null}
                    </span>
                  </p>
                ) : null}
              </div>

              {isDemonstration ? (
                <Notice
                  compact
                  title="Demonstration dealership. Not a real business, and nothing here is for sale."
                  details="What that means"
                  className="mt-6 max-w-3xl"
                >
                  This dealership is example data, created to show how a dealership page works on
                  Rynet, so it has no registration record. Car photographs show the model, not the
                  individual car.
                </Notice>
              ) : null}

              {about.length > 0 ? (
                <div className="mt-6 max-w-[62ch] space-y-3 text-base text-body sm:text-lg">
                  {about.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 border-t border-line pt-6">
                <h2 className="sr-only">At a glance</h2>
                <KeyFacts items={facts} variant="grid" />
              </div>

              {/*
                On a phone and a tablet the contact panel stacks under this column, which put the
                first car two screens down. One button straight to the stock keeps it on the first.
              */}
              {total > 0 ? (
                <a
                  href="#stock-heading"
                  className={buttonClasses({
                    variant: "secondary",
                    size: "md",
                    block: "mobile",
                    className: "mt-6 lg:hidden",
                  })}
                >
                  See their {carsCount(total)}
                  <ArrowRight aria-hidden="true" />
                </a>
              ) : null}

              {strip.length > 0 ? (
                <div aria-hidden="true" className="mt-8 hidden grid-cols-4 gap-2 sm:grid">
                  {strip.map((photo) => (
                    <img
                      key={photo.url}
                      src={photo.url}
                      alt=""
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full rounded-md bg-subtle object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {isDemonstration ? null : <RegistrationRecord dealer={dealer} />}

              {isDemonstration ? null : (
                <Link href="/how-verification-works" className="rn-link-arrow mt-6">
                  How Rynet checks a dealership
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>

            <aside aria-labelledby="contact-heading" className="min-w-0">
              <DealerContactPanel
                dealer={dealer}
                branch={primary}
                branchCount={branchCount}
                now={now}
              />
            </aside>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="stock-heading"
        className="container-page pt-[var(--section-tight)] pb-[var(--section-base)]"
      >
        <div className="max-w-3xl">
          <h2 id="stock-heading" className="rn-h2 scroll-mt-24">
            {total > 0
              ? `${carsCount(total)} at ${dealer.tradingName}`
              : `Stock at ${dealer.tradingName}`}
          </h2>
          {stock.totalDocs > 0 ? (
            <p className="mt-2 text-muted">
              Showing <span className="tabular">{from}</span> to{" "}
              <span className="tabular">{to}</span> of{" "}
              <span className="tabular">{stock.totalDocs}</span>
              {activeBody ? ` (${activeBody.name})` : ""}, sorted by {sortLabel.toLowerCase()}.
            </p>
          ) : null}
        </div>

        {total > 0 ? (
          <div className="mt-6">
            <StockToolbar
              slug={dealer.slug}
              total={total}
              bodies={bodies}
              body={activeBody?.slug ?? null}
              sort={sort}
            />
          </div>
        ) : null}

        {cards.length > 0 ? (
          /*
           * The cards drop the dealership's name, which every one of them would otherwise repeat
           * under a headline that already says it. A single-branch dealership drops the whole
           * foot, since the town would repeat too; a group keeps the town, which tells a buyer
           * which branch the car is at.
           */
          <div className="mt-6">
            <ul className="rn-grid">
              {cards.map((card) => (
                <li key={card.publicRef}>
                  <VehicleCard vehicle={card} foot={branchCount > 1 ? "town" : "none"} />
                </li>
              ))}
            </ul>
            <Pagination
              page={stock.page ?? 1}
              totalPages={stock.totalPages}
              buildHref={(p) => stockHref(dealer.slug, { body: activeBody?.slug, sort, page: p })}
            />
          </div>
        ) : (
          /*
           * Two ways to get here: the dealership has no live stock, or the page number in the
           * address runs past the end of it (a body-type chip only ever offers types this
           * dealership has in stock, so a filter alone never empties the grid).
           */
          <EmptyState
            icon={Car}
            headingLevel={3}
            className="mt-6"
            title={
              total > 0 ? "That page is past the end of their stock" : "Nothing in stock right now"
            }
            action={
              total > 0 ? (
                <Link
                  href={stockHref(dealer.slug, { body: activeBody?.slug, sort })}
                  className={buttonClasses()}
                >
                  Back to the first page
                </Link>
              ) : (
                <Link href="/cars" className={buttonClasses()}>
                  Browse all cars
                </Link>
              )
            }
          >
            {total > 0
              ? `${dealer.tradingName} has ${carsCount(total)} in stock, and they all fit on earlier pages.`
              : "This dealership has no live listings at the moment. Stock changes daily, and there are cars from other dealerships in the meantime."}
          </EmptyState>
        )}
      </section>

      {branchCount > 1 ? (
        <section
          aria-labelledby="branches-heading"
          className="container-page pb-[var(--section-base)]"
        >
          <h2 id="branches-heading" className="rn-h2 scroll-mt-24">
            {branchCount} branches
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {branches.docs.map((branch) => (
              <li key={branch.id} className="flex">
                <BranchCard dealer={dealer} branch={branch} now={now} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SellToDealerBand dealer={dealer} />
    </>
  );
}
