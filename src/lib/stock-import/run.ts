import { randomBytes } from "node:crypto";
import path from "node:path";

import type { Payload, PayloadRequest, RequiredDataFromCollectionSlug } from "payload";

import { priceFieldsFromSaved } from "@/lib/price-history";
import { generatePublicRef } from "@/lib/slug";
import { vehicleTitle } from "@/lib/vehicle-title";

import { AMICO_SITEMAP, AMICO_SOURCE, isAmicoListingUrl, parseAmicoListing } from "./amico";
import { AMICO_TRADING_NAME, ensureAmicoDealership } from "./amico-dealer";
import {
  changesBetween,
  type ExistingVehicle,
  expiredStatusFor,
  expirySafety,
  hasRequiredValues,
  holdNote,
  missingFieldReasons,
  modelReasons,
  photoReasons,
  statusFor,
} from "./decide";
import { createPoliteFetcher, type PoliteFetcher } from "./fetch";
import { sitemapLocations } from "./html";
import {
  MAX_PHOTOS_PER_CAR,
  mediaRecord,
  photoAlt,
  photoFilename,
  renderPhoto,
  writePhotoFiles,
} from "./photos";
import { type QualityNote, qualityNotes } from "./quality";
import {
  chooseModel,
  findEntry,
  findLeading,
  modelFromSlug,
  modelTextFromTitle,
  pickModel,
  SOURCE_ALIASES,
} from "./taxonomy";
import {
  colourFamilyOf,
  lexicalParagraphs,
  normaliseKey,
  tidyColourName,
  toParagraphs,
} from "./text";
import type { HoldReason, ListingOutcome, SourceListing, TaxonomyEntry } from "./types";

/**
 * The import itself: read the stock list, work out what each car is, and write the difference.
 *
 * WHAT A DRY RUN IS AND IS NOT
 *
 * A dry run does everything except write. It fetches every page, reads every car, resolves every
 * make and model against Rynet's lists, looks up the car Rynet already holds for each listing, and
 * works out create, update, unchanged or expire for all of them, then prints what it would have
 * done. It does not download photographs, because that is the expensive half and nothing about it
 * changes the decision.
 *
 * THE ORDER OF WORK, AND WHY
 *
 * The dealership first, because a car cannot be created without one and cannot go live unless it
 * is verified. Then the sitemap, then one page at a time. Photographs are fetched and encoded for
 * one car before the next car starts, and one photograph before the next, because parallel image
 * encoding is what took the live site down once before. Expiry last, because "not seen in this
 * run" can only be known once the run has finished seeing things.
 *
 * WHAT IT REFUSES TO DO
 *
 * It never deletes a car, never marks one sold, never fills in a value the page left out, and
 * never overrules a person: a car a staff member has marked Sold, Reserved or Archived, or has
 * taken off the import by unticking "Kept up to date from there", is counted and left exactly as
 * it is.
 */

export type CarLine = {
  externalId: string;
  url: string;
  name: string;
  outcome: ListingOutcome;
  reasons: HoldReason[];
  changed: string[];
  photos: number;
  note?: string;
};

export type ImportReport = {
  source: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  listingsFound: number;
  created: number;
  updated: number;
  unchanged: number;
  expired: number;
  heldBack: number;
  leftAlone: number;
  /** Listing pages that could not be fetched or read. */
  unreadable: number;
  /** Cars that were read but could not be saved. */
  failed: number;
  /** Cars from this source on the site once the run finished. Not counted on a dry run. */
  liveAfter: number | null;
  photosSaved: number;
  photosReused: number;
  photosSkipped: number;
  requests: number;
  makesAdded: string[];
  modelsAdded: string[];
  coloursAdded: string[];
  contactDetailsRemoved: number;
  cars: CarLine[];
  problems: string[];
  /** Why cars that have gone from the source were not hidden this run, when they were not. */
  expiryWithheld: string | null;
  /** What is wrong with the dealership's own data, for them rather than for us. */
  dataQuality: QualityNote[];
  dealership: string[];
};

export type RunOptions = {
  payload: Payload;
  dryRun: boolean;
  /** Stop after this many listings. For a quick look, not for a real run: nothing is expired. */
  limit?: number;
  /** Let a run hide more than half of this source's cars at once. See `expirySafety`. */
  allowLargeRemoval?: boolean;
  log?: (line: string) => void;
  fetcher?: PoliteFetcher;
  req?: Partial<PayloadRequest>;
  now?: () => Date;
};

type TaxonomyCollection =
  | "makes"
  | "models"
  | "variants"
  | "body-types"
  | "fuel-types"
  | "transmissions"
  | "drivetrains"
  | "colours"
  | "features";

/** Every list the mapping needs, read once and kept up to date as entries are added. */
class Lists {
  private readonly cache = new Map<TaxonomyCollection, TaxonomyEntry[]>();

  constructor(
    private readonly payload: Payload,
    private readonly req?: Partial<PayloadRequest>,
  ) {}

