import config from "@payload-config";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getPayload } from "payload";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { assumptionsFrom } from "@/components/listing/finance-estimate";
import { FeaturesPanel, KeyFactsPanel } from "@/components/listing/listing-overview";
import { SellerDescription } from "@/components/listing/seller-description";
import { FinancePanel } from "@/components/vehicles/finance-panel";
import { ListingSummary, MobileActionBar } from "@/components/vehicles/price-rail";
import { SimilarVehicles } from "@/components/vehicles/similar-vehicles";
import { SpecTable } from "@/components/vehicles/spec-table";
import { VehicleGallery } from "@/components/vehicles/vehicle-gallery";
import { formatKm, formatRand } from "@/lib/format";
import { populated, relName, relSlug } from "@/lib/relations";
import { vehicleJsonLd } from "@/lib/structured-data";
import { vehicleUrl } from "@/lib/urls";

type Params = Promise<{ make: string; model: string; slug: string }>;

/**
 * The public reference is the last segment of the trailing slug, lowercased.
 *
 * Nothing downstream parses the rest of the URL to find the vehicle. The make, model, year
 * and variant in the path are there for the reader and the keyword, and they change: a
 * dealership corrects a variant and the URL moves. The reference does not, which is why it
 * is the only part that is looked up.
 */
