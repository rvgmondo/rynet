import { populated, relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za";

/**
 * Structured data.
 *
 * Two rules govern everything here, and both are in the brief for good reason.
 *
 * **The VIN is never published.** Schema.org has a `vehicleIdentificationNumber` field and
 * it is deliberately absent. The VIN is excluded from every public read and from every read
 * by a dealership that does not own the listing, and putting it in a script tag would undo
 * all of that. A VIN scraped off a listing is what makes cloning a vehicle's identity
 * possible.
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

/**
 * Rynet Digital as a `ProfessionalService`.
 *
 * A separate node from `organisationJsonLd`, which describes the marketplace. They are one
 * company and two products, and collapsing them would tell Google that a vehicle
 * marketplace also sells advertising services, which is confusing rather than helpful.
 *
 * `areaServed` is South Africa and `audience` is car dealerships, because that restriction
 * is the actual proposition rather than a limitation to hide.
 */
export function agencyJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Rynet Digital",
    url: `${SITE}/digital`,
    description:
      "Websites, stock feeds, paid media, local search, photography, lead routing and reporting for South African car dealerships.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Pretoria",
      addressRegion: "Gauteng",
      addressCountry: "ZA",
    },
    areaServed: { "@type": "Country", name: "South Africa" },
    audience: { "@type": "BusinessAudience", name: "Car dealerships" },
    parentOrganization: { "@type": "Organization", name: "Rynet", url: SITE },
  };
}

/**
 * One service.
 *
 * No `offers` and no price, deliberately. Pricing is not published yet, and emitting an
 * `Offer` with an invented number would put a figure into a search result that nobody at
 * Rynet has agreed to charge.
 */
export function serviceJsonLd(service: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    url: abs(service.path),
    serviceType: service.name,
    provider: {
      "@type": "ProfessionalService",
      name: "Rynet Digital",
      url: `${SITE}/digital`,
    },
    areaServed: { "@type": "Country", name: "South Africa" },
    audience: { "@type": "BusinessAudience", name: "Car dealerships" },
  };
}

/**
 * A set of questions and answers.
 *
 * Only ever emitted where the questions are genuinely on the page. `FAQPage` markup that
 * does not match visible content is a manual action waiting to happen, and it is also just
 * dishonest.
 */
export function faqJsonLd(items: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
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
