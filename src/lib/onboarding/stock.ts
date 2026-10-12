import type { Payload } from "payload";

import { probeWebsite } from "@/lib/stock-import/probe";
import { listingsReader } from "@/lib/stock-import/readers";
import { importStock } from "@/lib/stock-import/run";
import {
  primaryBranchOf,
  runStockSync,
  summarise,
  withSyncLease,
} from "@/lib/stock-import/schedule";
import { readSpreadsheet, type SpreadsheetRead } from "@/lib/stock-import/spreadsheet";

/**
 * Loading a newly onboarded dealership's cars, the two ways there are.
 *
 * Both start a job and return at once. A full stock list with photographs takes from a few
 * minutes to half an hour, one photograph at a time on purpose (see photos.ts), which is far
 * longer than a person should watch a spinner or a request should stay open. The screen asks for
 * `stockStatus` every few seconds instead, and the result is written onto the dealership.
 */

type DealerRow = { id: number; slug: string; tradingName: string };

async function dealerRow(payload: Payload, dealerId: number): Promise<DealerRow> {
  const dealer = (await payload.findByID({
    collection: "dealers",
    id: dealerId,
    depth: 0,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>;
  return {
    id: dealer.id as number,
    slug: String(dealer.slug ?? ""),
    tradingName: String(dealer.tradingName ?? ""),
  };
}

async function record(payload: Payload, dealerId: number, summary: string): Promise<void> {
  await payload.db.updateOne({
    collection: "dealers",
    id: dealerId,
    data: { stockFeed: { lastReadAt: new Date().toISOString(), lastSummary: summary } },
  });
}

/**
 * Switches the website feed on for this dealership and reads it now, in the background.
 *
 * Checks the site first and refuses anything the reader cannot read (a portal, a site that is not
 * built on the Motors theme), so the feed is never switched on for a site that will only fail.
 */
export async function readWebsiteNow(
  payload: Payload,
  dealerId: number,
  websiteUrl: string,
): Promise<{ started: boolean; message: string }> {
  const probe = await probeWebsite(websiteUrl);
  if (!probe.readable) return { started: false, message: probe.reason };

  await payload.update({
    collection: "dealers",
    id: dealerId,
    data: { stockFeed: { websiteUrl: probe.origin, readWebsite: true } },
    overrideAccess: true,
  });

  void runStockSync(payload, { force: true, onlyDealerId: dealerId })
    .then(async (outcome) => {
      if (!outcome.ran) await record(payload, dealerId, `Not read yet: ${outcome.reason}`);
    })
    .catch((error) => payload.logger.error({ err: error, msg: "website read failed" }));

  return {
    started: true,
    message: `Reading ${probe.count} cars from ${probe.source}. Cars appear as they are read, about one every fifteen seconds with their photographs.`,
  };
}

/**
 * Reads a spreadsheet now and loads its cars in the background.
 *
 * What the sheet said is returned straight away, so the person uploading it can see which
 * columns were understood and which rows were skipped before a single car is written.
 */
export async function loadSpreadsheet(
  payload: Payload,
  dealerId: number,
  csv: string,
  wholeStock: boolean,
): Promise<{ started: boolean; message: string; read: SpreadsheetRead }> {
  const dealer = await dealerRow(payload, dealerId);
  // One source per dealership for uploads, so each upload matches the cars the last one made.
  const source = `spreadsheet:${dealer.slug}`;
  const read = readSpreadsheet(csv, source);
  if (read.listings.length === 0) {
    return { started: false, message: "No cars could be read from this sheet.", read };
  }

  const branchId = await primaryBranchOf(payload, dealerId);
  if (!branchId) {
    return {
      started: false,
      message: `${dealer.tradingName} has no branch yet, so their cars have nowhere to go.`,
      read,
    };
  }

  void withSyncLease(payload, () =>
    importStock({
      payload,
      dryRun: false,
      expireMissing: wholeStock,
      reader: listingsReader(source, read.listings),
      target: {
        dealerId,
        branchId,
        tradingName: dealer.tradingName,
        photoPrefix: `${dealer.slug}-sheet`,
        photoFolder: dealer.slug,
        planned: [],
      },
    }),
  )
    .then(async (outcome) => {
      await record(
        payload,
        dealerId,
        outcome.ok
          ? `Spreadsheet: ${summarise(outcome.value)}`
          : `Spreadsheet not loaded: ${outcome.reason}. Upload it again in a few minutes.`,
      );
    })
    .catch(async (error) => {
      payload.logger.error({ err: error, msg: "spreadsheet load failed" });
      await record(
        payload,
        dealerId,
        `Spreadsheet could not be loaded: ${(error as Error).message}`,
      );
    });

  return {
    started: true,
    message: `Loading ${read.listings.length} cars. Cars with photograph links take a few seconds each.`,
    read,
  };
}

export type StockStatus = {
  live: number;
  heldBack: number;
  lastReadAt: string | null;
  lastSummary: string | null;
  busy: boolean;
};

export async function stockStatus(payload: Payload, dealerId: number): Promise<StockStatus> {
  const count = async (status: string) =>
    (
      await payload.count({
        collection: "vehicles",
        where: { and: [{ dealer: { equals: dealerId } }, { status: { equals: status } }] },
        overrideAccess: true,
      })
    ).totalDocs;

  const [live, heldBack, dealer, sync] = await Promise.all([
    count("live"),
    count("draft"),
    payload.findByID({ collection: "dealers", id: dealerId, depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: "stock-sync", depth: 0, overrideAccess: true }),
  ]);
  const feed = (
    dealer as { stockFeed?: { lastReadAt?: string | null; lastSummary?: string | null } }
  ).stockFeed;
  return {
    live,
    heldBack,
    lastReadAt: feed?.lastReadAt ?? null,
    lastSummary: feed?.lastSummary ?? null,
    busy: Boolean((sync as { runningSince?: string | null }).runningSince),
  };
}
