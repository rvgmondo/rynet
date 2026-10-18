/**
 * When an automatic post goes out.
 *
 * A dealership that switches on "post new cars automatically" and then gets twelve cars in one
 * morning does not want twelve posts in a row: their followers stop looking, and Instagram's spam
 * guard starts to. So automatic posts on one account are spaced out:
 *
 *   - at least three hours apart,
 *   - at most three a day,
 *   - between 08:00 and 18:00, South African time, when people are scrolling and the showroom is
 *     open to answer.
 *
 * A car that does not fit today waits for the next free slot. Posts a person asks for from the
 * portal ignore all of this: they asked, so it goes now.
 *
 * South Africa keeps one offset all year (UTC+2), so the arithmetic needs no time-zone library.
 */

export const AUTO_GAP_MS = 3 * 60 * 60 * 1000;
export const AUTO_PER_DAY = 3;
export const AUTO_OPENS_HOUR = 8;
export const AUTO_CLOSES_HOUR = 18;

const SAST_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight SAST of the day `time` falls on, as a UTC timestamp. */
const dayStart = (time: number): number => Math.floor((time + SAST_MS) / DAY_MS) * DAY_MS - SAST_MS;
const hourOf = (time: number): number => Math.floor(((time + SAST_MS) % DAY_MS) / 3_600_000);
const opening = (day: number): number => day + AUTO_OPENS_HOUR * 3_600_000;

/** The first moment at or after `now` that an automatic post may take, given the ones booked. */
export function nextAutoSlot(booked: Date[], now: Date): Date {
  const taken = booked.map((date) => date.getTime()).sort((a, b) => a - b);
  let candidate = now.getTime();

  for (let guard = 0; guard < 200; guard += 1) {
    const day = dayStart(candidate);
    if (hourOf(candidate) < AUTO_OPENS_HOUR) {
      candidate = opening(day);
      continue;
    }
    if (hourOf(candidate) >= AUTO_CLOSES_HOUR) {
      candidate = opening(day + DAY_MS);
      continue;
    }
    if (taken.filter((time) => dayStart(time) === day).length >= AUTO_PER_DAY) {
      candidate = opening(day + DAY_MS);
      continue;
    }
    const clash = taken.find((time) => Math.abs(time - candidate) < AUTO_GAP_MS);
    if (clash !== undefined) {
      candidate = clash + AUTO_GAP_MS;
      continue;
    }
    return new Date(candidate);
  }
  // Unreachable with sane input. A week out rather than an infinite loop if it ever is.
  return new Date(now.getTime() + 7 * DAY_MS);
}

/** How long to wait before trying a failed post again: 5, 15, then 60 minutes. */
export function retryDelayMs(attempts: number): number | null {
  const delays = [5, 15, 60];
  const minutes = delays[attempts - 1];
  return minutes === undefined ? null : minutes * 60_000;
}
