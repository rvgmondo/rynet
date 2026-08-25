import type { CollectionConfig } from "payload";

import {
  dealerIdOf,
  isDealerStaff,
  isPlatformStaff,
  scopedToOwnDealer,
  writableByOwnDealer,
} from "@/access/roles";
import { slugify } from "@/lib/slug";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * Branches.
 *
 * A separate collection rather than an array on `dealers`, for three reasons that each
 * become expensive to retrofit: a vehicle points at the branch it physically sits at, leads
 * route per branch, and each branch needs its own indexable page carrying LocalBusiness
 * structured data with its own address, hours and map.
 *
 * Latitude and longitude are plain numbers rather than a spatial type. The production
 * database is SQLite, which has no PostGIS, so radius search runs as an R-tree bounding box
 * over these two columns followed by an exact haversine over the survivors.
 */
export const Branches: CollectionConfig = {
  slug: "branches",
  labels: { singular: "Branch", plural: "Branches" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "dealer", "city", "province", "isPrimary"],
    group: "Dealers",
  },
  access: {
    read: () => true,
    create: ({ req }) => isPlatformStaff(req.user) || isDealerStaff(req.user),
    update: writableByOwnDealer("dealer"),
    delete: writableByOwnDealer("dealer"),
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) return data;
        // Same rule as vehicles: a dealer user's branch belongs to their own dealership,
        // whatever the request body claims.
        if (isDealerStaff(req.user)) data.dealer = dealerIdOf(req.user);
        return data;
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value, data }) =>
            slugify(
              typeof value === "string" && value.trim() ? value : ((data?.name as string) ?? ""),
            ),
        ],
      },
    },
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      required: true,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "isPrimary",
      type: "checkbox",
      defaultValue: false,
      admin: { position: "sidebar", description: "The head office or main showroom." },
    },
    {
      label: "Address",
      type: "collapsible",
      fields: [
        { name: "addressLine1", type: "text", required: true },
        { name: "addressLine2", type: "text" },
        { name: "suburb", type: "text" },
        {
          type: "row",
          fields: [
            {
              name: "city",
              type: "relationship",
              relationTo: "cities",
              required: true,
              index: true,
            },
            {
              name: "province",
              type: "relationship",
              relationTo: "provinces",
              required: true,
              index: true,
            },
            { name: "postalCode", type: "text" },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "latitude",
              type: "number",
              admin: { description: "Geocoded on save. Override only when the pin lands wrong." },
            },
            { name: "longitude", type: "number" },
          ],
        },
        {
          name: "directionsNote",
          type: "textarea",
          admin: {
            description: 'Plain directions, for example "opposite the Engen on the N1 side".',
          },
        },
      ],
    },
    {
      label: "Contact",
      type: "collapsible",
      fields: [
        {
          type: "row",
          fields: [
            { name: "phone", type: "text" },
            { name: "whatsapp", type: "text" },
            { name: "email", type: "email" },
          ],
        },
      ],
    },
    {
      name: "tradingHours",
      type: "array",
      labels: { singular: "Day", plural: "Trading hours" },
      admin: {
        description: "Shown on the branch page and marked up as openingHoursSpecification.",
      },
      fields: [
        {
          name: "day",
          type: "select",
          required: true,
          options: DAYS.map((d) => ({ value: d, label: d[0]?.toUpperCase() + d.slice(1) })),
        },
        { name: "closed", type: "checkbox", defaultValue: false },
        {
          type: "row",
          fields: [
            { name: "opensAt", type: "text", admin: { placeholder: "08:00" } },
            { name: "closesAt", type: "text", admin: { placeholder: "17:00" } },
          ],
        },
      ],
    },
    {
      name: "holidayOverrides",
      type: "array",
      labels: { singular: "Override", plural: "Public holiday overrides" },
      admin: {
        description:
          "South Africa has twelve public holidays and dealerships keep different hours on them. Without these the site tells buyers a branch is open when it is shut.",
      },
      fields: [
        { name: "date", type: "date", required: true },
        { name: "label", type: "text" },
        { name: "closed", type: "checkbox", defaultValue: true },
        {
          type: "row",
          fields: [
            { name: "opensAt", type: "text" },
            { name: "closesAt", type: "text" },
          ],
        },
      ],
    },
    { name: "photos", type: "upload", relationTo: "media", hasMany: true },
  ],
  timestamps: true,
};

export const branchScopedRead = scopedToOwnDealer("dealer");
