/**
 * The rules for a mockup's link, in one place so the route, the admin panel and the tests agree.
 *
 * A link lasts MOCKUP_LINK_DAYS from when the mockup is added, and staff extend or end it from the
 * mockup's record. An ended link shows a short note, never the mockup, so a guessed or forwarded
 * link stops being a way in once the conversation is over.
 */

export const MOCKUP_LINK_DAYS = 30;

const DAY = 86_400_000;

export function isExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const at = Date.parse(expiresAt);
  return Number.isFinite(at) && at <= now.getTime();
}

/**
 * The new end date when staff extend a link: from today if it has already ended, otherwise from
 * the date it was going to end, so extending never shortens a link.
 */
export function extendedUntil(
  expiresAt: string | null | undefined,
  days: number,
  now: Date = new Date(),
): string {
  const current = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const from = Number.isFinite(current) && current > now.getTime() ? current : now.getTime();
  return new Date(from + days * DAY).toISOString();
}

/** "Works for 12 more days", "Ends today", "Ended 3 days ago", or "Never ends". */
export function expiryLabel(expiresAt: string | null | undefined, now: Date = new Date()): string {
  if (!expiresAt) return "Never ends.";
  const at = Date.parse(expiresAt);
  if (!Number.isFinite(at)) return "Never ends.";
  const days = Math.round((at - now.getTime()) / DAY);
  if (at <= now.getTime()) {
    const ago = Math.max(0, -days);
    return ago === 0 ? "Ended today." : `Ended ${ago === 1 ? "yesterday" : `${ago} days ago`}.`;
  }
  if (days <= 0) return "Ends today.";
  return `Works for ${days === 1 ? "1 more day" : `${days} more days`}.`;
}
