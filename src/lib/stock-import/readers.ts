import type { PoliteFetcher } from "./fetch";
import {
  listingUrlsFromSitemap,
  motorsSitemap,
  parseMotorsListing,
  siteOrigin,
  sourceKey,
} from "./motors";
import type { SourceListing } from "./types";

/**
 * Where a dealership's stock comes from, as far as the import run cares.
 *
 * The run does not know or mind whether it is reading a website or a spreadsheet. It asks for
 * every listing's key, then for each listing by its key. `source` is written on every car the
 * reader creates and is what a later run matches on, so for one dealership it must never change.
 */
export type StockReader = {
  source: string;
  keys(fetcher: PoliteFetcher): Promise<string[]>;
  read(key: string, fetcher: PoliteFetcher): Promise<SourceListing>;
};

/** A dealership's own WordPress site on the Motors theme. See motors.ts. */
export function motorsWebsiteReader(
  siteUrl: string,
  alsoStrip: readonly string[] = [],
): StockReader {
  const origin = siteOrigin(siteUrl);
  const source = sourceKey(origin);
  return {
    source,
    async keys(fetcher) {
      return listingUrlsFromSitemap(await fetcher.text(motorsSitemap(origin)), origin);
    },
    async read(url, fetcher) {
      return parseMotorsListing(await fetcher.text(url), url, source, alsoStrip);
    },
  };
}

/** Listings already in hand, from a spreadsheet. Each key is the listing's own identifier. */
export function listingsReader(source: string, listings: SourceListing[]): StockReader {
  const byKey = new Map(listings.map((listing) => [listing.externalId, listing]));
  return {
    source,
    async keys() {
      return [...byKey.keys()];
    },
    async read(key) {
      const listing = byKey.get(key);
      if (!listing) throw new Error(`no row with the stock number ${key}`);
      return listing;
    },
  };
}