  async load(collection: TaxonomyCollection): Promise<TaxonomyEntry[]> {
    const already = this.cache.get(collection);
    if (already) return already;

    const found = await this.payload.find({
      collection,
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req: this.req,
    });
    const entries = (found.docs as unknown as Record<string, unknown>[]).map((doc) => ({
      id: doc.id as number,
      name: String(doc.name ?? ""),
      slug: (doc.slug as string | null) ?? null,
      aliases: (doc.aliases as string[] | null) ?? null,
      parent:
        (doc.make as number | null) ??
        (doc.model as number | null) ??
        (doc.category as number | null) ??
        null,
      family: (doc.family as string | null) ?? null,
    }));
    this.cache.set(collection, entries);
    return entries;
  }

  async add(collection: TaxonomyCollection, data: Record<string, unknown>): Promise<TaxonomyEntry> {
    // The collection is one of nine taxonomies and the data is built per taxonomy above, which
    // is more than the union of nine generated document types can be told at this point.
    const created = (await this.payload.create({
      collection: collection as "makes",
      data: data as RequiredDataFromCollectionSlug<"makes">,
      overrideAccess: true,
      req: this.req,
    })) as { id: number; name?: string; slug?: string | null };
    const entry: TaxonomyEntry = {
      id: created.id as number,
      name: String((created as { name?: unknown }).name ?? data.name ?? ""),
      slug: ((created as { slug?: string | null }).slug ?? null) as string | null,
      aliases: (data.aliases as string[] | null) ?? null,
      parent: (data.make as number | null) ?? (data.model as number | null) ?? null,
      family: (data.family as string | null) ?? null,
    };
    this.cache.set(collection, [...(this.cache.get(collection) ?? []), entry]);
    return entry;
  }

  /** Adds to the cache without writing, so a dry run maps later cars the same way a real one would. */
  pretend(collection: TaxonomyCollection, entry: Omit<TaxonomyEntry, "id">): TaxonomyEntry {
    const made: TaxonomyEntry = { ...entry, id: -1 - (this.cache.get(collection)?.length ?? 0) };
    this.cache.set(collection, [...(this.cache.get(collection) ?? []), made]);
    return made;
  }
}

const idOf = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "number" ? id : null;
  }
  return null;
};

export async function importAmicoStock(options: RunOptions): Promise<ImportReport> {
  const { payload, dryRun, limit, req } = options;
  const log = options.log ?? ((line: string) => payload.logger.info(line));
  const now = options.now ?? (() => new Date());
  const fetcher = options.fetcher ?? createPoliteFetcher();
  const startedAt = now().toISOString();

  const report: ImportReport = {
    source: AMICO_SOURCE,
    dryRun,
    startedAt,
    finishedAt: startedAt,
    listingsFound: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    expired: 0,
    heldBack: 0,
    leftAlone: 0,
    unreadable: 0,
    failed: 0,
    liveAfter: null,
    photosSaved: 0,
    photosReused: 0,
    photosSkipped: 0,
    requests: 0,
    makesAdded: [],
    modelsAdded: [],
    coloursAdded: [],
    contactDetailsRemoved: 0,
    cars: [],
    problems: [],
    expiryWithheld: null,
    dataQuality: [],
    dealership: [],
  };

  // ----------------------------------------------------------------- the dealership and its branch

  const dealership = await ensureAmicoDealership({ payload, dryRun, req });
  report.dealership = dealership.planned;
  log(dealership.planned.join("; "));

  const lists = new Lists(payload, req);
  const staticDir = mediaDirectory(payload);

  // ----------------------------------------------------------------------------- the stock list

  const sitemap = await fetcher.text(AMICO_SITEMAP);
  const urls = [...new Set(sitemapLocations(sitemap).filter(isAmicoListingUrl))];
  const wanted = typeof limit === "number" ? urls.slice(0, limit) : urls;
  report.listingsFound = urls.length;
  log(
    `${urls.length} listings on ${AMICO_SOURCE}${wanted.length < urls.length ? `, reading ${wanted.length}` : ""}`,
  );

  const seen = new Set<string>();
  const titles = new Map<string, number>();
  let unreadable = 0;

  for (const [index, url] of wanted.entries()) {
    let listing: SourceListing;
    try {
      listing = parseAmicoListing(await fetcher.text(url), url);
    } catch (error) {
      unreadable += 1;
      report.unreadable += 1;
      report.problems.push(`${url} could not be read: ${(error as Error).message}`);
      log(`${index + 1}/${wanted.length} ${url}: could not be read`);
      continue;
    }

    seen.add(listing.externalId);
    report.contactDetailsRemoved += listing.removedContactDetails;
    report.dataQuality.push(...qualityNotes(listing, AMICO_TRADING_NAME));
    if (listing.title) titles.set(listing.title, (titles.get(listing.title) ?? 0) + 1);

    try {
      const line = await handleListing({
        listing,
        payload,
        lists,
        dealerId: dealership.dealerId,
        branchId: dealership.branchId,
        dryRun,
        fetcher,
        staticDir,
        report,
        req,
        now,
      });
      report.cars.push(line);
      log(`${index + 1}/${wanted.length} ${line.name}: ${line.outcome}`);
    } catch (error) {
      report.failed += 1;
      report.problems.push(`${url} could not be saved: ${(error as Error).message}`);
      log(`${index + 1}/${wanted.length} ${listing.title ?? listing.slug}: failed`);
    }
  }

  // ----------------------------------------------------------- cars that are no longer on the site

  if (typeof limit === "number") {
    report.expiryWithheld =
      "only part of the stock list was read (--limit), so no car was hidden for being missing";
  } else {
    await expireMissing({
      payload,
      dealerId: dealership.dealerId,
      seen,
      found: urls.length,
      unreadable,
      allowLargeRemoval: Boolean(options.allowLargeRemoval),
      dryRun,
      report,
      req,
    });
  }

  for (const [title, count] of titles) {
    if (count > 1) {
      report.problems.push(
        `"${title}" is the title of ${count} separate listings. Each is imported as its own car; worth checking with the dealership that they are ${count} different cars`,
      );
    }
  }

  if (!dryRun && dealership.dealerId > 0) {
    const live = await payload.count({
      collection: "vehicles",
      where: {
        and: [
          { dealer: { equals: dealership.dealerId } },
          { source: { equals: AMICO_SOURCE } },
          { status: { equals: "live" } },
        ],
      },
      overrideAccess: true,
      req,
    });
    report.liveAfter = live.totalDocs;
  }

  report.requests = fetcher.count();
  report.finishedAt = now().toISOString();
  return report;
}

