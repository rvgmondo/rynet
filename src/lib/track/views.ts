/**
 * The car view counter.
 *
 * A view arrives as a beacon from the car's page and is added to a small buffer in memory. The
 * buffer is written to the `car-views` collection at most once a minute, one row per car per day,
 * so a busy page never turns into a write per visitor on a one-file SQLite database.
 *
 * What it costs to be this cheap, stated rather than hidden: views still in the buffer when the
 * host stops the process are lost (at most a minute's worth), and with more than one worker each
 * keeps its own buffer and its own "already counted" set, so one visitor could count once per
 * worker. Both make the number smaller or very slightly larger, never wildly wrong.
 *
 * A visitor counts once per car per day. The key is the hashed visitor from the rate limiter, so
 * no address is kept.
 */

export type PendingView = { vehicle: number; dealer: number | null; day: string; views: number };

/** A minute in production. The end-to-end suite sets VIEW_FLUSH_MS=0 so a view is written at once. */
const flushAfterMs = () => {
  const set = process.env.VIEW_FLUSH_MS;
  return set && /^\d+$/.test(set) ? Number(set) : 60_000;
};

const pending = new Map<string, PendingView>();
const seen = new Set<string>();
let seenDay = "";
let firstPendingAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

/** The day a view belongs to, in South African time, as yyyy-mm-dd. */
export function viewDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(now);
}

const CRAWLER = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/i;

/** True for user agents that are machines reading the page rather than people. */
export function isCrawler(userAgent: string | null | undefined): boolean {
  return !userAgent || CRAWLER.test(userAgent);
}

/**
 * Adds one view to the buffer, unless this visitor already counted for this car today.
 * Returns whether it counted.
 */
export function addView(
  visitor: string,
  vehicle: number,
  dealer: number | null,
  now: Date = new Date(),
): boolean {
  const day = viewDay(now);
  if (day !== seenDay) {
    seen.clear();
    seenDay = day;
  }
  const once = `${visitor}:${vehicle}`;
  if (seen.has(once)) return false;
  seen.add(once);

  const key = `${vehicle}:${day}`;
  const row = pending.get(key);
  if (row) row.views += 1;
  else pending.set(key, { vehicle, dealer, day, views: 1 });
  if (!firstPendingAt) firstPendingAt = now.getTime();
  return true;
}

/** Whether the buffer has waited long enough to be written. */
export function flushDue(now: number = Date.now()): boolean {
  return firstPendingAt > 0 && now - firstPendingAt >= flushAfterMs();
}

/** Empties the buffer and returns what was in it. */
export function takePending(): PendingView[] {
  const rows = [...pending.values()];
  pending.clear();
  firstPendingAt = 0;
  return rows;
}

/** Puts rows back after a failed write, so a database hiccup loses nothing. */
export function restorePending(rows: PendingView[]): void {
  for (const row of rows) {
    const key = `${row.vehicle}:${row.day}`;
    const existing = pending.get(key);
    if (existing) existing.views += row.views;
    else pending.set(key, { ...row });
  }
  if (rows.length && !firstPendingAt) firstPendingAt = Date.now();
}

type Writer = (rows: PendingView[]) => Promise<void>;

/**
 * Writes the buffer now if it is due, and otherwise makes sure it will be written a minute
 * after the first view in it. The timer is unref'd, so it never keeps the process alive on its
 * own: a quiet site that is shut down loses at most that minute.
 */
export async function flushIfDue(write: Writer): Promise<void> {
  if (flushDue()) {
    const rows = takePending();
    try {
      await write(rows);
    } catch (error) {
      restorePending(rows);
      console.error("Car view counts could not be written:", error);
    }
    return;
  }
  if (firstPendingAt && !timer) {
    timer = setTimeout(() => {
      timer = null;
      void flushIfDue(write);
    }, flushAfterMs());
    timer.unref?.();
  }
}

/** Clears everything. Tests only. */
export function resetViews(): void {
  pending.clear();
  seen.clear();
  seenDay = "";
  firstPendingAt = 0;
  if (timer) clearTimeout(timer);
  timer = null;
}
