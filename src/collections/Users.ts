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
  ROLES,
  type Role,
} from "@/access/roles";
import { enforceSecondFactor } from "@/access/two-factor";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * Role names as the admin shows them. Labels only: the option VALUES are what access control
 * reads, and they stay exactly as they are. Kept here rather than in ROLE_LABELS in
 * src/access/roles.ts, which is left alone, because these are written for the person handing a
 * role out in the admin.
 *
 * The analyst role is named for what it can do today: it is not platform staff and holds no
 * dealership, so it cannot open the admin or read anything yet.
 */
const ROLE_ADMIN_LABELS: Record<Role, string> = {
  platform_admin: "Rynet admin (everything)",
  platform_editor: "Rynet editor",
  agency_account_manager: "Rynet Digital account manager",
  dealer_owner: "Dealer principal",
  dealer_manager: "Dealership manager",
  dealer_sales: "Salesperson",
  analyst: "Analyst (cannot open the admin yet)",
};

/**
 * Staff and dealer staff.
 *
 * This collection can list vehicles. `buyers` cannot, and the separation is the point:
 * a consumer account is a different collection entirely, with no role field and no dealer
 * field, so there is no path by which a private individual becomes a seller.
 *
 * Two-factor is enforced in `beforeLogin`, which runs after Payload has checked the password
 * and before it signs a token, so a refusal there means no session was ever issued. See
 * src/access/two-factor.ts, including why the rollout is in two stages: forcing it before
 * anyone has enrolled locks the founder out of his own live site.
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Staff account", plural: "Staff accounts" },
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
  defaultSort: "name",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role", "dealer", "status"],
    group: ADMIN_GROUP.people,
    description: "People who can sign in: Rynet staff and dealership staff.",
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
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
    /**
     * Runs after the password has been verified and before the token is signed, so a throw
     * here refuses the session rather than revoking one that was already handed out.
     */
    beforeLogin: [enforceSecondFactor],
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
    { name: "name", type: "text", required: true, label: "Full name" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "dealer_sales",
      label: "Role",
      options: ROLES.map((value) => ({ value, label: ROLE_ADMIN_LABELS[value] })),
      // Only a platform admin can hand out or change a role. Dealer staff get the
      // beforeValidate clamp above as a second line.
      access: {
        create: ({ req }) => isStaffUser(req.user),
        // The hook above clamps what a dealership may grant. This narrows who may send the
        // field at all, so a sales agent's request never reaches the clamp in the first place.
        update: ({ req }) => isPlatformAdmin(req.user) || canManageDealer(req.user),
      },
      admin: { description: "Decides what this person can see and change." },
    },
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      label: "Dealership",
      admin: {
        // Required for every dealer role. Set automatically for dealer users (beforeValidate).
        description: "Needed for dealership roles.",
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
      label: "Mobile number",
      // South African format, for example 012 345 6789 or +27 12 345 6789.
      admin: { description: "For example 082 123 4567." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "invited",
      label: "Account status",
      /*
       * No hint here on purpose: Suspended does not block sign-in today (nothing in beforeLogin
       * or access reads this field), so the admin makes no promise that it does.
       */
      options: [
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited, not signed in yet" },
        { value: "suspended", label: "Suspended" },
      ],
    },
    /**
     * Two-factor state.
     *
     * All three are written only by src/app/actions/two-factor.ts through the local API with
     * `overrideAccess`, and closed to every request that arrives over HTTP. A field whose
     * access rule is `false` is not readable by a platform admin either, which is deliberate:
     * an admin who can read a colleague's TOTP secret can generate that colleague's codes, and
     * then the second factor proves nothing about who is at the keyboard.
     */
    {
      name: "twoFactorEnabled",
      type: "checkbox",
      defaultValue: false,
      access: {
        create: () => false,
        update: () => false,
      },
      label: "Two-factor sign-in",
      admin: {
        // Set by the enrolment flow at /account/two-factor, never by hand. Enforced at sign-in.
        description: "Each person turns this on at /account/two-factor.",
        readOnly: true,
        position: "sidebar",
      },
    },
    {
      name: "twoFactorSecret",
      type: "text",
      hidden: true,
      access: {
        read: () => false,
        create: () => false,
        update: () => false,
      },
    },
    {
      name: "twoFactorRecoveryCodes",
      type: "array",
      hidden: true,
      access: {
        read: () => false,
        create: () => false,
        update: () => false,
      },
      fields: [{ name: "hash", type: "text" }],
    },
    {
      name: "twoFactorConfirmedAt",
      type: "date",
      access: {
        create: () => false,
        update: () => false,
      },
      label: "Two-factor set up on",
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      // NOT IMPLEMENTED: nothing writes this yet, so it is hidden in the admin (UI only).
      name: "lastLoginAt",
      type: "date",
      admin: {
        readOnly: true,
        hidden: true,
        position: "sidebar",
        disableListColumn: true,
        disableListFilter: true,
      },
    },
  ],
};