/** Where uploaded files live, or an error when media has been moved to the cloud bucket. */
function mediaDirectory(payload: Payload): string {
  const upload = payload.collections.media?.config.upload;
  if (!upload || typeof upload !== "object" || upload.disableLocalStorage) {
    throw new Error(
      "Media is stored in the cloud bucket, so photographs cannot be written to this disk. Run the import where the files are served from.",
    );
  }
  return path.resolve(process.cwd(), upload.staticDir ?? "media");
}

type ListingContext = {
  listing: SourceListing;
  payload: Payload;
  lists: Lists;
  dealerId: number;
  branchId: number;
  dryRun: boolean;
  fetcher: PoliteFetcher;
  staticDir: string;
  report: ImportReport;
  req?: Partial<PayloadRequest>;
  now: () => Date;
};

async function handleListing(context: ListingContext): Promise<CarLine> {
  const { listing, payload, report, req } = context;

  const resolved = await resolveTaxonomy(context);
  if (!resolved) {
    // Without a make there is nothing to call the car, not even on a hidden draft.
    report.heldBack += 1;
    report.problems.push(
      `${listing.url} does not say which make and model this car is, so it was not listed`,
    );
    return {
      externalId: listing.externalId,
      url: listing.url,
      name: listing.title ?? listing.slug,
      outcome: "held back",
      reasons: [],
      changed: [],
      photos: 0,
      note: "the source page does not say which make and model this car is",
    };
  }

  // The car Rynet already holds for this listing, if any. Looked up on a dry run too, or a dry run
  // over stock that is already here would report every car as new.
  const existing =
    context.dealerId > 0
      ? await findExisting(payload, context.dealerId, listing.externalId, req)
      : null;

  if (existing && existing.sourceManaged === false) {
    report.leftAlone += 1;
    return line(listing, resolved.carName, "skipped", {
      photos: existing.photoCount,
      note: "taken off the import by hand",
    });
  }

  if (existing && !["draft", "pending_review", "live", "expired"].includes(existing.status)) {
    report.leftAlone += 1;
    return line(listing, resolved.carName, "skipped", {
      photos: existing.photoCount,
      note: `left as ${existing.status}, which a person set`,
    });
  }

  // Photographs are counted later, once they have been fetched. These are what the page itself
  // should have made clear, and each is worth telling the dealership about.
  const absent = missingFieldReasons(resolved.vehicle);
  const missing = [...absent, ...modelReasons(resolved.conflict !== null)];
  if (absent.length > 0) {
    report.dataQuality.push({
      kind: "a detail a buyer needs is missing",
      url: listing.url,
      detail: absent.join(", "),
    });
  }
  if (resolved.conflict) {
    report.dataQuality.push({
      kind: "the details and the title name different models",
      url: listing.url,
      detail: resolved.conflict,
    });
  }

  return existing
    ? await updateCar(context, resolved, existing, missing)
    : await createCar(context, resolved, missing);
}

function line(
  listing: SourceListing,
  name: string,
  outcome: ListingOutcome,
  rest: Partial<Omit<CarLine, "externalId" | "url" | "name" | "outcome">> = {},
): CarLine {
  return {
    externalId: listing.externalId,
    url: listing.url,
    name,
    outcome,
    reasons: rest.reasons ?? [],
    changed: rest.changed ?? [],
    photos: rest.photos ?? 0,
    ...(rest.note ? { note: rest.note } : {}),
  };
}

