import type { CollectionConfig } from "payload";

import { isPlatformAdmin, isPlatformStaff } from "@/access/roles";

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
  labels: { singular: "Buyer", plural: "Buyers" },
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
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "city", "status", "createdAt"],
    group: "People",
    description: "Consumer accounts. These can save and enquire. They can never list a vehicle.",
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
  fields: [
    { name: "name", type: "text", required: true },
    { name: "phone", type: "text" },
    { name: "province", type: "relationship", relationTo: "provinces" },
    { name: "city", type: "relationship", relationTo: "cities" },
    {
      name: "alertFrequency",
      type: "select",
      required: true,
      defaultValue: "daily",
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
      admin: {
        description:
          "Opt in only, never pre-ticked. The evidence lives in consent-records with a timestamp and the policy version.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "suspended", label: "Suspended" },
        { value: "deletion_requested", label: "Deletion requested" },
      ],
    },
    {
      name: "deletionRequestedAt",
      type: "date",
      admin: {
        readOnly: true,
        position: "sidebar",
        description:
          "POPIA section 24. The purge job acts on this, and the deletion actually removes the data.",
      },
    },
  ],
  timestamps: true,
};
