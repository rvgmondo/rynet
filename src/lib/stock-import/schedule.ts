import type { Payload } from "payload";

import { formatReport } from "./report";
import { type ImportReport, importAmicoStock } from "./run";

/**
 * The live site reading a dealership's stock list, by itself, for ever.
 *
 * WHY IT RUNS INSIDE THE APP
 *
 * The host is a shared cPanel account with no tsx, no build step and nobody at a terminal. Every
 * other way of getting a dealership's cars onto the live site needs a person to run something, and
 * the one thing this project has proved is that a step a person has to remember does not happen.
 * So the deployed app reads the stock list on a timer, in its own process, and writes what it did
 * to the Stock sync settings record where staff can read it.
 *
 * WHAT KEEPS IT OFF THE HOST'S BACK
 *
 * One run at a time, across every process, through the lease in that record. One request at a time
 * to the dealership's website, with a pause between, through the polite fetcher. One photograph
 * converted at a time, never two, because concurrent image work is what took this site down once.
 * A full pass is about a hundred requests and a few minutes of mostly waiting, so it runs every
 * three hours rather than every few minutes: the source is a dealership's own website, updated by
 * hand, not a feed that changes by the second.
 *
 * THE DEMONSTRATION STOCK
 *
 * The site shipped with 311 invented cars from 12 invented dealerships, and a marketplace whose
 * whole promise is "only verified dealerships" cannot show invented ones beside a real one. They
 * are put away the moment the first full import finishes with real cars live: hidden, never
 * deleted, and recorded in the settings record. Until then they stay, so the site is never empty.
 */

const GLOBAL = "stock-sync";

/** How often a full pass runs, unless RYNET_STOCK_SYNC_MINUTES says otherwise. */
export const DEFAULT_INTERVAL_MINUTES = 180;

/** A lease older than this was left by a process that died, and is ignored. */
export const STALE_LEASE_MINUTES = 60;

/** How long after boot the first run starts, so a deploy's health check is never behind it. */
const FIRST_RUN_DELAY_MS = 90_000;

export type SyncSettings = {
  enabled?: boolean | null;
  runningSince?: string | null;
  lastFinishedAt?: string | null;
  initialImportDoneAt?: string | null;
  demonstrationStockHiddenAt?: string | null;
  runs?: { finishedAt?: string | null; summary?: string | null; ok?: boolean | null }[] | null;
};

export type SyncOutcome =
  | { ran: true; report: ImportReport; summary: string; demonstrationHidden: number }
  | { ran: false; reason: string };

const minutes = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const intervalMinutes = (): number =>
  minutes(process.env.RYNET_STOCK_SYNC_MINUTES, DEFAULT_INTERVAL_MINUTES);

/** Whether a run may start now, given the settings and the clock. */
export function mayRun(
  settings: SyncSettings,
  options: { now: Date; intervalMinutes: number; force: boolean },
): { ok: true } | { ok: false; reason: string } {
  if (settings.enabled === false) return { ok: false, reason: "the stock sync is switched off" };

  const running = settings.runningSince ? Date.parse(settings.runningSince) : Number.NaN;
  if (Number.isFinite(running)) {
    const age = options.now.getTime() - running;
    if (age < STALE_LEASE_MINUTES * 60_000) {
      return { ok: false, reason: "another run is busy" };
    }
  }

  if (options.force) return { ok: true };

  const finished = settings.lastFinishedAt ? Date.parse(settings.lastFinishedAt) : Number.NaN;
  if (Number.isFinite(finished)) {
    const since = options.now.getTime() - finished;
    if (since < options.intervalMinutes * 60_000) {
      return { ok: false, reason: "the last run was recent enough" };
    }
  }

  return { ok: true };
}

/** The one sentence the admin screen shows for a finished run. */
export function summarise(report: ImportReport): string {
  const parts = [
    `${report.listingsFound} cars on the stock list`,
    `${report.created} added`,
    `${report.updated} changed`,
    `${report.unchanged} already correct`,
    `${report.expired} hidden because they left the list`,
    `${report.heldBack} held back`,
    `${report.photosSaved} photographs saved`,
  ];
  if (report.failed > 0) parts.push(`${report.failed} could not be saved`);
  if (report.unreadable > 0) parts.push(`${report.unreadable} pages could not be read`);
  return parts.join(", ");
}

/**
 * Puts the invented stock away, once a real dealership's cars are live.
 *
 * Hidden, not deleted: it is the only stock the site can be demonstrated with to the next
 * dealership, and a deleted listing takes its photographs and its history with it.
 */
