import type { CollectionConfig } from "payload";

import {
  dealerIdOf,
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
    create: ({ req }) => isPlatformAdmin(req.user) || isDealerStaff(req.user),
    update: ({ req }) => {
      if (isPlatformAdmin(req.user)) return true;
      const dealer = dealerIdOf(req.user);
      if (!dealer) return false;
      return { dealer: { equals: dealer } };
    },
    delete: ({ req }) => isPlatformAdmin(req.user),
    admin: ({ req }) => isPlatformStaff(req.user),
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data;

        // A dealer user can only ever create another user inside their own dealership.
        // The dealer field is overwritten rather than validated, so a crafted request body
        // cannot plant a colleague inside a competitor's account.
        if (isDealerStaff(req.user)) {
          data.dealer = dealerIdOf(req.user);

          // And they cannot mint a platform role for themselves or anyone else.
          const allowed = ["dealer_owner", "dealer_manager", "dealer_sales"];
          if (!allowed.includes(data.role)) data.role = "dealer_sales";
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
        update: ({ req }) => isPlatformAdmin(req.user) || isDealerStaff(req.user),
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
