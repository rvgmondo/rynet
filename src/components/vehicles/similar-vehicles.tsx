import config from "@payload-config";
import { getPayload, type Where } from "payload";

import { SectionHeader } from "@/components/ui/section-header";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { populated, relName, relSlug } from "@/lib/relations";
import { toCard } from "@/lib/search";
import { vehiclePhoto } from "@/lib/vehicle-photo";
import type { Vehicle } from "@/payload-types";

const ROW = 4;

const idOf = (value: number | { id: number } | null | undefined): number | null =>
  typeof value === "number" ? value : (value?.id ?? null);

/**
 * Chooses a row of cards from candidate pools, in the order the pools are given.
 *
 * Three passes, and the order of the passes is the design:
 *
 * 1. Cars with a photograph that is not already on the page. The listing's own photograph counts
 *    as on the page. The demonstration stock is illustrated with one photograph per model, so
 *    without this a Hilux page showed four more of the same Hilux photograph under the one in the
 *    gallery, which reads as stock photography and undermines every photograph on the site.
 * 2. Cars with no photograph yet. The placeholder says so honestly, which is better than the same
 *    photograph twice.
 * 3. Only then a repeated photograph, so a thin set of stock still fills the row.
 *
 * A car already chosen anywhere on the page is never chosen again, which is how the same Starlet
 * once appeared in both rows a few hundred pixels apart.
 */
function pickRow(
  pools: Vehicle[][],
  taken: Set<number>,
  photosOnPage: Set<string>,
  size: number,
): Vehicle[] {
  const seen = new Set<number>();
  const candidates = pools
    .flat()
    .filter((doc) => {
      if (taken.has(doc.id) || seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    })
    .map((doc) => ({ doc, photo: vehiclePhoto(doc, "card")?.url ?? null }));

  const chosen: typeof candidates = [];
  const passes: ((candidate: (typeof candidates)[number]) => boolean)[] = [
    (c) => c.photo !== null && !photosOnPage.has(c.photo),
    (c) => c.photo === null,
    () => true,
  ];

  for (const accept of passes) {
    for (const candidate of candidates) {
      if (chosen.length >= size) break;
      // A photograph chosen a moment ago is on the page now, so the first pass also turns away a
      // second car with the same one.
      if (chosen.includes(candidate) || !accept(candidate)) continue;
      chosen.push(candidate);
      if (candidate.photo) photosOnPage.add(candidate.photo);
    }
  }

  for (const { doc } of chosen) taken.add(doc.id);
  return chosen.map(({ doc }) => doc);
}

/**
 * Loads both rows.
 *
 * "Similar" draws from three pools, best match first: the same model; the same body type within
 * a quarter of the price either way (a Hilux buyer is also looking at a Ranger and a D-Max at the
 * same money); and the same make. "More from this dealership" is that dealership's other live
 * stock, never repeating a car from the first row.
 *
 * Every query is filtered to live stock and excludes this car. They run in parallel, and the page
 * renders this section inside a Suspense boundary, so none of it holds back the photograph.
 */
async function loadSimilar(vehicle: Vehicle) {
  const payload = await getPayload({ config });

  const modelId = idOf(vehicle.model);
  const makeId = idOf(vehicle.make);
  const dealerId = idOf(vehicle.dealer);
  const bodyId = idOf(vehicle.bodyType);
  const priced = vehicle.priceType !== "poa" && vehicle.price > 0;

  const find = async (where: Where[], limit: number) =>
    (
      await payload.find({
        collection: "vehicles",
        where: {
          and: [{ status: { equals: "live" } }, { id: { not_equals: vehicle.id } }, ...where],
        },
        limit,
        depth: 2,
        sort: "-publishedAt",
      })
    ).docs;

  const [sameModel, sameBodyAndPrice, sameMake, fromDealer] = await Promise.all([
    modelId ? find([{ model: { equals: modelId } }], 8) : [],
    bodyId && priced
      ? find(
          [
            { bodyType: { equals: bodyId } },
            { priceType: { not_equals: "poa" } },
            { price: { greater_than_equal: Math.round(vehicle.price * 0.75) } },
            { price: { less_than_equal: Math.round(vehicle.price * 1.25) } },
          ],
          12,
        )
      : [],
    makeId ? find([{ make: { equals: makeId } }], 8) : [],
    dealerId ? find([{ dealer: { equals: dealerId } }], 12) : [],
  ]);

  const taken = new Set<number>([vehicle.id]);
  const own = vehiclePhoto(vehicle, "card")?.url;
  const photosOnPage = new Set<string>(own ? [own] : []);

  const similar = pickRow([sameModel, sameBodyAndPrice, sameMake], taken, photosOnPage, ROW);
  const dealerRow = pickRow([fromDealer], taken, photosOnPage, ROW);

  return { similar, fromDealer: dealerRow };
}

/**
 * Similar cars, and more from this dealership.
 *
 * Two separate rows, because they answer different questions. "Similar" is for a buyer still
 * deciding what to buy; "more from this dealership" is for one who likes this seller.
 *
 * This matters most on a SOLD listing, which keeps its URL: the buyer who lands on it still has
 * somewhere to go.
 *
 * Cards sit on the page ground, four across on a desktop. Below 1280px each row is a sideways
 * scroll-snap row that runs to the screen edge with the next card peeking in, with no JavaScript,
 * so there are never empty cells in a half-filled grid. The cards carry their own Demo listing
 * badges; nothing here removes them.
 */
export async function SimilarVehicles({ vehicle }: { vehicle: Vehicle }) {
  const { similar, fromDealer } = await loadSimilar(vehicle);
  const dealer = populated(vehicle.dealer);
  const modelName = relName(vehicle.model);
  const makeSlug = relSlug(vehicle.make);
  const modelSlug = relSlug(vehicle.model);

  if (similar.length === 0 && fromDealer.length === 0) return null;

  const rowClass =
    "rn-grid rn-grid--floor mt-5 max-xl:-mx-[var(--container-pad)] max-xl:px-[var(--container-pad)] max-xl:scroll-px-[var(--container-pad)]";

  return (
    <div className="mt-[var(--section-base)] grid grid-cols-1 gap-[var(--section-tight)]">
      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading">
          <SectionHeader
            id="similar-heading"
            title="Similar cars"
            className="[&_h2]:text-2xl"
            action={
              makeSlug && modelSlug && modelName
                ? { href: `/cars/${makeSlug}/${modelSlug}`, label: `All ${modelName} listings` }
                : undefined
            }
          />
          <ul className={rowClass}>
            {similar.map((doc) => (
              <li key={doc.id}>
                <VehicleCard vehicle={toCard(doc)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fromDealer.length > 0 && dealer ? (
        <section aria-labelledby="dealer-stock-heading">
          <SectionHeader
            id="dealer-stock-heading"
            title={`More from ${dealer.tradingName}`}
            className="[&_h2]:text-2xl"
            action={{ href: `/dealers/${dealer.slug}`, label: "See all their stock" }}
          />
          <ul className={rowClass}>
            {fromDealer.map((doc) => (
              <li key={doc.id}>
                <VehicleCard vehicle={toCard(doc)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
