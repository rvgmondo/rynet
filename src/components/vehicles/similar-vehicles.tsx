import config from "@payload-config";
import Link from "next/link";
import { getPayload } from "payload";

import { VehicleCard, type VehicleCardData } from "@/components/vehicles/vehicle-card";
import { populated, relName, relSlug } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

/**
 * Similar vehicles, and more from this dealership.
 *
 * Two separate lists, because they answer different questions. "Similar" is for a buyer
 * still deciding what to buy; "more from this dealership" is for one who has decided they
 * like this seller. Merging them into one carousel serves neither.
 *
 * This matters most on a SOLD listing. Section 13 says a sold vehicle keeps its URL with
 * strong similar-vehicle links rather than 404ing, and this is what makes that worth
 * keeping: the page still ranks, and the buyer who lands on it still has somewhere to go.
 *
 * The current vehicle is excluded from both, which sounds obvious and is the thing that
 * gets missed.
 */
async function loadSimilar(vehicle: Vehicle) {
  const payload = await getPayload({ config });

  const modelId = typeof vehicle.model === "number" ? vehicle.model : vehicle.model?.id;
  const makeId = typeof vehicle.make === "number" ? vehicle.make : vehicle.make?.id;
  const dealerId = typeof vehicle.dealer === "number" ? vehicle.dealer : vehicle.dealer?.id;

  // Same model first, widening to the same make. A buyer looking at a Hilux wants other
  // Hiluxes before other Toyotas.
  const sameModel = await payload.find({
    collection: "vehicles",
    where: {
      and: [
        { status: { equals: "live" } },
        { model: { equals: modelId } },
        { id: { not_equals: vehicle.id } },
      ],
    },
    limit: 3,
    depth: 2,
    sort: "-publishedAt",
  });

  let similar = sameModel.docs;

  if (similar.length < 3 && makeId) {
    const sameMake = await payload.find({
      collection: "vehicles",
      where: {
        and: [
          { status: { equals: "live" } },
          { make: { equals: makeId } },
          { id: { not_equals: vehicle.id } },
        ],
      },
      limit: 6,
      depth: 2,
      sort: "-publishedAt",
    });
    const seen = new Set(similar.map((v) => v.id));
    similar = [...similar, ...sameMake.docs.filter((v) => !seen.has(v.id))].slice(0, 3);
  }

  const fromDealer = dealerId
    ? await payload.find({
        collection: "vehicles",
        where: {
          and: [
            { status: { equals: "live" } },
            { dealer: { equals: dealerId } },
            { id: { not_equals: vehicle.id } },
          ],
        },
        limit: 3,
        depth: 2,
        sort: "-publishedAt",
      })
    : null;

  return { similar, fromDealer: fromDealer?.docs ?? [] };
}

function toCard(doc: Vehicle): VehicleCardData {
  const branch = populated(doc.branch);
  return {
    publicRef: doc.publicRef ?? "",
    modelYear: doc.modelYear,
    makeName: relName(doc.make) ?? "",
    makeSlug: relSlug(doc.make),
    modelName: relName(doc.model) ?? "",
    modelSlug: relSlug(doc.model),
    variantName: relName(doc.variant),
    price: doc.price,
    previousPrice: doc.previousPrice ?? null,
    mileageKm: doc.mileageKm,
    transmissionName: relName(doc.transmission),
    fuelName: relName(doc.fuelType),
    bodyName: relName(doc.bodyType),
    condition: doc.condition,
    dealerName: populated(doc.dealer)?.tradingName ?? "",
    dealerSlug: populated(doc.dealer)?.slug ?? "",
    cityName: branch ? relName(branch.city) : null,
    provinceName: branch ? relName(branch.province) : null,
    isDemonstration: Boolean(doc.isDemonstration),
  };
}

export async function SimilarVehicles({ vehicle }: { vehicle: Vehicle }) {
  const { similar, fromDealer } = await loadSimilar(vehicle);
  const dealer = populated(vehicle.dealer);
  const modelName = relName(vehicle.model);
  const makeSlug = relSlug(vehicle.make);
  const modelSlug = relSlug(vehicle.model);

  if (similar.length === 0 && fromDealer.length === 0) return null;

  return (
    <div className="space-y-12">
      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="similar-heading" className="text-2xl">
              Similar vehicles
            </h2>
            {makeSlug && modelSlug ? (
              <Link
                href={`/cars/${makeSlug}/${modelSlug}`}
                className="text-sm font-semibold text-accent hover:underline"
              >
                All {modelName} listings
              </Link>
            ) : null}
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((doc) => (
              <li key={doc.id} className="flex">
                <VehicleCard vehicle={toCard(doc)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fromDealer.length > 0 && dealer ? (
        <section aria-labelledby="dealer-stock-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="dealer-stock-heading" className="text-2xl">
              More from {dealer.tradingName}
            </h2>
            <Link
              href={`/dealers/${dealer.slug}`}
              className="text-sm font-semibold text-accent hover:underline"
            >
              All their stock
            </Link>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fromDealer.map((doc) => (
              <li key={doc.id} className="flex">
                <VehicleCard vehicle={toCard(doc)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
