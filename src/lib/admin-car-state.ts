import type { BadgeTone } from "./admin-list";

/**
 * Whether a car can be seen on the site, in words, for the admin.
 *
 * Mirrors the read rule in src/collections/Vehicles.ts: the public sees live cars, and sold cars
 * for 90 days after they were marked sold. Every other status hides the car. The rule is enforced
 * there for every API read; the public car page reads through the Local API, which skips access
 * rules, so it asks this function too (see src/app/(marketplace)/vehicles/[make]/[model]/[slug]).
 */

export const SOLD_SHOWN_DAYS = 90;

// A draft needs no reason: "Hidden from the site: Draft" said the same thing twice.
const HIDDEN_REASON: Record<string, string> = {
  pending_review: "Waiting for Rynet to check",
  reserved: "Reserved",
  expired: "Expired",
  archived: "Archived",
};

export type CarVisibility = {
  onSite: boolean;
  label: string;
  tone: BadgeTone;
};

export function carVisibility(
  status: unknown,
  soldAt: unknown,
  now: Date = new Date(),
): CarVisibility {
  if (status === "live") return { onSite: true, label: "Live on the site", tone: "success" };

  if (status === "sold") {
    const sold = typeof soldAt === "string" || soldAt instanceof Date ? new Date(soldAt) : null;
    const cutoff = now.getTime() - SOLD_SHOWN_DAYS * 24 * 60 * 60 * 1000;
    if (sold && !Number.isNaN(sold.getTime()) && sold.getTime() > cutoff) {
      return { onSite: true, label: "Sold, still shown as sold", tone: "info" };
    }
    return { onSite: false, label: "Sold, no longer shown", tone: "neutral" };
  }

  const reason = typeof status === "string" ? HIDDEN_REASON[status] : undefined;
  const tone: BadgeTone =
    status === "pending_review" || status === "reserved" ? "warning" : "neutral";
  return {
    onSite: false,
    label: reason ? `Hidden from the site: ${reason}` : "Hidden from the site",
    tone,
  };
}
