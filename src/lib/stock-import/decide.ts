import { lexicalToText, tidyPunctuation } from "./text";
import type { HoldReason, VehicleValues } from "./types";

/**
 * Deciding what happens to each car, with nothing that talks to a database.
 *
 * Every rule about whether a car goes live, what changed since the last run and what happens to a
 * car that has vanished from its source lives here, as functions over plain values. That is what
 * makes the dry run trustworthy: the report a dry run prints is produced by exactly the code that
 * would have done the writing, rather than by a second description of the same intentions.
 *
 * THE FIVE RULES
 *
 * 1. A car with no price, no mileage or no model year stays hidden. Those are the three things a
 *    buyer filters on, and a car missing one of them is not a listing, it is a gap in a results
 *    page. It is still kept, as a hidden draft with its photographs, and the reason is written onto
 *    the car so the person looking at the admin can see it and the next run can put it live.
 * 2. A car whose page names two different models stays hidden the same way, for the same reason:
 *    filing it under either one is a guess, and a wrong model is a car nobody finds.
 * 3. A car with no photograph stays hidden, checked after its photographs have been dealt with
 *    rather than before, because "the download failed" and "there were none" end the same way.
 * 4. A car that has disappeared from its source becomes Expired, which is hidden. Never deleted,
 *    because the enquiries and the price history point at it. Never Sold, because only the
 *    dealership knows whether it sold, and this source never says so. And only when the run has
 *    seen the whole list: see `expirySafety`.
 * 5. A decision a person has made is never overruled. A car marked Sold, Reserved or Archived is
 *    left where it is, and so is a car whose "Kept up to date from there" has been unticked.
 */

/** The listing states this import is allowed to move a car into or out of. */
const IMPORT_OWNED_STATES = new Set(["draft", "pending_review", "live", "expired"]);

export type ExistingVehicle = {
  id: number;
  status: string;
  sourceManaged?: boolean | null;
  price?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  make?: number | null;
  model?: number | null;
  variant?: number | null;
  derivative?: string | null;
  bodyType?: number | null;
  fuelType?: number | null;
  transmission?: number | null;
  drivetrain?: number | null;
  exteriorColour?: number | null;
  interiorColour?: number | null;
  features?: number[];
  description?: unknown;
  photoCount: number;
  sourceNote?: string | null;
  previousPrice?: number | null;
  priceHistory?: { price?: number | null; changedAt?: string | null }[] | null;
};

/**
 * Whether a car has every value the Cars collection insists on.
 *
 * A car that does can be written through Payload, with its validation and every hook (the
 * verification check, the price history). A car that does not, because its page left out the
 * mileage, is written straight to its row as a hidden draft instead, which is the only way to keep
 * it at all; see `writeCar` in run.ts. Either way nothing is made up to fill the gap.
 */
export function hasRequiredValues(car: {
  make?: number | null;
  model?: number | null;
  modelYear?: number | null;
  mileageKm?: number | null;
  price?: number | null;
}): boolean {
  return (
    typeof car.make === "number" &&
    typeof car.model === "number" &&
    typeof car.modelYear === "number" &&
    typeof car.mileageKm === "number" &&
    typeof car.price === "number"
  );
}

/**
 * The three things the source page has to say before a car can be a listing at all.
 *
 * A new car missing one of them is kept as a hidden draft with the value left empty, never filled
 * in. A car we already hold that loses one of them is hidden too, keeping the value it had, which
 * is the case that matters: a live car whose price has gone off the source is a price Rynet can no
 * longer stand behind.
 */
export function missingFieldReasons(car: {
  price?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
}): HoldReason[] {
  const reasons: HoldReason[] = [];
  if (typeof car.price !== "number" || car.price <= 0) reasons.push("no price on the source page");
  if (typeof car.mileageKm !== "number") reasons.push("no mileage on the source page");
  if (typeof car.modelYear !== "number") reasons.push("no model year on the source page");
  return reasons;
}

/**
 * A page that contradicts itself about which model the car is.
 *
 * "Q3" in its details and "Q2" in its title is not something an import can settle, and choosing
 * either one risks filing the car where a buyer looking for it never finds it. So the car is kept,
 * hidden, and the dealership is asked.
 */
export function modelReasons(conflict: boolean): HoldReason[] {
  return conflict ? ["its details and its title name different models"] : [];
}

/** Asked after the photographs have been dealt with, never before. */
export function photoReasons(photoCount: number): HoldReason[] {
  return photoCount < 1 ? ["no photograph could be saved"] : [];
}

/** Why this car cannot go live yet, in the order a person would read them. */
export function holdReasons(car: {
  price?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  modelConflict?: boolean;
  photoCount?: number;
}): HoldReason[] {
  return [
    ...missingFieldReasons(car),
    ...modelReasons(Boolean(car.modelConflict)),
    ...photoReasons(car.photoCount ?? 0),
  ];
}

/**
 * The listing state a car should end this run in.
 *
 * `null` means leave it exactly as it is, which is the answer whenever a person has already made
 * a decision about this car that an import has no business reversing.
 */
export function statusFor(existingStatus: string | null, reasons: HoldReason[]): string | null {
  if (existingStatus !== null && !IMPORT_OWNED_STATES.has(existingStatus)) return null;
  if (reasons.length > 0) return existingStatus === "draft" ? null : "draft";
  return existingStatus === "live" ? null : "live";
}

