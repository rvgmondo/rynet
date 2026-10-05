/**
 * Reading a dealership's own stock list into Rynet.
 *
 * The parts, in the order they run: `fetch` asks politely, `amico` reads one page, `text` cleans
 * what it said, `taxonomy` maps it onto Rynet's lists, `decide` works out what should happen,
 * `photos` makes the two files the site serves, and `run` is the only part that writes anything.
 * Everything except `run`, `photos` and `amico-dealer` is pure, which is why it can be tested
 * without a database and why a dry run tells the truth.
 */

export { AMICO_ORIGIN, AMICO_SITEMAP, AMICO_SOURCE, parseAmicoListing } from "./amico";
export { AMICO_PUBLISHED, AMICO_SLUG, ensureAmicoDealership } from "./amico-dealer";
export {
  changesBetween,
  expiredStatusFor,
  expirySafety,
  hasRequiredValues,
  holdNote,
  holdReasons,
  statusFor,
} from "./decide";
export { createPoliteFetcher, DEFAULT_USER_AGENT } from "./fetch";
export { MAX_PHOTOS_PER_CAR, photoAlt, photoFilename, renderPhoto } from "./photos";
export { formatReport } from "./report";
export { type ImportReport, importAmicoStock, type RunOptions } from "./run";
export { chooseModel, designatedModel, pickModel } from "./taxonomy";
export {
  cleanDescription,
  colourFamilyOf,
  lexicalParagraphs,
  tidyColourName,
  wholeRands,
} from "./text";
export type { HoldReason, ListingOutcome, NormalisedVehicle, SourceListing } from "./types";
