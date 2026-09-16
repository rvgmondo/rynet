import type { CollectionConfig } from "payload";

import {
  dealerIdOf,
  isDealerStaff,
  isPlatformStaff,
  scopedToOwnDealer,
  writableByOwnDealer,
} from "@/access/roles";
import { withinParent } from "@/lib/admin-filter-options";
import { ADMIN_GROUP } from "@/lib/admin-nav";
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

/** Columns and filters that mean nothing in a list: long text, rows of hours, photos. */
const notInList = { disableListColumn: true, disableListFilter: true } as const;

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
 *
 * The admin form below is laid out the way a person fills a branch in. Rows and collapsibles
 * have no `name`, so none of the layout changes a column or an API field.
 */
export const Branches: CollectionConfig = {
  slug: "branches",
  labels: { singular: "Branch", plural: "Branches" },
  defaultSort: "name",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "dealer", "city", "province", "isPrimary"],
    group: ADMIN_GROUP.details,
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
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
    { name: "name", type: "text", required: true, label: "Branch name" },

    // The sidebar.
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      required: true,
      index: true,
      label: "Dealership",
      admin: { position: "sidebar" },
    },
    {
      name: "isPrimary",
      type: "checkbox",
      defaultValue: false,
      label: "Main branch",
      admin: {
        position: "sidebar",
        description: "Head office or main showroom.",
        components: { Cell: "/components/admin/cells/value-cells#YesNoCell" },
      },
    },

    {
      label: "Address",
      type: "collapsible",
      fields: [
        { name: "addressLine1", type: "text", required: true, label: "Street address" },
        { name: "addressLine2", type: "text", label: "Address line 2", admin: notInList },
        { name: "suburb", type: "text", label: "Suburb" },
        {
          type: "row",
          fields: [
            {
              name: "city",
              type: "relationship",
              relationTo: "cities",
              required: true,
              index: true,
              label: "Town or city",
              // Only the chosen province's towns. The value already saved always stays pickable.
              filterOptions: ({ data }) => withinParent("province", data?.province, data?.city),
            },
            {
              name: "province",
              type: "relationship",
              relationTo: "provinces",
              required: true,
              index: true,
              label: "Province",
            },
            { name: "postalCode", type: "text", label: "Postal code", admin: notInList },
          ],
        },
        {
          name: "directionsNote",
          type: "textarea",
          label: "Directions",
          admin: {
            ...notInList,
            // Plain directions, written the way a person gives them.
            description: "For example: opposite the Engen on the N1 side.",
          },
        },
        {
          label: "Map pin",
          type: "collapsible",
          admin: { initCollapsed: true },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "latitude",
                  type: "number",
                  label: "Latitude",
                  admin: {
                    ...notInList,
                    /*
                     * Was: "Geocoded on save. Override only when the pin lands wrong."
                     * NOT IMPLEMENTED: there is no geocoder, so these are only ever typed in.
                     */
                    description: "Only change this if the map pin is in the wrong place.",
                  },
                },
                { name: "longitude", type: "number", label: "Longitude", admin: notInList },
              ],
            },
          ],
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
            { name: "phone", type: "text", label: "Phone" },
            { name: "whatsapp", type: "text", label: "WhatsApp" },
            { name: "email", type: "email", label: "Email" },
          ],
        },
      ],
    },
    {
      name: "tradingHours",
      type: "array",
      label: "Opening hours",
      labels: { singular: "Day", plural: "Opening hours" },
      // Shown on the branch page and marked up as openingHoursSpecification.
      admin: notInList,
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "day",
              type: "select",
              required: true,
              label: "Day",
              options: DAYS.map((d) => ({ value: d, label: d[0]?.toUpperCase() + d.slice(1) })),
            },
            { name: "opensAt", type: "text", label: "Opens", admin: { placeholder: "08:00" } },
            { name: "closesAt", type: "text", label: "Closes", admin: { placeholder: "17:00" } },
          ],
        },
        { name: "closed", type: "checkbox", defaultValue: false, label: "Closed all day" },
      ],
    },
    {
      name: "holidayOverrides",
      type: "array",
      label: "Public holiday hours",
      labels: { singular: "Holiday", plural: "Public holiday hours" },
      admin: {
        ...notInList,
        /*
         * South Africa has twelve public holidays and dealerships keep different hours on them.
         * Without these the site tells buyers a branch is open when it is shut.
         */
        description: "Add the days this branch keeps different hours.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "date",
              type: "date",
              required: true,
              label: "Date",
              admin: { date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" } },
            },
            { name: "label", type: "text", label: "Holiday name" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "opensAt", type: "text", label: "Opens" },
            { name: "closesAt", type: "text", label: "Closes" },
          ],
        },
        { name: "closed", type: "checkbox", defaultValue: true, label: "Closed" },
      ],
    },
    {
      name: "photos",
      type: "upload",
      relationTo: "media",
      hasMany: true,
      label: "Branch photos",
      admin: notInList,
    },
    {
      label: "Advanced",
      type: "collapsible",
      admin: { initCollapsed: true },
      fields: [
        {
          name: "slug",
          type: "text",
          required: true,
          index: true,
          label: "Web address name",
          admin: {
            ...notInList,
            // Filled in from the branch name when left empty.
            description: "Filled in from the branch name.",
          },
          hooks: {
            beforeValidate: [
              ({ value, data }) =>
                slugify(
                  typeof value === "string" && value.trim()
                    ? value
                    : ((data?.name as string) ?? ""),
                ),
            ],
          },
        },
      ],
    },
  ],
  timestamps: true,
};

export const branchScopedRead = scopedToOwnDealer("dealer");