/** What a car that has vanished from its source becomes, or null when it is left alone. */
export function expiredStatusFor(existingStatus: string): string | null {
  if (!IMPORT_OWNED_STATES.has(existingStatus)) return null;
  return existingStatus === "expired" ? null : "expired";
}

const sameList = (left: number[], right: number[]): boolean =>
  left.length === right.length &&
  [...left].sort((a, b) => a - b).join(",") === [...right].sort((a, b) => a - b).join(",");

/**
 * The fields that differ, and the patch that would put them right.
 *
 * Only differences are returned, so a run over stock nobody has touched writes nothing at all and
 * says "unchanged" for every car. That matters more than it sounds: every write to a car creates
 * a version row, and a nightly import that rewrites unchanged stock would fill the history with
 * saves nobody made.
 *
 * Photographs are deliberately not compared. They are fetched for a car that has none and left
 * alone otherwise, because re-downloading a dealership's whole gallery on a timer to find out
 * that nothing changed is neither kind to their server nor useful.
 */
export function changesBetween(
  existing: ExistingVehicle,
  incoming: VehicleValues,
): { fields: string[]; patch: Record<string, unknown> } {
  const fields: string[] = [];
  const patch: Record<string, unknown> = {};

  const compare = (name: string, was: unknown, now: unknown): void => {
    if (now === null || now === undefined) return;
    if (was === now) return;
    fields.push(name);
    patch[name] = now;
  };

  compare("make", existing.make ?? null, incoming.make);
  compare("model", existing.model ?? null, incoming.model);
  compare("variant", existing.variant ?? null, incoming.variant);
  compare("modelYear", existing.modelYear ?? null, incoming.modelYear);
  compare("mileageKm", existing.mileageKm ?? null, incoming.mileageKm);
  compare("price", existing.price ?? null, incoming.price);
  compare("bodyType", existing.bodyType ?? null, incoming.bodyType);
  compare("fuelType", existing.fuelType ?? null, incoming.fuelType);
  compare("transmission", existing.transmission ?? null, incoming.transmission);
  compare("drivetrain", existing.drivetrain ?? null, incoming.drivetrain);
  compare("exteriorColour", existing.exteriorColour ?? null, incoming.exteriorColour);
  compare("interiorColour", existing.interiorColour ?? null, incoming.interiorColour);

  const derivative = incoming.derivative?.trim() ?? "";
  if (derivative && derivative !== (existing.derivative ?? "").trim()) {
    fields.push("derivative");
    patch.derivative = derivative;
  }

  if (incoming.features.length > 0 && !sameList(existing.features ?? [], incoming.features)) {
    fields.push("features");
    patch.features = incoming.features;
  }

  const description = tidyPunctuation(incoming.description);
  if (description && description !== lexicalToText(existing.description)) {
    fields.push("description");
  }

  return { fields, patch };
}

/**
 * The note written onto a held back car, so the reason is on the car and not only in a log.
 *
 * Read by a person in the admin, so it is a sentence rather than a code. `detail` says what the
 * page actually said, where that helps somebody put it right: which two models it named.
 */
export function holdNote(reasons: HoldReason[], source: string, detail?: string): string {
  if (reasons.length === 0) return "";
  const list =
    reasons.length === 1
      ? reasons[0]
      : `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`;
  return `Hidden by the ${source} import: ${list}.${detail ? ` ${detail}` : ""}`;
}

/**
 * Whether it is safe to hide the cars this run did not find.
 *
 * A car that is gone from the dealership's website is hidden here, which is the faithful thing to
 * do. A car that merely could not be READ is not gone, and the two look identical from inside a
 * run. So expiry is refused, and the report says why, when the run has reason to think it did not
 * see the whole list:
 *
 *   - the list came back empty, which is their site failing far more often than every car selling
 *     on the same night;
 *   - any listing page could not be read, because that car would be hidden for a network error;
 *   - more than half of what is listed would go at once, which is what a changed theme or a broken
 *     sitemap looks like. A person who has checked their site and seen it really is so can let it
 *     through with `allowLargeRemoval`.
 *
 * The cars are not lost by waiting: the next complete run hides them.
 */
export function expirySafety(run: {
  found: number;
  unreadable: number;
  wouldExpire: number;
  listed: number;
  allowLargeRemoval?: boolean;
}): { safe: true } | { safe: false; reason: string } {
  if (run.found === 0) {
    return {
      safe: false,
      reason:
        "the stock list came back empty, so nothing was hidden: an empty list is far more likely to be their site failing than every car selling at once",
    };
  }
  if (run.unreadable > 0) {
    return {
      safe: false,
      reason: `${run.unreadable} listing ${run.unreadable === 1 ? "page" : "pages"} could not be read, so nothing was hidden this run: a car that could not be read would look exactly like one that has gone`,
    };
  }
  const tooMany = run.wouldExpire > 5 && run.wouldExpire * 2 > run.listed;
  if (tooMany && !run.allowLargeRemoval) {
    return {
      safe: false,
      reason: `this run would hide ${run.wouldExpire} of the ${run.listed} cars listed from this source, more than half at once, so nothing was hidden. Check their site, and if it really shows that, run again with --allow-large-removal`,
    };
  }
  return { safe: true };
}
