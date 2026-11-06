import { AMICO_SOURCE } from "./amico";
import postIds from "./amico-postids.json";
import type { PoliteFetcher } from "./fetch";
import type { StockReader } from "./readers";
import { cleanDescription } from "./text";
import type { SourceListing } from "./types";

/**
 * Amico Motors' new website: Next + Payload, built by Rynet Digital, with a public read-only
 * vehicles API at /api/vehicles.
 *
 * WHY THIS EXISTS
 *
 * Amico's old WordPress site is what Rynet has read since the first import. When their domain
 * moves to the new site, the old listing pages and their sitemap disappear, and the WordPress
 * reader would find nothing. This reader takes the same cars from the new site's API instead.
 *
 * KEEPING THE SAME LISTINGS
 *
 * Rynet matches Amico's cars on `source` plus `externalId`, and `externalId` has always been the
 * WordPress post number. The new site keeps each car's old slug (and its old address in
 * `sourceUrl`) but has no post numbers, so amico-postids.json, taken from the old site before the
 * move, turns a slug back into its post number. A car added after the move has no post number and
 * is keyed `amico-site-<id>` instead, which never collides with a number.
 *
 * Sold cars are left out of the request, so they drop out of the list and the run's expiry rules
 * take them off Rynet exactly as when a WordPress listing disappears.
 */

const POST_IDS = postIds as Record<string, string>;

/** The new site's vehicles endpoint: everything not sold, makes and models and photos included. */
export function amicoApiUrl(origin: string): string {
  return `${origin}/api/vehicles?depth=1&limit=500&where[status][not_equals]=sold`;
}

type ApiNamed = { name?: string | null } | string | number | null | undefined;
type ApiImage = { url?: string | null } | number | null | undefined;
type LexicalNode = { text?: string; children?: LexicalNode[]; type?: string };

export type AmicoApiVehicle = {
  id: number | string;
  title?: string | null;
  slug?: string | null;
  sourceUrl?: string | null;
  make?: ApiNamed;
  model?: ApiNamed;
  variant?: ApiNamed;
  price?: number | null;
  year?: number | null;
  mileage?: number | null;
  bodyType?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  exteriorColour?: string | null;
  interiorColour?: string | null;
  features?: ApiNamed[] | null;
  images?: ApiImage[] | null;
  description?: { root?: LexicalNode } | null;
};

const nameOf = (value: ApiNamed): string | null =>
  value && typeof value === "object" && typeof value.name === "string" && value.name.trim()
    ? value.name.trim()
    : null;

/** The plain words of a rich-text description, one paragraph per line. */
export function lexicalText(root: LexicalNode | undefined): string {
  if (!root) return "";
  const walk = (node: LexicalNode): string =>
    typeof node.text === "string" ? node.text : (node.children ?? []).map(walk).join("");
  return (root.children ?? [])
    .map(walk)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** The slug a car had on the old WordPress site, from its old address or else its own slug. */
export function oldSlug(vehicle: AmicoApiVehicle): string {
  const fromUrl = vehicle.sourceUrl?.match(/\/listings\/([^/?#]+)/)?.[1];
  return (fromUrl ?? vehicle.slug ?? "").trim();
}

/** How Rynet names this car: its old post number when it had one. */
export function amicoExternalId(vehicle: AmicoApiVehicle, ids = POST_IDS): string {
  return ids[oldSlug(vehicle)] ?? ids[vehicle.slug ?? ""] ?? `amico-site-${vehicle.id}`;
}

/** Title-case a stored value such as "suv" or "automatic" the way the listing pages showed it. */
const label = (value: string | null | undefined): string | null =>
  value
    ? value.replace(/(^|[\s-])(\w)/g, (_, gap: string, c: string) => gap + c.toUpperCase())
    : null;

/** One car from the API, in the shape every reader hands the import. */
export function parseAmicoApiVehicle(
  vehicle: AmicoApiVehicle,
  origin: string,
  ids = POST_IDS,
): SourceListing {
  const slug = vehicle.slug ?? oldSlug(vehicle);
  const description = cleanDescription(lexicalText(vehicle.description?.root));
  const photoUrls = (vehicle.images ?? [])
    .map((image) => (image && typeof image === "object" ? image.url : null))
    .filter((url): url is string => typeof url === "string" && url.length > 0)
    .map((url) => new URL(url, origin).toString());
  return {
    source: AMICO_SOURCE,
    externalId: amicoExternalId(vehicle, ids),
    url: `${origin}/vehicles/${slug}`,
    slug,
    title: vehicle.title?.trim() || null,
    makeText: nameOf(vehicle.make),
    modelText: nameOf(vehicle.model),
    year: typeof vehicle.year === "number" ? vehicle.year : null,
    mileageKm: typeof vehicle.mileage === "number" ? vehicle.mileage : null,
    price: typeof vehicle.price === "number" && vehicle.price > 0 ? vehicle.price : null,
    exteriorColourText: vehicle.exteriorColour?.trim() || null,
    interiorColourText: vehicle.interiorColour?.trim() || null,
    transmissionText: label(vehicle.transmission),
    fuelText: label(vehicle.fuelType),
    bodyText: label(vehicle.bodyType),
    driveText: label(vehicle.drivetrain),
    description: description.text,
    removedContactDetails:
      description.removedPhones + description.removedEmails + description.removedNames,
    features: (vehicle.features ?? []).map(nameOf).filter((name): name is string => !!name),
    photoUrls,
  };
}

/** True when the origin answers the vehicles API with JSON, which the old WordPress site never does. */
export function looksLikeAmicoApi(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as { docs?: unknown };
    return Array.isArray(parsed.docs);
  } catch {
    return false;
  }
}

/** Amico's new site as a stock reader. The list is read once per run and every car comes from it. */
export function amicoApiReader(origin: string): StockReader {
  let byKey: Map<string, SourceListing> | null = null;
  const load = async (fetcher: PoliteFetcher) => {
    if (byKey) return byKey;
    const body = await fetcher.text(amicoApiUrl(origin));
    const docs = (JSON.parse(body) as { docs?: AmicoApiVehicle[] }).docs ?? [];
    byKey = new Map(
      docs.map((doc) => {
        const listing = parseAmicoApiVehicle(doc, origin);
        return [listing.externalId, listing];
      }),
    );
    return byKey;
  };
  return {
    source: AMICO_SOURCE,
    async keys(fetcher) {
      return [...(await load(fetcher)).keys()];
    },
    async read(key, fetcher) {
      const listing = (await load(fetcher)).get(key);
      if (!listing) throw new Error(`Amico's site no longer lists the car keyed ${key}`);
      return listing;
    },
  };
}
