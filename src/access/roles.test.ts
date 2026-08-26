import { describe, expect, it } from "vitest";

import {
  canManageDealer,
  dealerIdOf,
  hasRole,
  isDealerStaff,
  isPlatformAdmin,
  isPlatformStaff,
  isStaffUser,
  scopedToOwnDealer,
  writableByOwnDealer,
} from "./roles";

/**
 * Access control.
 *
 * These are the predicates every collection's access functions are built on, so a mistake
 * here is not a bug in one screen, it is a hole in the whole platform. The two failures
 * worth caring about are a buyer gaining any staff capability, and a dealership seeing
 * another dealership's rows.
 *
 * The full adversarial suite, which authenticates as dealer A over HTTP and tries to read
 * and mutate dealer B, is still owed and is tracked in docs/PRODUCTION-READINESS.md. This
 * covers the layer underneath it.
 */

const staff = (role: string, dealer?: number | { id: number }) => ({
  id: 1,
  collection: "users",
  role,
  dealer,
});

const buyer = { id: 9, collection: "buyers" };

const req = (user: unknown) => ({ req: { user } }) as never;

describe("isStaffUser", () => {
  it("accepts a users document with a role", () => {
    expect(isStaffUser(staff("platform_admin"))).toBe(true);
  });

  it("rejects a buyer, which is the whole point of the separate collection", () => {
    expect(isStaffUser(buyer)).toBe(false);
  });

  it("rejects a buyer that has somehow acquired a role field", () => {
    // Defence against a future migration or a crafted session that adds one. The
    // collection is what decides, never the field.
    expect(isStaffUser({ id: 9, collection: "buyers", role: "platform_admin" })).toBe(false);
  });

  it("rejects null, undefined and primitives", () => {
    for (const value of [null, undefined, 0, "", "platform_admin", []]) {
      expect(isStaffUser(value)).toBe(false);
    }
  });

  it("rejects a document with no collection", () => {
    expect(isStaffUser({ id: 1, role: "platform_admin" })).toBe(false);
  });
});

describe("role predicates", () => {
  it("identifies platform admins", () => {
    expect(isPlatformAdmin(staff("platform_admin"))).toBe(true);
    expect(isPlatformAdmin(staff("platform_editor"))).toBe(false);
    expect(isPlatformAdmin(staff("dealer_owner"))).toBe(false);
  });

  it("counts editors and account managers as platform staff, dealers never", () => {
    expect(isPlatformStaff(staff("platform_admin"))).toBe(true);
    expect(isPlatformStaff(staff("platform_editor"))).toBe(true);
    expect(isPlatformStaff(staff("agency_account_manager"))).toBe(true);
    expect(isPlatformStaff(staff("dealer_owner"))).toBe(false);
    expect(isPlatformStaff(staff("analyst"))).toBe(false);
  });

  it("counts all three dealer roles as dealer staff, platform roles never", () => {
    expect(isDealerStaff(staff("dealer_owner"))).toBe(true);
    expect(isDealerStaff(staff("dealer_manager"))).toBe(true);
    expect(isDealerStaff(staff("dealer_sales"))).toBe(true);
    expect(isDealerStaff(staff("platform_admin"))).toBe(false);
  });

  it("lets owners and managers write, but not sales agents", () => {
    // A sales agent works leads. They do not change stock configuration or branch details.
    expect(canManageDealer(staff("dealer_owner"))).toBe(true);
    expect(canManageDealer(staff("dealer_manager"))).toBe(true);
    expect(canManageDealer(staff("dealer_sales"))).toBe(false);
  });

  it("never grants anything to a buyer", () => {
    for (const check of [isPlatformAdmin, isPlatformStaff, isDealerStaff, canManageDealer]) {
      expect(check(buyer)).toBe(false);
    }
  });

  it("rejects a role that is not in the list", () => {
    expect(hasRole(staff("superuser"), "platform_admin")).toBe(false);
  });
});

describe("dealerIdOf", () => {
  it("reads an id passed as a number", () => {
    expect(dealerIdOf(staff("dealer_owner", 42))).toBe(42);
  });

  it("reads an id out of a populated relationship", () => {
    // Payload returns either, depending on the depth the query asked for.
    expect(dealerIdOf(staff("dealer_owner", { id: 42 }))).toBe(42);
  });

  it("returns null when there is no dealership", () => {
    expect(dealerIdOf(staff("dealer_owner"))).toBeNull();
    expect(dealerIdOf(buyer)).toBeNull();
    expect(dealerIdOf(null)).toBeNull();
  });
});

describe("scopedToOwnDealer", () => {
  const access = scopedToOwnDealer("dealer");

  it("gives platform staff everything", () => {
    expect(access(req(staff("platform_admin")))).toBe(true);
  });

  it("constrains a dealer user to their own dealership, as a query clause", () => {
    // Returning a Where rather than a boolean is what makes this row-level: Payload folds
    // it into the SQL instead of filtering rows it has already fetched.
    expect(access(req(staff("dealer_manager", 7)))).toEqual({ dealer: { equals: 7 } });
  });

  it("refuses a dealer role with no dealership", () => {
    expect(access(req(staff("dealer_manager")))).toBe(false);
  });

  it("refuses a buyer and an anonymous request", () => {
    expect(access(req(buyer))).toBe(false);
    expect(access(req(null))).toBe(false);
  });

  it("scopes on whatever field name it is given", () => {
    // `dealers` itself scopes on `id`; everything pointing at it scopes on `dealer`.
    expect(scopedToOwnDealer("id")(req(staff("dealer_owner", 3)))).toEqual({ id: { equals: 3 } });
  });
});

describe("writableByOwnDealer", () => {
  const access = writableByOwnDealer("dealer");

  it("gives platform staff everything", () => {
    expect(access(req(staff("platform_editor")))).toBe(true);
  });

  it("lets an owner write within their own dealership", () => {
    expect(access(req(staff("dealer_owner", 7)))).toEqual({ dealer: { equals: 7 } });
  });

  it("refuses a sales agent, who can read but not configure", () => {
    expect(access(req(staff("dealer_sales", 7)))).toBe(false);
  });

  it("refuses a buyer", () => {
    expect(access(req(buyer))).toBe(false);
  });
});

describe("the boundary that matters most", () => {
  it("never lets one dealership's scope resolve to another's", () => {
    const access = scopedToOwnDealer("dealer");
    const dealerA = access(req(staff("dealer_owner", 1)));
    const dealerB = access(req(staff("dealer_owner", 2)));

    expect(dealerA).toEqual({ dealer: { equals: 1 } });
    expect(dealerB).toEqual({ dealer: { equals: 2 } });
    expect(dealerA).not.toEqual(dealerB);
  });

  it("cannot be satisfied by a buyer under any role value", () => {
    // Buyers are a different auth collection with no role field. This asserts that even if
    // one arrived carrying every privileged role in turn, nothing would open.
    for (const role of [
      "platform_admin",
      "platform_editor",
      "agency_account_manager",
      "dealer_owner",
      "dealer_manager",
      "dealer_sales",
      "analyst",
    ]) {
      const impostor = { id: 9, collection: "buyers", role, dealer: 1 };
      expect(isStaffUser(impostor)).toBe(false);
      expect(scopedToOwnDealer("dealer")(req(impostor))).toBe(false);
      expect(writableByOwnDealer("dealer")(req(impostor))).toBe(false);
    }
  });
});
