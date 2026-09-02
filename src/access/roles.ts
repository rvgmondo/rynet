/**
 * Roles and the predicates built on them.
 *
 * Two things about this file are load-bearing and should not be "simplified" later.
 *
 * 1. There is no buyer role. Consumers live in a separate auth collection (`buyers`) that
 *    has no role field and no dealer field at all. A private individual therefore cannot be
 *    escalated into a seller, because there is no field to escalate. That is the schema-level
 *    half of "only dealerships list", and it is stronger than any check written here.
 *
 * 2. The dealer predicates return a Payload `Where` clause rather than a boolean wherever a
 *    query is involved. Payload folds that into the SQL, so the filtering is genuinely
 *    row-level rather than a post-hoc filter over rows we already fetched.
 */

import type { Access, FieldAccess } from "payload";

export const ROLES = [
  "platform_admin",
  "platform_editor",
  "agency_account_manager",
  "dealer_owner",
  "dealer_manager",
  "dealer_sales",
  "analyst",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform admin",
  platform_editor: "Platform editor",
  agency_account_manager: "Agency account manager",
  dealer_owner: "Dealer principal",
  dealer_manager: "Dealer manager",
  dealer_sales: "Sales agent",
  analyst: "Analyst (read only)",
};

const DEALER_ROLES: readonly Role[] = ["dealer_owner", "dealer_manager", "dealer_sales"];
const PLATFORM_ROLES: readonly Role[] = [
  "platform_admin",
  "platform_editor",
  "agency_account_manager",
];

/**
 * The shape we care about on a request user. Deliberately structural rather than importing
 * the generated `User` type, because this file is imported by the collections that generate
 * it and the circularity is not worth the marginal type safety.
 */
export type RequestUser = {
  id: number | string;
  collection?: string;
  role?: Role | null;
  dealer?: number | string | { id: number | string } | null;
};

/** True only for a `users` document. A `buyers` document can never satisfy this. */
export function isStaffUser(user: unknown): user is RequestUser {
  if (!user || typeof user !== "object") return false;
  const u = user as RequestUser;
  return u.collection === "users" && typeof u.role === "string";
}

export function hasRole(user: unknown, ...roles: readonly Role[]): boolean {
  return isStaffUser(user) && roles.includes(user.role as Role);
}

export const isPlatformAdmin = (user: unknown): boolean => hasRole(user, "platform_admin");
export const isPlatformStaff = (user: unknown): boolean => hasRole(user, ...PLATFORM_ROLES);
export const isDealerStaff = (user: unknown): boolean => hasRole(user, ...DEALER_ROLES);

/** Dealer owners and managers can write. Sales agents work leads, not stock settings. */
export const canManageDealer = (user: unknown): boolean =>
  hasRole(user, "dealer_owner", "dealer_manager");

/**
 * Seniority inside one dealership.
 *
 * Scoping every query to the right dealership is only half of the isolation problem. The
 * other half is inside the dealership, and it was missing: any dealer role could write the
 * role field on any colleague, so a sales agent could promote itself to principal and demote
 * the actual principal on the way past. That never crossed a dealership boundary, which is
 * why the scoping tests did not see it, and it still hands a junior account the right to
 * delete stock and lock out the owner.
 *
 * The rule is a rank ladder: you may grant a role no higher than your own, and you may not
 * touch anyone standing above you.
 */
export const DEALER_ROLE_RANK: Readonly<Record<string, number>> = {
  dealer_sales: 1,
  dealer_manager: 2,
  dealer_owner: 3,
};

/** 0 for anyone who is not dealer staff, which makes every comparison below fail closed. */
export function dealerRankOf(user: unknown): number {
  if (!isStaffUser(user)) return 0;
  return DEALER_ROLE_RANK[user.role as string] ?? 0;
}

/**
 * May this actor put a colleague into this role?
 *
 * Platform roles are never grantable from inside a dealership, and neither is a rank above
 * the actor's own. A principal can appoint another principal; a manager cannot.
 */
export function canGrantDealerRole(actor: unknown, role: unknown): boolean {
  // Handing out roles is a management act in the first place. A sales agent is at rank 1
  // and so would otherwise pass the comparison below for another rank 1 role, which is
  // still an unauthorised write to a colleague's record.
  if (!canManageDealer(actor)) return false;

  const target = DEALER_ROLE_RANK[role as string];
  if (!target) return false;
  return target <= dealerRankOf(actor);
}

/** Normalises the dealer relationship, which Payload hands back as an id or a document. */
export function dealerIdOf(user: unknown): number | string | null {
  if (!isStaffUser(user)) return null;
  const d = user.dealer;
  if (d === null || d === undefined) return null;
  if (typeof d === "object") return d.id;
  return d;
}

// ------------------------------------------------------------- access helpers

export const allowAnyone: Access = () => true;

export const platformAdminOnly: Access = ({ req }) => isPlatformAdmin(req.user);

export const platformStaffOnly: Access = ({ req }) => isPlatformStaff(req.user);

export const authenticatedStaffOnly: Access = ({ req }) => isStaffUser(req.user);

export const platformAdminFieldOnly: FieldAccess = ({ req }) => isPlatformAdmin(req.user);

/**
 * Read scoping for anything owned by a dealer.
 *
 * Platform staff see everything. Dealer staff see only their own dealer's rows, expressed
 * as a Where clause so the constraint lives in the query. Everyone else sees nothing.
 *
 * `dealerField` is the path to the dealer relationship on the collection being scoped, so
 * this works both for `dealers` itself (where the path is `id`) and for everything that
 * points at it.
 */
export function scopedToOwnDealer(dealerField = "dealer"): Access {
  return ({ req }) => {
    if (isPlatformStaff(req.user)) return true;
    const dealer = dealerIdOf(req.user);
    if (!dealer) return false;
    return { [dealerField]: { equals: dealer } };
  };
}

/** Write scoping. Sales agents are excluded; they work leads, not stock configuration. */
export function writableByOwnDealer(dealerField = "dealer"): Access {
  return ({ req }) => {
    if (isPlatformStaff(req.user)) return true;
    if (!canManageDealer(req.user)) return false;
    const dealer = dealerIdOf(req.user);
    if (!dealer) return false;
    return { [dealerField]: { equals: dealer } };
  };
}