export async function hideDemonstrationStock(payload: Payload): Promise<number> {
  const demo = await payload.find({
    collection: "vehicles",
    where: { and: [{ isDemonstration: { equals: true } }, { status: { not_equals: "archived" } }] },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  for (const vehicle of demo.docs) {
    await payload.update({
      collection: "vehicles",
      id: vehicle.id,
      data: { status: "archived" },
      overrideAccess: true,
    });
  }

  const dealers = await payload.find({
    collection: "dealers",
    where: {
      and: [
        { isDemonstration: { equals: true } },
        { verificationStatus: { not_equals: "archived" } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  for (const dealer of dealers.docs) {
    await payload.update({
      collection: "dealers",
      id: dealer.id,
      data: { verificationStatus: "archived" },
      overrideAccess: true,
    });
  }

  return demo.docs.length;
}

/** True once every car on the source is either live or held back for a reason a person must fix. */
export function initialImportComplete(report: ImportReport): boolean {
  if (report.dryRun) return false;
  if (report.listingsFound === 0) return false;
  if (report.unreadable > 0 || report.failed > 0) return false;
  return (report.liveAfter ?? 0) > 0;
}

/**
 * One pass: take the lease, read the stock list, write what happened, release the lease.
 *
 * It never throws. A run that fails is recorded as a failed run and the lease is released, because
 * a lease left behind would stop every later run until somebody noticed.
 */
export async function runStockSync(
  payload: Payload,
  options: { force?: boolean; now?: () => Date } = {},
): Promise<SyncOutcome> {
  const now = options.now ?? (() => new Date());
  const settings = (await payload.findGlobal({
    slug: GLOBAL,
    depth: 0,
    overrideAccess: true,
  })) as SyncSettings;

  const allowed = mayRun(settings, {
    now: now(),
    intervalMinutes: intervalMinutes(),
    force: options.force === true,
  });
  if (!allowed.ok) return { ran: false, reason: allowed.reason };

  await payload.updateGlobal({
    slug: GLOBAL,
    data: { runningSince: now().toISOString() },
    overrideAccess: true,
  });

  let report: ImportReport | null = null;
  let failure: string | null = null;
  try {
    report = await importAmicoStock({ payload, dryRun: false, now });
  } catch (error) {
    failure = (error as Error).message;
    payload.logger.error({ err: error, msg: "stock sync failed" });
  }

  let demonstrationHidden = 0;
  const finishedAt = now().toISOString();
  let summary = report ? summarise(report) : `the run could not finish: ${failure}`;

  const data: Record<string, unknown> = {
    runningSince: null,
    lastFinishedAt: finishedAt,
  };

  if (report && initialImportComplete(report)) {
    data.initialImportDoneAt = settings.initialImportDoneAt ?? finishedAt;
    if (!settings.demonstrationStockHiddenAt) {
      demonstrationHidden = await hideDemonstrationStock(payload);
      if (demonstrationHidden > 0) {
        data.demonstrationStockHiddenAt = finishedAt;
        summary = `${summary}. ${demonstrationHidden} example cars and their example dealerships were put away, because a real dealership's stock is live.`;
      }
    }
  }

  // Newest first, and only the last twenty: this is a record somebody reads, not an audit trail.
  data.runs = [
    { finishedAt, summary, ok: report !== null },
    ...(settings.runs ?? []).slice(0, 19).map((run) => ({
      finishedAt: run.finishedAt ?? null,
      summary: run.summary ?? null,
      ok: run.ok ?? null,
    })),
  ];

  await payload.updateGlobal({ slug: GLOBAL, data, overrideAccess: true });

  if (!report) return { ran: false, reason: failure ?? "the run could not finish" };
  payload.logger.info(formatReport(report).slice(0, 2000));
  return { ran: true, report, summary, demonstrationHidden };
}

let timer: NodeJS.Timeout | null = null;

/**
 * Starts the timer, once per process.
 *
 * Only in production, and never during a build: `next build` loads this config to collect the
 * admin's import map, and a build that starts reading somebody's website would be a surprise.
 * RYNET_STOCK_SYNC=off turns it off on a host without touching the database.
 */
export function startStockSync(payload: Payload): void {
  if (timer) return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.RYNET_STOCK_SYNC === "off") return;

  const every = intervalMinutes();
  payload.logger.info(`Stock sync on, a full pass at most every ${every} minutes`);

  const tick = () => {
    void runStockSync(payload).then((outcome) => {
      if (outcome.ran) payload.logger.info(`Stock sync: ${outcome.summary}`);
    });
  };

  // Spread the first run out, so it is never part of a deploy's health check.
  const first = setTimeout(tick, FIRST_RUN_DELAY_MS);
  first.unref?.();

  timer = setInterval(tick, Math.max(5, Math.round(every / 6)) * 60_000);
  timer.unref?.();
}