async function createCar(
  context: ListingContext,
  resolved: Resolved,
  missing: HoldReason[],
): Promise<CarLine> {
  const { listing, report, now, dryRun } = context;

  if (dryRun) {
    const photos = Math.min(listing.photoUrls.length, MAX_PHOTOS_PER_CAR);
    const reasons = [...missing, ...photoReasons(photos)];
    report.created += 1;
    if (reasons.length > 0) report.heldBack += 1;
    return line(listing, resolved.carName, "created", {
      reasons,
      photos,
      note: holdNote(reasons, AMICO_SOURCE, resolved.conflict ?? undefined) || undefined,
    });
  }

  // Photographs first, so the car is written once, complete, rather than created and then
  // corrected. A photograph saved before a failed write is not lost: the next run finds it by
  // its file name and uses it.
  const photos = await attachPhotos(context, resolved.carName);
  const reasons = [...missing, ...photoReasons(photos.saved)];
  const note = holdNote(reasons, AMICO_SOURCE, resolved.conflict ?? undefined);
  const stamp = now().toISOString();

  await writeCar(
    context,
    null,
    {
      ...vehicleFields(resolved.vehicle),
      condition: "pre_owned",
      priceType: "retail",
      vatStatus: "vat_inclusive",
      dealer: context.dealerId,
      branch: context.branchId,
      isDemonstration: false,
      source: AMICO_SOURCE,
      externalId: listing.externalId,
      sourceManaged: true,
      lastSeenInSourceAt: stamp,
      ...(photos.gallery.length > 0 ? { gallery: photos.gallery } : {}),
      status: reasons.length > 0 ? "draft" : "live",
      sourceNote: note,
    },
    resolved.carName,
  );

  report.created += 1;
  if (reasons.length > 0) report.heldBack += 1;
  return line(listing, resolved.carName, "created", {
    reasons,
    photos: photos.saved,
    note: note || undefined,
  });
}

async function updateCar(
  context: ListingContext,
  resolved: Resolved,
  existing: ExistingVehicle,
  missing: HoldReason[],
): Promise<CarLine> {
  const { payload, listing, report, req, now, dryRun } = context;
  const { fields, patch } = changesBetween(existing, resolved.vehicle);

  // A car with no photographs gets them now. One that has them is left alone: re-downloading a
  // dealership's whole gallery every run to learn that nothing changed is neither kind nor useful.
  const wantsPhotos = existing.photoCount === 0 && listing.photoUrls.length > 0;
  const photos = !wantsPhotos
    ? { saved: existing.photoCount, gallery: [] as { image: number; alt: string }[] }
    : dryRun
      ? {
          saved: Math.min(listing.photoUrls.length, MAX_PHOTOS_PER_CAR),
          gallery: [] as { image: number; alt: string }[],
        }
      : await attachPhotos(context, resolved.carName);

  const reasons = [...missing, ...photoReasons(photos.saved)];
  const status = statusFor(existing.status, reasons);
  const note = holdNote(reasons, AMICO_SOURCE, resolved.conflict ?? undefined);
  const description = toParagraphs(listing.description);
  const wantsDescription = fields.includes("description");

  const changed = [
    ...fields,
    ...(status ? ["status"] : []),
    ...(photos.gallery.length > 0 || (dryRun && wantsPhotos) ? ["gallery"] : []),
  ];
  const noteChanged = note !== (existing.sourceNote ?? "");

  if (changed.length === 0 && !noteChanged) {
    if (!dryRun) {
      // Nothing to say except that the car is still there. Written straight to the row so the run
      // does not add a version to every car's history every night.
      await payload.db.updateOne({
        collection: "vehicles",
        id: existing.id,
        data: { lastSeenInSourceAt: now().toISOString() },
        req: req as PayloadRequest | undefined,
      });
    }
    report.unchanged += 1;
    if (reasons.length > 0) report.heldBack += 1;
    return line(listing, resolved.carName, "unchanged", {
      reasons,
      photos: photos.saved,
      note: note || undefined,
    });
  }

  if (!dryRun) {
    await writeCar(
      context,
      existing,
      {
        ...patch,
        ...(wantsDescription ? { description: lexicalParagraphs(description) } : {}),
        ...(photos.gallery.length > 0 ? { gallery: photos.gallery } : {}),
        ...(status ? { status } : {}),
        lastSeenInSourceAt: now().toISOString(),
        sourceManaged: true,
        sourceNote: note,
      },
      resolved.carName,
    );
  }

  report.updated += 1;
  if (reasons.length > 0) report.heldBack += 1;
  return line(listing, resolved.carName, "updated", {
    reasons,
    changed: changed.length > 0 ? changed : ["note"],
    photos: photos.saved,
    note: note || undefined,
  });
}

