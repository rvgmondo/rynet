import { revalidateTag } from "next/cache";

/**
 * Drop a cache tag, from inside a Payload hook, without breaking the seed script.
 *
 * `/cars`, the home page and the facet rails read taxonomies and stock through
 * `unstable_cache`, which is what took a search request off seven full-table reads. A cache
 * with only a timer on it is the wrong trade for editorial data: an hour is fine for how
 * often a make changes and far too long for the person who just changed one and wants to
 * see it. So the write invalidates the read.
 *
 * The try is not defensive padding. Payload runs outside a Next request in two places that
 * matter, the seed script and the migration runner, and `revalidateTag` throws there because
 * there is no store to write to. A seed that dies on its last row because it could not clear
 * a cache that does not exist yet would be a genuinely stupid way to lose a database.
 */
export function dropTag(tag: string): void {
  try {
    // `{ expire: 0 }` rather than a named profile. Next 16 wants to know how stale an entry
    // under this tag is allowed to be once it has been dropped, and the answer for an edit
    // someone is watching for is none at all.
    revalidateTag(tag, { expire: 0 });
  } catch {
    // No request context, which means nothing is cached to drop.
  }
}
