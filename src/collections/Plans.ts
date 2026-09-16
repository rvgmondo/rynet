import type { CollectionConfig } from "payload";

import { platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * Dealer subscription plans.
 *
 * The prices seeded with this collection are PLACEHOLDERS and are listed in
 * docs/CONTENT-NEEDED.md. They are structured to be right, not costed to be right, and no
 * pricing page renders them publicly until real numbers replace them.
 */
export const Plans: CollectionConfig = {
  slug: "plans",
  labels: { singular: "Dealer plan", plural: "Dealer plans" },
  defaultSort: "sortOrder",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "monthlyPrice", "listingLimit", "isPublic", "sortOrder"],
    group: ADMIN_GROUP.settings,
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
  },
  access: {
    read: () => true,
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: platformStaffOnly,
  },
  fields: [
    { name: "name", type: "text", required: true, label: "Plan name" },
    {
      name: "monthlyPrice",
      type: "number",
      required: true,
      label: "Price per month (R, excluding VAT)",
      admin: {
        // Rand per month, excluding VAT. PLACEHOLDER until real pricing is supplied. See
        // docs/CONTENT-NEEDED.md.
        description: "Placeholder until real pricing is agreed.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "listingLimit",
          type: "number",
          required: true,
          defaultValue: 25,
          label: "Cars allowed",
          // NOT IMPLEMENTED: nothing counts a dealership's cars against this number yet.
          admin: { description: "Not enforced yet." },
        },
        {
          name: "branchLimit",
          type: "number",
          required: true,
          defaultValue: 1,
          label: "Branches allowed",
        },
        {
          name: "userLimit",
          type: "number",
          required: true,
          defaultValue: 3,
          label: "Staff accounts allowed",
        },
      ],
    },
    {
      name: "allowsMicrositeTheming",
      type: "checkbox",
      defaultValue: false,
      label: "Can change their page design",
      // Lets the dealership set their own accent colour and hero layout. NOT IMPLEMENTED: the
      // dealership page does not read those settings yet.
      admin: { disableListFilter: true },
    },
    {
      name: "allowsFeedImport",
      type: "checkbox",
      defaultValue: false,
      label: "Can import stock automatically",
      // Scheduled stock feed syndication rather than manual capture only. NOT IMPLEMENTED: there
      // is no feed importer yet.
      admin: { disableListFilter: true },
    },
    {
      name: "summary",
      type: "textarea",
      label: "Short description",
      admin: { disableListColumn: true, disableListFilter: true },
    },
    {
      name: "includedFeatures",
      type: "array",
      label: "What is included",
      labels: { singular: "Item", plural: "Items" },
      admin: { disableListColumn: true, disableListFilter: true },
      fields: [{ name: "label", type: "text", required: true, label: "Item" }],
    },
    {
      name: "isPublic",
      type: "checkbox",
      defaultValue: false,
      label: "Show on a pricing page",
      admin: {
        position: "sidebar",
        /*
         * Was: "Shown on the public pricing page. Leave off while the price is a placeholder."
         * NOT IMPLEMENTED: there is no public pricing page for dealer plans yet.
         */
        description: "There is no public pricing page yet.",
      },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      label: "Position",
      admin: { position: "sidebar", description: "Lower numbers come first." },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "Short code",
      admin: {
        position: "sidebar",
        disableListColumn: true,
        disableListFilter: true,
        // Required and unique, and not read anywhere outside the seed, so it sits in the sidebar
        // where it is seen rather than folded away where a missing value would be missed.
        description: "Lower case, no spaces, for example growth.",
      },
    },
  ],
  timestamps: true,
};