/**
 * Writes one car, through Payload whenever the car is complete enough to pass its validation.
 *
 * A complete car goes through `payload.create` or `payload.update`, so every rule on the Cars
 * collection applies to it exactly as it does to a car a person saves: the verification check
 * before anything goes live, the price history, the title, the reference number.
 *
 * A car whose page left out a value the collection requires (a mileage, a price) cannot pass that
 * validation, and filling the gap in to make it pass would be inventing a number. So that car,
 * and only that car, is written straight to its row as a hidden draft, with the reason on it. What
 * the hooks would have done that matters for it is done here by hand: the title and reference
 * number on creation, and the price history on a change of price. Nothing written this way can be
 * live, because the status is always a hidden one: a car missing a required value always has a
 * reason to be held.
 */
async function writeCar(
  context: ListingContext,
  existing: ExistingVehicle | null,
  data: Record<string, unknown>,
  /** What to call a car that has no model yet: the page's own words for it. */
  carName: string,
): Promise<void> {
  const { payload, req, lists } = context;

  const merged = {
    make: (data.make as number | undefined) ?? existing?.make ?? null,
    model: (data.model as number | null | undefined) ?? existing?.model ?? null,
    modelYear: (data.modelYear as number | null | undefined) ?? existing?.modelYear ?? null,
    mileageKm: (data.mileageKm as number | null | undefined) ?? existing?.mileageKm ?? null,
    price: (data.price as number | null | undefined) ?? existing?.price ?? null,
  };

  if (hasRequiredValues(merged)) {
    if (existing) {
      await payload.update({
        collection: "vehicles",
        id: existing.id,
        data: { ...data, _status: "published" } as RequiredDataFromCollectionSlug<"vehicles">,
        overrideAccess: true,
        req,
      });
    } else {
      await payload.create({
        collection: "vehicles",
        data: { ...data, _status: "published" } as RequiredDataFromCollectionSlug<"vehicles">,
        overrideAccess: true,
        req,
      });
    }
    return;
  }

  // The hidden draft route. The status is forced to a hidden one whatever the caller asked for.
  const status = data.status === "live" ? "draft" : data.status;
  const stamp = new Date().toISOString();
  const nameOf = async (collection: "makes" | "models", id: number | null) =>
    id === null
      ? null
      : ((await lists.load(collection)).find((entry) => entry.id === id)?.name ?? null);

  // A car with no model yet (its page named two) is called what its page calls it, so a person
  // scanning the admin list can tell it from the next one. Saving it with a model puts the usual
  // title back.
  const modelName = await nameOf("models", merged.model);
  const title = modelName
    ? vehicleTitle({
        modelYear: merged.modelYear,
        make: await nameOf("makes", merged.make),
        model: modelName,
      })
    : carName;

  // Rows in a list (the gallery, the price history) are given their ids by Payload on the way in.
  // Written straight to the table they need one each, in the same 24 character shape.
  const withRowIds = <T extends Record<string, unknown>>(rows: T[] | undefined) =>
    rows?.map((row) => ({ ...row, id: (row.id as string | undefined) ?? rowId() }));
  const gallery = withRowIds(data.gallery as Record<string, unknown>[] | undefined);

  if (existing) {
    const prices =
      typeof data.price === "number"
        ? priceFieldsFromSaved(
            {
              price: existing.price ?? null,
              previousPrice: existing.previousPrice ?? null,
              priceHistory: existing.priceHistory ?? [],
            },
            data.price,
          )
        : null;
    await payload.db.updateOne({
      collection: "vehicles",
      id: existing.id,
      data: {
        ...data,
        ...(gallery ? { gallery } : {}),
        ...(status ? { status } : {}),
        ...(prices
          ? {
              previousPrice: prices.previousPrice,
              priceHistory: withRowIds(prices.priceHistory as Record<string, unknown>[]),
            }
          : {}),
        title,
        updatedAt: stamp,
      },
      req: req as PayloadRequest | undefined,
    });
    return;
  }

  await payload.db.create({
    collection: "vehicles",
    data: {
      ...data,
      ...(gallery ? { gallery } : {}),
      status: status ?? "draft",
      title,
      publicRef: generatePublicRef(),
      _status: "published",
      createdAt: stamp,
      updatedAt: stamp,
    },
    req: req as PayloadRequest | undefined,
  });
}

/** An id for a list row, the shape Payload gives them: 24 hexadecimal characters. */
function rowId(): string {
  return randomBytes(12).toString("hex");
}

