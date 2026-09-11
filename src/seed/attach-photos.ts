import { readFile } from "node:fs/promises";
import path from "node:path";

import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Put the demonstration photographs onto the demonstration stock.
 *
 * WHY THE SITE NEEDED THIS
 *
 * The design was built around having no photography. Every competitor in this market leads with
 * a photograph and puts another on every card, and a grid of generated colour fields where the
 * cars should be reads as an empty state however good the typography is. So the seed now carries
 * real photographs of the real models, and the colour plate goes back to being what it was
 * always meant to be: the answer for a listing that genuinely has none.
 *
 * WHAT IS AND IS NOT BEING CLAIMED
 *
 * These photographs come from Wikimedia Commons under licences that allow commercial use, and
 * each one is a photograph of the model it is attached to, taken and identified by a named
 * photographer. A seeded Hilux gets a photograph of a Hilux.
 *
 * It is not a photograph of THAT Hilux, because that Hilux does not exist: all 311 listings are
 * generated. Every one of them says so on its own card, on its own page and in its metadata, and
 * the listing page prints the photographer and licence under the image. That is the line between
 * illustrating a demonstration and fabricating a listing, and it is the reason this reads from a
 * manifest with attribution in it rather than from a folder of stock photos.
 *
 * Real dealer photography replaces all of it. `npm run seed:photos -- --clear` takes it back out.
 *
 * Idempotent: a vehicle that already has a gallery is left alone unless --refresh is passed.
 */

type Entry = {
  make: string;
  model: string;
  body: string;
  file: string;
  title: string;
  licence: string;
  author: string;
  source: string;
};

const PHOTO_DIR = path.join(process.cwd(), "src", "seed", "photos");

/**
 * Empty every gallery whose photograph matches, or has stopped existing.
 *
 * `matches` is asked about each referenced media id. Pass null to mean "only the rows whose
 * media is missing", which is the repair case.
 */
async function emptyGalleries(
  payload: Awaited<ReturnType<typeof getPayload>>,
  matches: ((imageId: number) => boolean) | null,
): Promise<number> {
  const vehicles = await payload.find({ collection: "vehicles", limit: 1000, depth: 1 });
  let cleared = 0;

  for (const vehicle of vehicles.docs) {
    const gallery = (vehicle as { gallery?: { image?: unknown }[] }).gallery ?? [];
    if (gallery.length === 0) continue;

    const hit = gallery.some((row) => {
      const image = row.image;
      // depth 1, so a live record arrives as an object and a dead reference as a bare id.
      if (image && typeof image === "object") {
        return matches ? matches((image as { id: number }).id) : false;
      }
      return matches === null;
    });
    if (!hit) continue;

    await payload.update({
      collection: "vehicles",
      id: vehicle.id,
      data: { gallery: [] } as never,
    });
    cleared += 1;
  }

  return cleared;
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const clear = process.argv.includes("--clear");

  const payload = await getPayload({ config });

  if (clear) {
    const media = await payload.find({
      collection: "media",
      where: { isDemonstration: { equals: true } },
      limit: 1000,
      depth: 0,
    });
    const ids = new Set(media.docs.map((doc) => doc.id));

    // The galleries first. Deleting the media on its own leaves every listing holding a row
    // that points at a record that is gone, which renders as no photograph but is not the
    // same thing as having none: the next run sees a non-empty gallery and leaves it alone.
    await emptyGalleries(payload, (imageId) => ids.has(imageId));

    for (const doc of media.docs) {
      await payload.delete({ collection: "media", id: doc.id });
    }
    console.log(`removed ${media.docs.length} demonstration photographs`);
    return;
  }

  // Anything left pointing at a photograph that no longer exists, from a clear that ran before
  // this script knew to tidy up after itself, or from a media record deleted by hand.
  const swept = await emptyGalleries(payload, null);
  if (swept > 0) console.log(`cleared ${swept} galleries pointing at a deleted photograph`);

  const manifest = JSON.parse(
    await readFile(path.join(PHOTO_DIR, "manifest.json"), "utf8"),
  ) as Entry[];
  console.log(`${manifest.length} photographs in the manifest`);

  let uploaded = 0;
  let attached = 0;
  let skipped = 0;

  for (const entry of manifest) {
    // The credit line the licence obliges. Written onto the media record rather than held in a
    // spreadsheet, so whatever renders the image can render the attribution beside it.
    const credit = `${entry.author}, ${entry.licence}, via Wikimedia Commons`;

    // One media record per model, reused across every listing of that model, because uploading
    // the same file 311 times would put 311 copies through sharp and onto disk for no gain.
    const existing = await payload.find({
      collection: "media",
      where: { filename: { like: entry.file.replace(/\.[^.]+$/, "") } },
      limit: 1,
      depth: 0,
    });

    let mediaId = existing.docs[0]?.id;

    if (!mediaId) {
      const created = await payload.create({
        collection: "media",
        data: {
          alt: `${entry.make} ${entry.model}`,
          credit,
          isDemonstration: true,
        } as never,
        filePath: path.join(PHOTO_DIR, entry.file),
      });
      mediaId = created.id;
      uploaded += 1;
    }

    // Every live listing of this model.
    const makeDoc = await payload.find({
      collection: "makes",
      where: { name: { equals: entry.make } },
      limit: 1,
      depth: 0,
    });
    const modelDoc = await payload.find({
      collection: "models",
      where: { name: { equals: entry.model } },
      limit: 1,
      depth: 0,
    });
    if (!makeDoc.docs[0] || !modelDoc.docs[0]) {
      console.log(`  no taxonomy for ${entry.make} ${entry.model}`);
      continue;
    }

    const vehicles = await payload.find({
      collection: "vehicles",
      where: {
        and: [{ make: { equals: makeDoc.docs[0].id } }, { model: { equals: modelDoc.docs[0].id } }],
      },
      limit: 500,
      depth: 0,
    });

    for (const vehicle of vehicles.docs) {
      /*
       * One listing in twelve is left without a photograph, deliberately.
       *
       * It is a real state and the site has to be tested and demonstrated in it: a dealership
       * adds stock to its portal and photographs it later, so a feed always arrives with some
       * listings bare. Giving all 311 seeded cars a photograph would have hidden the fallback
       * completely, and the first thing that noticed was a test that could no longer find a
       * single colour plate on the search page.
       *
       * The id rather than a random number, so the same listings are bare on every seed.
       */
      if (vehicle.id % 12 === 0) {
        // On a refresh this has to actively take the photograph back off, or a listing that
        // was photographed by an earlier run keeps it forever and the ratio drifts.
        if (refresh && ((vehicle as { gallery?: unknown[] }).gallery ?? []).length > 0) {
          await payload.update({
            collection: "vehicles",
            id: vehicle.id,
            data: { gallery: [] } as never,
          });
        }
        skipped += 1;
        continue;
      }

      const gallery = (vehicle as { gallery?: unknown[] }).gallery ?? [];
      if (gallery.length > 0 && !refresh) {
        skipped += 1;
        continue;
      }

      await payload.update({
        collection: "vehicles",
        id: vehicle.id,
        data: {
          gallery: [{ image: mediaId, alt: `${entry.make} ${entry.model}` }],
        } as never,
        // The beforeChange hook re-checks the dealership's verification status on every write,
        // and these are seeded dealerships that are already verified, so nothing is bypassed.
      });
      attached += 1;
    }

    console.log(`  ${entry.make} ${entry.model}: ${vehicles.docs.length} listings`);
  }

  console.log(`\nuploaded ${uploaded}, attached ${attached}, left alone ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
