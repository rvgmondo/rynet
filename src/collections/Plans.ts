import type { CollectionConfig } from "payload";

import { platformStaffOnly } from "@/access/roles";

/**
 * Dealer subscription plans.
 *
 * The prices seeded with this collection are PLACEHOLDERS and are listed in
 * docs/CONTENT-NEEDED.md. They are structured to be right, not costed to be right, and no
 * pricing page renders them publicly until real numbers replace them.
 */
export const Plans: CollectionConfig = {
  slug: "plans",
  labels: { singular: "Plan", plural: "Plans" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "monthlyPrice", "listingLimit", "isPublic", "sortOrder"],
    group: "Commercial",
  },
  access: {
    read: () => true,
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: platformStaffOnly,
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    {
      name: "monthlyPrice",
      type: "number",
      required: true,
      admin: {
        description:
          "Rand per month, excluding VAT. PLACEHOLDER until real pricing is supplied. See docs/CONTENT-NEEDED.md.",
      },
    },
    { name: "listingLimit", type: "number", required: true, defaultValue: 25 },
    { name: "branchLimit", type: "number", required: true, defaultValue: 1 },
    { name: "userLimit", type: "number", required: true, defaultValue: 3 },
    {
      name: "allowsMicrositeTheming",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Lets the dealership set their own accent colour and hero layout." },
    },
    {
      name: "allowsFeedImport",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Scheduled stock feed syndication rather than manual capture only." },
    },
    { name: "summary", type: "textarea" },
    {
      name: "includedFeatures",
      type: "array",
      fields: [{ name: "label", type: "text", required: true }],
    },
    {
      name: "isPublic",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "Shown on the public pricing page. Leave off while the price is a placeholder.",
      },
    },
    { name: "sortOrder", type: "number", defaultValue: 0, admin: { position: "sidebar" } },
  ],
  timestamps: true,
};