/** The fields a car carries from its source, as Payload wants them. */
function vehicleFields(vehicle: Resolved["vehicle"]): Record<string, unknown> {
  return {
    make: vehicle.make,
    ...(vehicle.model ? { model: vehicle.model } : {}),
    ...(vehicle.variant ? { variant: vehicle.variant } : {}),
    ...(vehicle.derivative ? { derivative: vehicle.derivative } : {}),
    ...(typeof vehicle.modelYear === "number" ? { modelYear: vehicle.modelYear } : {}),
    ...(typeof vehicle.mileageKm === "number" ? { mileageKm: vehicle.mileageKm } : {}),
    ...(typeof vehicle.price === "number" ? { price: vehicle.price } : {}),
    ...(vehicle.bodyType ? { bodyType: vehicle.bodyType } : {}),
    ...(vehicle.fuelType ? { fuelType: vehicle.fuelType } : {}),
    ...(vehicle.transmission ? { transmission: vehicle.transmission } : {}),
    ...(vehicle.drivetrain ? { drivetrain: vehicle.drivetrain } : {}),
    ...(vehicle.exteriorColour ? { exteriorColour: vehicle.exteriorColour } : {}),
    ...(vehicle.interiorColour ? { interiorColour: vehicle.interiorColour } : {}),
    ...(vehicle.features.length > 0 ? { features: vehicle.features } : {}),
    ...(vehicle.description
      ? { description: lexicalParagraphs(toParagraphs(vehicle.description)) }
      : {}),
  };
}

