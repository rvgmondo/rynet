import { normaliseKey } from "./text";
import type { SourceListing } from "./types";

/**
 * What is wrong with the dealership's own data, collected while reading it.
 *
 * This import reads their website more carefully than anybody has in months, so what it trips over
 * is worth handing back to them rather than quietly working around. Every note is something a
 * person at the dealership can go and fix in their own admin, and each says what is wrong rather
 * than what the import did about it.
 *
 * Each note carries a kind, so the report can say "eleven cars do this" and show a few rather than
 * printing the same sentence eleven times with a different address on the end.
 *
 * Pure, so the run can be tested without a website.
 */

export type QualityNote = { kind: QualityKind; url: string; detail: string };

export type QualityKind =
  | "the details and the title name different models"
  | "a detail a buyer needs is missing"
  | "model does not match the address"
  | "screenshots instead of photographs"
  | "a price typed into the description"
  | "another business named in the description";

/** What each kind means, written for the person who has to pass it on. */
export const QUALITY_MEANING: Record<QualityKind, string> = {
  "the details and the title name different models":
    "The Model field in the car's details names one model and the page's own title names another. Rynet cannot tell which is right, so the car is kept hidden until one of them is corrected.",
  "a detail a buyer needs is missing":
    "The page does not give the car's mileage, price or year. Rynet does not fill a gap like that in, so the car is kept hidden until the page gives it.",
  "model does not match the address":
    "The car's web address names a different model from its Model field. Usually the page was retitled after it was made, sometimes for a different car; worth checking which it is.",
  "screenshots instead of photographs":
    "The car is illustrated with screenshots rather than photographs. A screenshot of somebody else's advert belongs to whoever made that advert, not to the dealership.",
  "a price typed into the description":
    "The price is written into the prose as well as the price field, so the two will disagree the day the price changes.",
  "another business named in the description":
    "The description names a different business from the one the cars are listed under. A buyer should see one name.",
};

/** A model row that does not match the address of the page it is on. */
export function modelDisagreesWithAddress(listing: SourceListing): QualityNote | null {
  const model = normaliseKey(listing.modelText ?? "");
  // One word only. "C-Class" on a page called mercedes-benz-c-200k is the same car written two
  // ways, and flagging that every time would bury the ones that matter.
  if (!model || model.includes(" ") || model.length < 2) return null;

  const address = listing.slug.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (address.includes(model)) return null;

  return {
    kind: "model does not match the address",
    url: listing.url,
    detail: `filed under "${listing.modelText}"`,
  };
}

/** Photographs that are screenshots of something else rather than photographs of the car. */
export function screenshotPhotos(listing: SourceListing): QualityNote | null {
  const screenshots = listing.photoUrls.filter((url) => /screenshot/i.test(url));
  if (screenshots.length === 0) return null;
  return {
    kind: "screenshots instead of photographs",
    url: listing.url,
    detail: `${screenshots.length} of ${listing.photoUrls.length} images`,
  };
}

/** A price typed into the prose, which goes stale the moment the real price changes. */
export function priceInDescription(listing: SourceListing): QualityNote | null {
  const match = listing.description.match(/\bR\s?\d{2,3}[ ,]?\d{3}\b/);
  if (!match) return null;
  return {
    kind: "a price typed into the description",
    url: listing.url,
    detail: `the description says ${match[0]}`,
  };
}

/** A description that names a business other than the one the cars are listed under. */
export function otherTradingName(listing: SourceListing, tradingName: string): QualityNote | null {
  const names = ["SA Multi Franchise Motor Group"];
  const found = names.find((name) => listing.description.includes(name));
  if (!found) return null;
  return {
    kind: "another business named in the description",
    url: listing.url,
    detail: `names "${found}" rather than ${tradingName}`,
  };
}

/** Everything worth passing on about one listing. */
export function qualityNotes(listing: SourceListing, tradingName: string): QualityNote[] {
  return [
    modelDisagreesWithAddress(listing),
    screenshotPhotos(listing),
    priceInDescription(listing),
    otherTradingName(listing, tradingName),
  ].filter((note): note is QualityNote => note !== null);
}

/** The notes grouped by kind, in the order they were found. */
export function groupByKind(notes: QualityNote[]): Map<QualityKind, QualityNote[]> {
  const grouped = new Map<QualityKind, QualityNote[]>();
  for (const note of notes) {
    grouped.set(note.kind, [...(grouped.get(note.kind) ?? []), note]);
  }
  return grouped;
}