function extractRef(slug: string): string | null {
  const match = slug.match(/(rn[0-9a-hjkmnp-tv-z]{6})$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

async function loadVehicle(slug: string) {
  const ref = extractRef(slug);
  if (!ref) return null;

  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "vehicles",
    where: { publicRef: { equals: ref } },
    limit: 1,
    depth: 3,
  });

  return found.docs[0] ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await loadVehicle(slug);
  if (!vehicle) return { title: "Vehicle not found" };

  const title = [
    vehicle.modelYear,
    relName(vehicle.make),
    relName(vehicle.model),
    relName(vehicle.variant),
  ]
    .filter(Boolean)
    .join(" ");
  const dealer = populated(vehicle.dealer);
  const branch = populated(vehicle.branch);
  const city = branch ? relName(branch.city) : null;
  const sold = vehicle.status === "sold";

  return {
    title: sold ? `${title} (sold)` : `${title} for sale`,
    /*
     * How Rynet works, never a claim about this dealership. A demonstration listing says what
     * it is first, the same as the page does.
     */
    description: [
      vehicle.isDemonstration ? "Demonstration listing, not for sale." : null,
      `${[
        `${title} with ${formatKm(vehicle.mileageKm)}`,
        vehicle.priceType === "poa" ? "price on application" : `at ${formatRand(vehicle.price)}`,
        dealer?.tradingName ? `from ${dealer.tradingName}` : null,
        city ? `in ${city}` : null,
      ]
        .filter(Boolean)
        .join(", ")}.`,
      "Every dealership is checked before it can list on Rynet.",
    ]
      .filter(Boolean)
      .join(" "),
    alternates: {
      canonical: vehicleUrl({
        makeSlug: relSlug(vehicle.make),
        modelSlug: relSlug(vehicle.model),
        modelYear: vehicle.modelYear,
        variantName: relName(vehicle.variant),
        publicRef: vehicle.publicRef ?? "",
      }),
    },
    /*
     * Two reasons to withhold a page from the index, and neither is a reason to stop
     * crawling it.
     *
     * A SOLD listing keeps its URL and its ranking for the ninety day window, but it should
     * not be pulled into new results as if it were available.
     *
     * A DEMONSTRATION listing describes a car that does not exist, sold by a business that
     * does not exist. The page says so in its own copy; this says the same thing to the
     * reader that cannot see the copy.
     */
    robots:
      sold || vehicle.isDemonstration
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}

/**
 * The vehicle page, where the lead is won.
 *
 * ONE DOM ORDER FOR BOTH WIDTHS, so the reading order, the focus order and the visual order
 * always agree (SC 1.3.2 and 2.4.3). Nothing is moved with CSS `order`.
 *
 *   1. The gallery.
 *   2. The summary card: title, price, the finance line, the demonstration notice, the contact
 *      actions and the dealership.
 *   3. Key facts, the dealership's description, features, the specification, the finance
 *      estimate.
 *
 * On a phone that is simply top to bottom: the photograph edge to edge, then who, how much and
 * how to get in touch, before anything long. From 1024px the page is two columns. The gallery
 * takes row one on the left, the long sections take row two on the left, and the summary card
 * spans both rows on the right and sticks while the left column scrolls. The wrapper around the
 * long sections is `display: contents` below 1024px, so on a phone its children are ordinary
 * rows of the same grid; it only becomes a column of its own on a desktop.
 *
 * Similar cars stream in behind a Suspense boundary, so their queries never hold back the
 * photograph, which is the largest contentful paint.
 */
export default async function VehiclePage({ params }: { params: Params }) {
  const { make, model, slug } = await params;
  const vehicle = await loadVehicle(slug);
  if (!vehicle) notFound();

  const makeSlug = relSlug(vehicle.make);
  const modelSlug = relSlug(vehicle.model);
  const canonical = vehicleUrl({
    makeSlug,
    modelSlug,
    modelYear: vehicle.modelYear,
    variantName: relName(vehicle.variant),
    publicRef: vehicle.publicRef ?? "",
  });

  /**
   * A dealership correcting the variant, or the model year, changes the readable part of
   * the URL. The old one still resolves because the reference is what is looked up, and it
   * redirects here permanently rather than serving the same page at two addresses.
   */
  const requested = `/vehicles/${make}/${model}/${slug}`;
  if (requested !== canonical) permanentRedirect(canonical);

  const payload = await getPayload({ config });
  const financeDefaults = await payload.findGlobal({ slug: "finance-defaults" });
  const assumptions = assumptionsFrom(financeDefaults);

  const title = [
    vehicle.modelYear,
    relName(vehicle.make),
    relName(vehicle.model),
    relName(vehicle.variant),
  ]
    .filter(Boolean)
    .join(" ");
  const makeName = relName(vehicle.make) ?? "Make";
  const modelName = relName(vehicle.model) ?? "Model";
  const sold = vehicle.status === "sold";
  const poa = vehicle.priceType === "poa";

  return (
    <>
      {/*
        Vehicle, Offer and AutoDealer structured data. vehicleIdentificationNumber is
        deliberately absent: the VIN is encrypted at rest and never leaves the server for a
        public request, so it cannot be published here either.

        No script tag at all for a demonstration listing. vehicleJsonLd returns null for
        those, and rendering `null` into JSON would publish the string "null" as structured
        data, which is worse than publishing nothing.
      */}
      {(() => {
        const jsonLd = vehicleJsonLd(vehicle, canonical);
        return jsonLd ? (
          <script
            type="application/ld+json"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and the payload is serialised by us from typed data rather than taken from input.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null;
      })()}

      <div className="container-page pt-2 pb-[calc(var(--section-base)+4.5rem)] sm:pt-5 lg:pb-[var(--section-base)]">
        {/*
          The full trail from 768px. On a phone one link back to the model's listings does the
          same job in one line, where the trail used to run off the edge of the screen.
        */}
        <Breadcrumbs
          className="hidden md:block"
          trail={[
            { href: "/cars", label: "Cars for sale" },
            { href: `/cars/${makeSlug}`, label: makeName },
            { href: `/cars/${makeSlug}/${modelSlug}`, label: modelName },
            { href: canonical, label: title },
          ]}
        />
        <Link
          href={`/cars/${makeSlug}/${modelSlug}`}
          className="-ms-1.5 inline-flex min-h-11 items-center gap-1 rounded-sm pe-2 text-sm font-semibold text-body no-underline hover:text-heading md:hidden"
        >
          <ChevronLeft aria-hidden="true" className="size-4.5" />
          All {modelName} listings
        </Link>

        <div className="mt-1 grid gap-4 sm:gap-6 md:mt-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-x-10">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <VehicleGallery vehicle={vehicle} />
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {/*
              Sticky, and it has to FIT to be sticky. On a 1366 by 768 laptop the card can be
              taller than the window, and a sticky element taller than its window scrolls its
              own foot out of reach. Capping it at the window lets the rare overflow scroll inside
              the card instead of taking the dealership with it. The panel is the scroller itself,
              so its shadow is drawn outside the clip rather than cut off by it.
            */}
            <div className="rn-panel @container lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:max-h-[calc(100svh-var(--header-height)-3rem)] lg:overflow-y-auto lg:overscroll-contain">
              <ListingSummary vehicle={vehicle} sold={sold} assumptions={assumptions} />
            </div>
          </div>

          <div className="contents lg:col-start-1 lg:row-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
            <KeyFactsPanel vehicle={vehicle} />
            <SellerDescription vehicle={vehicle} />
            <FeaturesPanel vehicle={vehicle} />
            <SpecTable vehicle={vehicle} />
            {poa || sold ? null : <FinancePanel price={vehicle.price} defaults={financeDefaults} />}
          </div>
        </div>

        <Suspense fallback={null}>
          <SimilarVehicles vehicle={vehicle} />
        </Suspense>
      </div>

      <MobileActionBar vehicle={vehicle} sold={sold} />
    </>
  );
}