async function findExisting(
  payload: Payload,
  dealerId: number,
  externalId: string,
  req?: Partial<PayloadRequest>,
): Promise<ExistingVehicle | null> {
  const found = await payload.find({
    collection: "vehicles",
    where: {
      and: [
        { dealer: { equals: dealerId } },
        { source: { equals: AMICO_SOURCE } },
        { externalId: { equals: externalId } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const doc = found.docs[0] as unknown as Record<string, unknown> | undefined;
  if (!doc) return null;

  return {
    id: doc.id as number,
    status: String(doc.status ?? "draft"),
    sourceManaged: (doc.sourceManaged as boolean | null) ?? null,
    sourceNote: (doc.sourceNote as string | null) ?? null,
    price: (doc.price as number | null) ?? null,
    previousPrice: (doc.previousPrice as number | null) ?? null,
    priceHistory: (doc.priceHistory as ExistingVehicle["priceHistory"]) ?? [],
    mileageKm: (doc.mileageKm as number | null) ?? null,
    modelYear: (doc.modelYear as number | null) ?? null,
    make: idOf(doc.make),
    model: idOf(doc.model),
    variant: idOf(doc.variant),
    derivative: (doc.derivative as string | null) ?? null,
    bodyType: idOf(doc.bodyType),
    fuelType: idOf(doc.fuelType),
    transmission: idOf(doc.transmission),
    drivetrain: idOf(doc.drivetrain),
    exteriorColour: idOf(doc.exteriorColour),
    interiorColour: idOf(doc.interiorColour),
    features: ((doc.features as unknown[]) ?? [])
      .map(idOf)
      .filter((id): id is number => id !== null),
    description: doc.description,
    photoCount: ((doc.gallery as unknown[]) ?? []).length,
  };
}

/**
 * Downloads, converts and registers this car's photographs, one at a time.
 *
 * A photograph that fails is counted, logged and stepped over: one broken image on their server is
 * not a reason to lose the other eleven. A photograph already saved by an earlier run is found by
 * its file name and used again, with its description brought up to date, rather than fetched
 * twice.
 */
async function attachPhotos(
  context: ListingContext,
  carName: string,
): Promise<{ saved: number; gallery: { image: number; alt: string }[] }> {
  const { listing, payload, fetcher, staticDir, report, dryRun, req } = context;
  if (dryRun) return { saved: 0, gallery: [] };

  const gallery: { image: number; alt: string }[] = [];
  const urls = listing.photoUrls.slice(0, MAX_PHOTOS_PER_CAR);

  for (const [index, url] of urls.entries()) {
    const position = index + 1;
    const alt = photoAlt(carName, position);
    const base = photoFilename("amico", listing.externalId, position);

    try {
      const existing = await payload.find({
        collection: "media",
        where: { filename: { equals: `${base}.webp` } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      });
      const found = existing.docs[0] as { id: number; alt?: string | null } | undefined;
      if (found) {
        if (found.alt !== alt) {
          await payload.db.updateOne({
            collection: "media",
            id: found.id,
            data: { alt },
            req: req as PayloadRequest | undefined,
          });
        }
        gallery.push({ image: found.id, alt });
        report.photosReused += 1;
        continue;
      }

      const downloaded = await fetcher.bytes(url);
      const rendered = await renderPhoto(downloaded.body);
      const files = await writePhotoFiles(staticDir, base, rendered);
      const created = await payload.db.create({
        collection: "media",
        data: mediaRecord({
          files,
          rendered,
          alt,
          dealerId: context.dealerId,
          folder: "amico-motors",
          credit: AMICO_TRADING_NAME,
        }),
        req: req as PayloadRequest | undefined,
      });
      gallery.push({ image: created.id as number, alt });
      report.photosSaved += 1;
    } catch (error) {
      report.photosSkipped += 1;
      report.problems.push(`${url} could not be saved: ${(error as Error).message}`);
    }
  }

  return { saved: gallery.length, gallery };
}

/** Cars this dealership's stock list no longer shows. Hidden, never deleted and never sold. */
async function expireMissing(options: {
  payload: Payload;
  dealerId: number;
  seen: Set<string>;
  found: number;
  unreadable: number;
  allowLargeRemoval: boolean;
  dryRun: boolean;
  report: ImportReport;
  req?: Partial<PayloadRequest>;
}): Promise<void> {
  const { payload, dealerId, seen, dryRun, report, req } = options;
  if (dealerId < 0) return;

  const held = await payload.find({
    collection: "vehicles",
    where: {
      and: [{ dealer: { equals: dealerId } }, { source: { equals: AMICO_SOURCE } }],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const docs = held.docs as unknown as Record<string, unknown>[];

  const gone = docs.filter((doc) => !seen.has(String(doc.externalId ?? "")));
  const toExpire: { doc: Record<string, unknown>; status: string }[] = [];
  for (const doc of gone) {
    const status = expiredStatusFor(String(doc.status ?? "draft"));
    if (doc.sourceManaged === false || !status) {
      report.leftAlone += 1;
      continue;
    }
    toExpire.push({ doc, status });
  }

  const listed = docs.filter((doc) => doc.status !== "expired").length;
  const safety = expirySafety({
    found: options.found,
    unreadable: options.unreadable,
    wouldExpire: toExpire.length,
    listed,
    allowLargeRemoval: options.allowLargeRemoval,
  });
  if (!safety.safe) {
    report.expiryWithheld = safety.reason;
    report.problems.push(safety.reason);
    return;
  }

  for (const { doc, status } of toExpire) {
    const externalId = String(doc.externalId ?? "");
    report.expired += 1;
    report.cars.push({
      externalId,
      url: "",
      name: String(doc.title ?? externalId),
      outcome: "expired",
      reasons: [],
      changed: ["status"],
      photos: ((doc.gallery as unknown[]) ?? []).length,
      note: "no longer on the source stock list",
    });

    if (dryRun) continue;
    const data = {
      status,
      sourceNote: `Hidden by the ${AMICO_SOURCE} import: this car is no longer on that stock list.`,
    };
    const complete = hasRequiredValues({
      make: idOf(doc.make),
      model: idOf(doc.model),
      modelYear: (doc.modelYear as number | null) ?? null,
      mileageKm: (doc.mileageKm as number | null) ?? null,
      price: (doc.price as number | null) ?? null,
    });
    if (complete) {
      await payload.update({
        collection: "vehicles",
        id: doc.id as number,
        data: { ...data, _status: "published" } as RequiredDataFromCollectionSlug<"vehicles">,
        overrideAccess: true,
        req,
      });
    } else {
      // A hidden draft that never had its mileage. It cannot pass validation, and it is already
      // hidden, so only its state and its note change.
      await payload.db.updateOne({
        collection: "vehicles",
        id: doc.id as number,
        data: { ...data, updatedAt: new Date().toISOString() },
        req: req as PayloadRequest | undefined,
      });
    }
  }
}

type Resolved = {
  carName: string;
  /** What the page said about its model when it contradicted itself, for the note on the car. */
  conflict: string | null;
  vehicle: {
    make: number;
    model: number | null;
    variant: number | null;
    derivative: string | null;
    modelYear: number | null;
    mileageKm: number | null;
    price: number | null;
    bodyType: number | null;
    fuelType: number | null;
    transmission: number | null;
    drivetrain: number | null;
    exteriorColour: number | null;
    interiorColour: number | null;
    features: number[];
    description: string;
  };
};

/**
 * What the source said, turned into Rynet's own lists.
 *
 * Returns null only when the page does not say which make the car is. A page that names two
 * different models resolves with `conflict` set and no new model created for it, so the car is
 * kept, hidden, and a person decides. Everything else resolves to an id or to nothing: an
 * unmatched gearbox is simply left empty rather than turned into the nearest gearbox.
 */
async function resolveTaxonomy(context: ListingContext): Promise<Resolved | null> {
  const { listing, lists, dryRun, report } = context;

  // ------------------------------------------------------------------------------------- the make
  const makes = await lists.load("makes");
  // The Make row where the page has one, and otherwise the make its title starts with.
  const makeText = listing.makeText ?? firstWordsMatchingMake(makes, listing.title);
  let make = findEntry(makes, makeText, SOURCE_ALIASES.makes);

  if (!make && makeText) {
    const name = makeText.trim();
    report.makesAdded.push(name);
    make = dryRun
      ? lists.pretend("makes", { name, slug: null, aliases: null })
      : await lists.add("makes", { name, isActive: true });
  }
  if (!make) return null;

  // ------------------------------------------------------------------------------------ the model
  const models = (await lists.load("models")).filter((entry) => entry.parent === make.id);
  const titleText = modelTextFromTitle(listing.title, make.name, SOURCE_ALIASES.makes);
  const choice = chooseModel(
    pickModel(models, make.name, listing.modelText),
    pickModel(models, make.name, titleText),
    titleText,
  );

  let model: TaxonomyEntry | null = null;
  let trim = "";
  let conflict: string | null = null;

  if (choice.kind === "pick") {
    trim = choice.trim;
    model = choice.pick.entry;
    if (!model) {
      const name = choice.pick.name;
      report.modelsAdded.push(`${make.name} ${name}`);
      model = dryRun
        ? lists.pretend("models", { name, slug: null, aliases: null, parent: make.id })
        : await lists.add("models", { name, make: make.id, isActive: true });
    }
  } else if (choice.kind === "conflict") {
    // Nothing is chosen and nothing is added for a car whose page contradicts itself. It is kept
    // with no model at all, hidden, until a person decides, so it cannot be filed under the wrong
    // one even by accident.
    conflict = `Its details say ${make.name} ${choice.table.name} but its title says ${make.name} ${choice.title.name}.`;
    model = null;
    trim = titleText;
  } else {
    // Nothing in the table and nothing in the title. The web address is the last thing left, and
    // it only ever recognises a model Rynet already keeps.
    model = modelFromSlug(models, listing.slug, make.slug ?? null);
  }

  // ---------------------------------------------------------------------------------- the variant
  const variants = model
    ? (await lists.load("variants")).filter((entry) => entry.parent === model.id)
    : [];
  const variantMatch = trim && !conflict ? findLeading(variants, trim) : null;
  const variant = variantMatch?.entry ?? null;
  const derivative = (variantMatch ? variantMatch.residue : trim).trim();

  // ------------------------------------------------------------------------------- the short lists
  const [bodies, fuels, gearboxes, drives, colours, features] = await Promise.all([
    lists.load("body-types"),
    lists.load("fuel-types"),
    lists.load("transmissions"),
    lists.load("drivetrains"),
    lists.load("colours"),
    lists.load("features"),
  ]);

  const featureIds: number[] = [];
  for (const name of listing.features) {
    const match = findEntry(features, name, SOURCE_ALIASES.features);
    if (match && !featureIds.includes(match.id)) featureIds.push(match.id);
  }

  const carName = (
    conflict
      ? [listing.year, make.name, titleText]
      : [listing.year, make.name, model?.name, variant?.name ?? derivative]
  )
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!model && !conflict) return null;

  return {
    carName,
    conflict,
    vehicle: {
      make: make.id,
      model: model?.id ?? null,
      variant: variant?.id ?? null,
      derivative: derivative || null,
      modelYear: listing.year,
      mileageKm: listing.mileageKm,
      price: listing.price,
      bodyType: findEntry(bodies, listing.bodyText, SOURCE_ALIASES["body-types"])?.id ?? null,
      fuelType: findEntry(fuels, listing.fuelText, SOURCE_ALIASES["fuel-types"])?.id ?? null,
      transmission:
        findEntry(gearboxes, listing.transmissionText, SOURCE_ALIASES.transmissions)?.id ?? null,
      drivetrain: findEntry(drives, listing.driveText, SOURCE_ALIASES.drivetrains)?.id ?? null,
      exteriorColour: await resolveColour(context, colours, listing.exteriorColourText),
      interiorColour: await resolveColour(context, colours, listing.interiorColourText),
      features: featureIds,
      description: listing.description,
    },
  };
}

/** The make a page title starts with, for a listing whose table has no Make row. */
function firstWordsMatchingMake(makes: TaxonomyEntry[], title: string | null): string | null {
  if (!title) return null;
  const words = title.trim().split(/\s+/);
  for (let take = Math.min(2, words.length); take >= 1; take -= 1) {
    const candidate = words.slice(0, take).join(" ");
    if (findEntry(makes, candidate, SOURCE_ALIASES.makes)) return candidate;
  }
  return null;
}

/**
 * A colour, matched or added.
 *
 * Colours are added rather than dropped because the colour a car is is one of the things a buyer
 * filters by, and the filter works on the GROUP, not the name. So the entry keeps the maker's own
 * words, tidied, and is filed under the group its name gives away: "Dark Grey Metallic" filters
 * under Grey. A colour whose name says nothing about a group, and Rynet has no entry for, is left
 * empty rather than filed under a guess.
 */
async function resolveColour(
  context: ListingContext,
  colours: TaxonomyEntry[],
  text: string | null,
): Promise<number | null> {
  if (!text?.trim()) return null;
  const existing = findEntry(colours, text);
  if (existing) return existing.id;

  const name = tidyColourName(text);
  const family = colourFamilyOf(name);
  if (!name || !family) return null;

  const again = findEntry(colours, name);
  if (again) return again.id;

  context.report.coloursAdded.push(name);
  if (context.dryRun) {
    return context.lists.pretend("colours", { name, slug: null, aliases: null, family }).id;
  }
  const created = await context.lists.add("colours", {
    name,
    family,
    isActive: true,
    // The source writes this colour this way, so the entry answers to that spelling too.
    aliases: [normaliseKey(text)],
  });
  return created.id;
}
