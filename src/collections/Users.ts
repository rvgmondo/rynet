import type { CollectionConfig, Where } from "payload";

import {
  canGrantDealerRole,
  canManageDealer,
  DEALER_ROLE_RANK,
  dealerIdOf,
  dealerRankOf,
  hasRole,
  isDealerStaff,
  isPlatformAdmin,
  isPlatformStaff,
  isStaffUser,
  ROLE_LABELS,
  ROLES,
} from "@/access/roles";

/**
 * Staff and dealer staff.
 *
 * This collection can list vehicles. `buyers` cannot, and the separation is the point:
 * a consumer account is a different collection entirely, with no role field and no dealer
 * field, so there is no path by which a private individual becomes a seller.
 *
 * Two-factor is mandatory for platform admins and dealer principals. It is enforced at
 * sign-in rather than offered as a setting, because an optional control on the account that
 * can approve dealers and change prices is not a control.
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Team member", plural: "Team members" },
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
    useAPIKey: false,
    cookies: {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role", "dealer", "status"],
    group: "People",
  },
  access: {
    // Platform staff see everyone. Dealer staff see only their own dealership's team.
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      const dealer = dealerIdOf(req.user);
      if (!dealer) return false;
      return { dealer: { equals: dealer } };
    },
    // Inviting a colleague is a management act. A sales agent working leads has no reason
    // to be able to mint an account, and every reason not to.
    create: ({ req }) => isPlatformAdmin(req.user) || canManageDealer(req.user),

    /**
     * Who a dealer user may edit, expressed as a rank ladder rather than "anyone in my
     * dealership".
     *
     * The looser version let a sales agent edit the principal's record, and changing
     * somebody's email address is an account takeover with a password reset on the end of
     * it. So: a principal edits the whole team, a manager edits sales agents and themselves,
     * a sales agent edits only themselves.
     */
    update: ({ req }) => {
      if (isPlatformAdmin(req.user)) return true;

      const dealer = dealerIdOf(req.user);
      if (!dealer) return false;

      const self = req.user?.id;
      const wholeTeam: Where = { dealer: { equals: dealer } };

      if (isPlatformStaff(req.user)) return wholeTeam;
      if (hasRole(req.user, "dealer_owner")) return wholeTeam;

      if (hasRole(req.user, "dealer_manager")) {
        const teamBelow: Where = {
          and: [
            wholeTeam,
            { or: [{ id: { equals: self } }, { role: { equals: "dealer_sales" } }] },
          ],
        };
        return teamBelow;
      }

      const selfOnly: Where = { id: { equals: self } };
      return selfOnly;
    },
    delete: ({ req }) => isPlatformAdmin(req.user),
    admin: ({ req }) => isPlatformStaff(req.user),
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation, originalDoc }) => {
        if (!data) return data;

        if (isDealerStaff(req.user)) {
          // A dealer user can only ever write inside their own dealership. The field is
          // overwritten rather than validated, so a crafted request body cannot plant a
          // colleague inside a competitor's account.
          data.dealer = dealerIdOf(req.user);

          const currentRole = typeof originalDoc?.role === "string" ? originalDoc.role : undefined;
          const isSelf =
            operation === "update" && String(originalDoc?.id) === String(req.user?.id ?? "");

          if (isSelf) {
            // Nobody at a dealership changes their own role, principal included. The way
            // out of a role is someone else moving you, which is the only version of this
            // that leaves a trail worth reading.
            data.role = currentRole ?? "dealer_sales";
          } else if (currentRole && dealerRankOf(req.user) < (DEALER_ROLE_RANK[currentRole] ?? 0)) {
            // Editing someone senior to you. You do not get to demote them on the way past.
            data.role = currentRole;
          } else if (!canGrantDealerRole(req.user, data.role)) {
            // Anything else out of reach, a platform role above all, lands on the floor
            // rather than being rejected: this runs on every write, and a hard error here
            // would break an unrelated field update that happened to carry a role along.
            data.role = currentRole ?? "dealer_sales";
          }
        }

        if (operation === "create" && !data.status) data.status = "invited";
        return data;
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "dealer_sales",
      options: ROLES.map((value) => ({ value, label: ROLE_LABELS[value] })),
      // Only a platform admin can hand out or change a role. Dealer staff get the
      // beforeValidate clamp above as a second line.
      access: {
        create: ({ req }) => isStaffUser(req.user),
        // The hook above clamps what a dealership may grant. This narrows who may send the
        // field at all, so a sales agent's request never reaches the clamp in the first place.
        update: ({ req }) => isPlatformAdmin(req.user) || canManageDealer(req.user),
      },
    },
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      admin: {
        description: "Required for every dealer role. Set automatically for dealer users.",
        condition: (data) => typeof data?.role === "string" && data.role.startsWith("dealer_"),
      },
      validate: (value: unknown, { data }: { data?: Record<string, unknown> }) => {
        const role = typeof data?.role === "string" ? data.role : "";
        if (role.startsWith("dealer_") && !value) {
          return "A dealer role must belong to a dealership.";
        }
        return true;
      },
    },
    {
      name: "phone",
      type: "text",
      admin: { description: "South African format, for example 012 345 6789 or +27 12 345 6789." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "invited",
      options: [
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited, not yet signed in" },
        { value: "suspended", label: "Suspended" },
      ],
    },
    {
      name: "twoFactorEnabled",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Mandatory for platform admins and dealer principals. Enforced at sign-in, not here.",
        readOnly: true,
      },
    },
    {
      name: "lastLoginAt",
      type: "date",
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
};
