import { populated, relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za";

/**
 * Structured data.
 *
 * Two rules govern everything here, and both are in the brief for good reason.
 *
 * **The VIN is never published.** Schema.org has a `vehicleIdentificationNumber` field and
 * it is deliberately absent. The VIN is encrypted at rest, excluded from every public read,
 * and putting it in a script tag would undo all of that. A VIN scraped off a listing is
 * what makes cloning a vehicle's identity possible.
 *
 * **Never mark up a rating that has not been earned.** `aggregateRating` is emitted only
 * where a dealership has a real, computed score. Seeded demonstration dealerships have
 * none, so none is emitted. A fabricated rating on a platform whose entire proposition is
 * trust would be the worst possible thing to publish, and Google penalises it besides.
 */

const abs = (path: string) => `${SITE}${path}`;

/** ISO 8601 for `productionDate`, which wants a date rather than a year. */
const productionDate = (year: number | null | undefined) =>
  typeof year === "number" ? `${year}-01-01` : undefined;

export function vehicleJsonLd(vehicle: Vehicle, canonicalPath: string) {
  const dealer = populated(vehicle.dealer);
  const branch = populated(vehicle.branch);
  const city = branch ? relName(branch.city) : null;
  const province = branch ? relName(branch.province) : null;

  const sold = vehicle.status === "sold";
  const poa = vehicle.priceType === "poa";

  const seller = dealer
    ? {
        "@type": "AutoDealer",
        name: dealer.tradingName,
        url: abs(`/dealers/${dealer.slug}`),
        ...(branch
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: [branch.addressLine1, branch.addressLine2]
                  .filter(Boolean)
                  .join(", "),
                addressLocality: city ?? undefined,
                addressRegion: province ?? undefined,
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
            }
          : {}),
        /**
         * No aggregateRating. The seeded dealerships have no reviews, and a rating that has
         * not been collected must not be published. When real reviews exist, this becomes
         * conditional on reviewCount reaching the threshold in docs/QUESTIONS.md.
         */
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: [
      vehicle.modelYear,
      relName(vehicle.make),
      relName(vehicle.model),
      relName(vehicle.variant),
    ]
      .filter(Boolean)
      .join(" "),
    url: abs(canonicalPath),
    brand: relName(vehicle.make) ? { "@type": "Brand", name: relName(vehicle.make) } : undefined,
    model: relName(vehicle.model) ?? undefined,
    vehicleConfiguration: relName(vehicle.variant) ?? undefined,
    productionDate: productionDate(vehicle.modelYear),
    vehicleModelDate: vehicle.modelYear ? String(vehicle.modelYear) : undefined,
    bodyType: relName(vehicle.bodyType) ?? undefined,
    fuelType: relName(vehicle.fuelType) ?? undefined,
    vehicleTransmission: relName(vehicle.transmission) ?? undefined,
    driveWheelConfiguration: relName(vehicle.drivetrain) ?? undefined,
    color: relName(vehicle.exteriorColour) ?? undefined,
    numberOfDoors: vehicle.doors ?? undefined,
    seatingCapacity: vehicle.seats ?? undefined,

    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileageKm,
      unitCode: "KMT",
    },

    ...(vehicle.engineCapacityCc || vehicle.powerKw
      ? {
          vehicleEngine: {
            "@type": "EngineSpecification",
            ...(vehicle.engineCapacityCc
              ? {
                  engineDisplacement: {
                    "@type": "QuantitativeValue",
                    value: vehicle.engineCapacityCc,
                    unitCode: "CMQ",
                  },
                }
              : {}),
            ...(vehicle.powerKw
              ? {
                  enginePower: {
                    "@type": "QuantitativeValue",
                    value: vehicle.powerKw,
                    unitCode: "KWT",
                  },
                }
              : {}),
          },
        }
      : {}),

    itemCondition:
      vehicle.condition === "new"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",

    // Price on application means there is no price to publish. Emitting zero, or omitting
    // priceCurrency, both produce a Rich Results warning and neither is honest.
    offers: poa
      ? undefined
      : {
          "@type": "Offer",
          priceCurrency: "ZAR",
          price: vehicle.price,
          availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          url: abs(canonicalPath),
          itemCondition:
            vehicle.condition === "new"
              ? "https://schema.org/NewCondition"
              : "https://schema.org/UsedCondition",
          seller,
        },
  };
}

export function breadcrumbJsonLd(trail: { href: string; label: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: abs(item.href),
    })),
  };
}

export function organisationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Rynet",
    url: SITE,
    description:
      "A South African vehicle marketplace where only verified, registered dealerships may list.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Pretoria",
      addressRegion: "Gauteng",
      addressCountry: "ZA",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Rynet Showroom",
    url: SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/cars?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
