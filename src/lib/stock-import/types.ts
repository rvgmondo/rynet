/**
 * The shapes a stock import passes around.
 *
 * `SourceListing` is what a page said. `NormalisedVehicle` is what Rynet would store. Keeping the
 * two apart is what lets the reading, the mapping and the deciding each be tested on their own,
 * and it is what makes a dry run possible: every step up to the write produces one of these.
 */

/** One car as its own website describes it, before any of it has been mapped to Rynet's lists. */
export type SourceListing = {
  /** The stock list, written the way a person would say it, for example amicomotors.co.za. */
  source: string;
  /** How that stock list names this car: its own post number, or the address of the page. */
  externalId: string;
  url: string;
  slug: string;
  title: string | null;
  makeText: string | null;
  modelText: string | null;
  year: number | null;
  mileageKm: number | null;
  price: number | null;
  exteriorColourText: string | null;
  interiorColourText: string | null;
  transmissionText: string | null;
  fuelText: string | null;
  bodyText: string | null;
  driveText: string | null;
  /** Already cleaned of names, phone numbers and email addresses. See text.ts. */
  description: string;
  /** How many contact details the cleaning took out, for the run report. */
  removedContactDetails: number;
  features: string[];
  photoUrls: string[];
};

/** A taxonomy row, as little of it as matching needs. */
export type TaxonomyEntry = {
  id: number;
  name: string;
  slug?: string | null;
  aliases?: string[] | null;
  /** Colours carry theirs; models carry their make; variants carry their model. */
  parent?: number | null;
  family?: string | null;
};

/** Everything about a car that the import can compare with what Rynet already holds. */
export type VehicleValues = {
  make: number;
  /** Null only for a car whose page names two different models, which is held back. */
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

/** What the import would write for one car, with everything already resolved to ids. */
export type NormalisedVehicle = VehicleValues & {
  externalId: string;
  source: string;
  sourceUrl: string;
  photoUrls: string[];
};

/** Why a car cannot go live, in the words the report and the admin note both use. */
export type HoldReason =
  | "no price on the source page"
  | "no mileage on the source page"
  | "no model year on the source page"
  | "its details and its title name different models"
  | "no photograph could be saved";

/** What the importer decided to do with one car. */
export type ListingOutcome =
  | "created"
  | "updated"
  | "unchanged"
  | "expired"
  | "held back"
  | "skipped";
