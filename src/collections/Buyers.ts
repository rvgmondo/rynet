import type { CollectionConfig } from "payload";

import { endSessionsWhenSuspended, refuseSuspendedAccount } from "@/access/account-status";
import { isPlatformAdmin, isPlatformStaff } from "@/access/roles";
import { withinParent } from "@/lib/admin-filter-options";
import { ADMIN_GROUP } from "@/lib/admin-nav";
import { ACCOUNT_STATUS_TONES } from "@/lib/admin-quick-filters";

/**
 * Consumer accounts. Buyer only, permanently.
 *
 * This is the schema-level half of "only dealerships list". Read the field list: there is
 * no role, no dealer, no permission of any kind. A buyer cannot be promoted into a seller
 * because there is nothing here to promote. The `vehicles` collection never references this
 * collection in any create or update access function, so the write path does not exist
 * rather than merely being closed.
 *
 * The alternative, one `users` collection with a role that happens to be "buyer", is one bad
 * boolean away from letting a private individual list a car. This is not.
 *
 * If a future requirement seems to need a listing capability here, it does not. It needs a
 * dealer account.
 */
export const Buyers: CollectionConfig = {
  slug: "buyers",
  labels: { singular: "Buyer account", plural: "Buyer accounts" },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
    useAPIKey: false,
    cookies: {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "city", "status", "createdAt"],
    group: ADMIN_GROUP.people,
    // Was: "Consumer accounts. These can save and enquire. They can never list a vehicle."
    description:
      "People who signed up on the site to save cars and enquire. They can never list a car.",
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
  },
  access: {
    // A buyer reads and edits their own record. Platform staff can read for support.
    // Nobody at a dealership can read the buyer list, which is the whole customer base.
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      if (req.user?.collection === "buyers") return { id: { equals: req.user.id } };
      return false;
    },
    create: () => true,
    update: ({ req }) => {
      if (isPlatformAdmin(req.user)) return true;
      if (req.user?.collection === "buyers") return { id: { equals: req.user.id } };
      return false;
    },
    delete: ({ req }) => isPlatformAdmin(req.user),
    // Buyers never reach the Payload admin. Their account lives at /account.
    admin: ({ req }) => isPlatformStaff(req.user),
  },
  hooks: {
    // A suspended buyer is refused a new session, and loses the one they are holding. Same
    // rule and same code as a staff account: see src/access/account-status.ts.
    beforeLogin: [refuseSuspendedAccount],
    afterChange: [endSessionsWhenSuspended],
  },
  fields: [
    { name: "name", type: "text", required: true, label: "Full name" },
    { name: "phone", type: "text", label: "Phone" },
    {
      type: "row",
      fields: [
        { name: "province", type: "relationship", relationTo: "provinces", label: "Province" },
        {
          name: "city",
          type: "relationship",
          relationTo: "cities",
          label: "Town or city",
          // Only the chosen province's towns. The value already saved always stays pickable.
          filterOptions: ({ data }) => withinParent("province", data?.province, data?.city),
        },
      ],
    },
    {
      name: "alertFrequency",
      type: "select",
      required: true,
      defaultValue: "daily",
      label: "Saved search emails",
      // NOT IMPLEMENTED: no alert email is sent yet, whatever this says.
      admin: { description: "Not sent yet." },
      options: [
        { value: "instant", label: "As soon as a match appears" },
        { value: "daily", label: "Once a day" },
        { value: "weekly", label: "Once a week" },
        { value: "off", label: "No alerts" },
      ],
    },
    {
      name: "marketingConsent",
      type: "checkbox",
      defaultValue: false,
      label: "Agreed to Rynet marketing",
      admin: {
        components: { Cell: "/components/admin/cells/value-cells#YesNoCell" },
        /*
         * Opt in only, never pre-ticked. The evidence lives in consent-records with a timestamp and
         * the policy version. Read only in the admin (UI only; access is unchanged), because the
         * person gives or withdraws this themselves.
         */
        description: "Proof is kept in Consent records.",
        readOnly: true,
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      label: "Account status",
      admin: {
        isClearable: false,
        components: {
          Cell: {
            path: "/components/admin/cells/value-cells#StatusBadgeCell",
            clientProps: { tones: ACCOUNT_STATUS_TONES },
          },
        },
        // It says this because it now does it. "Asked to be deleted" is the purge job's flag
        // and does not close the account by itself.
        description: "Suspended stops this person signing in, and signs them out now.",
      },
      options: [
        { value: "active", label: "Active" },
        { value: "suspended", label: "Suspended" },
        { value: "deletion_requested", label: "Asked to be deleted" },
      ],
    },
    {
      name: "deletionRequestedAt",
      type: "date",
      label: "Asked to be deleted on",
      // POPIA section 24. The purge job acts on this, and the deletion actually removes the data.
      admin: {
        readOnly: true,
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime", displayFormat: "d MMM yyyy, HH:mm" },
      },
    },
  ],
  timestamps: true,
};
