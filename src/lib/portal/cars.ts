/**
 * What a dealership can do to one of its cars from the portal, and what the car becomes.
 *
 * Only the three moves a showroom actually makes: it sold, somebody put down a deposit, or the
 * deal fell through and it is back on sale. Putting a new car live, or one Rynet is holding back,
 * stays with Rynet, because those cars are hidden for a reason the dealership may not see (no
 * photograph, no price, a problem the import found).
 *
 * Kept apart from the action so the rules can be tested without a database.
 */

export type PortalCarAction = "sold" | "reserved" | "live";

const MOVES: Record<string, PortalCarAction[]> = {
  live: ["sold", "reserved"],
  reserved: ["live", "sold"],
  sold: ["live"],
};

export function carActions(status: string): PortalCarAction[] {
  return MOVES[status] ?? [];
}

export function nextCarState(status: string, action: PortalCarAction): PortalCarAction | null {
  return carActions(status).includes(action) ? action : null;
}

export const CAR_ACTION_LABELS: Record<PortalCarAction, string> = {
  sold: "Mark sold",
  reserved: "Reserved",
  live: "Back on sale",
};

export const CAR_STATE_LABELS: Record<string, string> = {
  live: "Live",
  reserved: "Reserved",
  sold: "Sold",
  draft: "Not live yet",
  pending_review: "Rynet is checking it",
  expired: "Gone from your website",
  archived: "Archived",
};

/** Which group a car is shown under on the cars page. */
export type CarTab = "live" | "reserved" | "sold" | "hidden";

export function tabOf(status: string): CarTab {
  if (status === "live" || status === "reserved" || status === "sold") return status;
  return "hidden";
}
