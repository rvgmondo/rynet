import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DealerCard } from "@/components/vehicles/dealer-card";
import { FinancePanel } from "@/components/vehicles/finance-panel";
import { MobileActionBar, PriceRail } from "@/components/vehicles/price-rail";
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
    description: [
      `${title} with ${formatKm(vehicle.mileageKm)}`,
      vehicle.priceType === "poa" ? "price on application" : `at ${formatRand(vehicle.price)}`,
      `from ${dealer?.tradingName ?? "a verified dealership"}`,
      city ? `in ${city}` : null,
      "Only verified dealerships list on Rynet.",
    ]
      .filter(Boolean)
      .join(", "),
    alternates: {
      canonical: vehicleUrl({
        makeSlug: relSlug(vehicle.make),
        modelSlug: relSlug(vehicle.model),
        modelYear: vehicle.modelYear,
        variantName: relName(vehicle.variant),
        publicRef: vehicle.publicRef ?? "",
      }),
    },
    // A sold listing keeps its URL and its ranking for the window, but it should not be
    // pulled into new results as if it were available.
    robots: sold ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function VehiclePage({ params }: { params: Params }) {
  const { slug } = await params;
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
  const requested = `/vehicles/${(await params).make}/${(await params).model}/${slug}`;
  if (requested !== canonical) permanentRedirect(canonical);

  const payload = await getPayload({ config });
  const financeDefaults = await payload.findGlobal({ slug: "finance-defaults" });

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
  const sold = vehicle.status === "sold";

  return (
    <>
      {/*
        Vehicle, Offer and AutoDealer structured data. vehicleIdentificationNumber is
        deliberately absent: the VIN is encrypted at rest and never leaves the server for a
        public request, so it cannot be published here either.
      */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and the payload is serialised by us from typed data rather than taken from input.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(vehicleJsonLd(vehicle, canonical)),
        }}
      />

      <div className="container-page py-6">
        <Breadcrumbs
          trail={[
            { href: "/cars", label: "Cars for sale" },
            { href: `/cars/${makeSlug}`, label: relName(vehicle.make) ?? "Make" },
            { href: `/cars/${makeSlug}/${modelSlug}`, label: relName(vehicle.model) ?? "Model" },
            { href: canonical, label: title },
          ]}
        />

        {sold ? (
          <div
            role="status"
            className="mt-4 rounded-lg border border-line-interactive bg-surface-sunken p-4"
          >
            <p className="font-display text-base font-bold">This one has been sold</p>
            <p className="measure mt-1 text-sm text-ink-secondary">
              The listing stays up so you can see what it went for. There are similar vehicles
              further down, and{" "}
              <Link href={`/cars/${makeSlug}/${modelSlug}`} className="text-accent hover:underline">
                more {relName(vehicle.model)} listings
              </Link>{" "}
              from other verified dealerships.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            <h1 className="text-3xl">{title}</h1>
            {vehicle.derivative ? (
              <p className="mt-1 text-ink-secondary">{vehicle.derivative}</p>
            ) : null}

            <div className="mt-6">
              <VehicleGallery vehicle={vehicle} />
            </div>

            <div className="mt-10">
              <SpecTable vehicle={vehicle} />
            </div>

            <div className="mt-10">
              <FinancePanel price={vehicle.price} defaults={financeDefaults} />
            </div>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <PriceRail vehicle={vehicle} sold={sold} />
            <div className="mt-4">
              <DealerCard dealer={dealer} branch={branch} />
            </div>
          </div>
        </div>

        <div className="mt-16 lg:pb-0 pb-24">
          <SimilarVehicles vehicle={vehicle} />
        </div>
      </div>

      <MobileActionBar vehicle={vehicle} sold={sold} />
    </>
  );
}
