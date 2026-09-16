import type { CollectionConfig, Where } from "payload";

import {
  canManageDealer,
  dealerIdOf,
  fieldReadableByOwningDealer,
  isDealerStaff,
  isPlatformAdmin,
  isPlatformStaff,
} from "@/access/roles";
import { withinParent } from "@/lib/admin-filter-options";
import { ADMIN_GROUP } from "@/lib/admin-nav";
import {
  CAR_QUICK_FILTERS,
  CAR_STATUS_LIST_LABELS,
  CAR_STATUS_TONES,
} from "@/lib/admin-quick-filters";
import { dropTag } from "@/lib/revalidate";
import { generatePublicRef } from "@/lib/slug";
import { vehicleTitle } from "@/lib/vehicle-title";

/**
 * Vehicle listings.
 *
 * This is where "only verified dealerships list, never private sellers" is enforced at the
 * API. Three things do the work, in order of how much they matter:
 *
 * 1. `beforeValidate` OVERWRITES `data.dealer` with the requesting user's own dealer. It
 *    does not validate what the client sent, it discards it. That single assignment is what
 *    stops dealer A from posting stock under dealer B, and it is the line the adversarial
 *    tests aim at. Validation would be enough right up until someone adds a code path that
 *    forgets to call it.
 *
 * 2. `access.create` requires a `users` document holding a dealer or platform role, and for
 *    dealer roles it requires the dealership to be verified. A `buyers` document fails the
 *    first condition and there is no second chance, because buyers are a different
 *    collection with no role field at all.
 *
 * 3. `access.read` returns a Where clause rather than a boolean, so drafts and sold stock
 *    are filtered inside the query rather than fetched and then hidden.
 */

const SOLD_VISIBLE_DAYS = 90;

/** Admin list cells (display only). Paths are relative to src; see the import map. */
const CELL = {
  rand: "/components/admin/cells/value-cells#RandCell",
  km: "/components/admin/cells/value-cells#KmCell",
  yesNo: "/components/admin/cells/value-cells#YesNoCell",
  badge: "/components/admin/cells/value-cells#StatusBadgeCell",
} as const;

export const Vehicles: CollectionConfig = {
  slug: "vehicles",
  labels: { singular: "Car", plural: "Cars" },
  defaultSort: "-updatedAt",
  admin: {
    useAsTitle: "title",
    // The name stays the first column: Payload links it to the car and lets a picker choose from
    // it, and a custom cell there would replace both.
    defaultColumns: ["title", "listPhoto", "price", "mileageKm", "status", "dealer", "updatedAt"],
    group: ADMIN_GROUP.daily,
    listSearchableFields: ["title", "stockNumber", "publicRef"],
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
    components: {
      beforeListTable: [
        {
          path: "/components/admin/list/quick-filters#QuickFilters",
          clientProps: { filters: CAR_QUICK_FILTERS },
        },
      ],
    },
  },
  versions: {
    drafts: { autosave: { interval: 800 } },
    maxPerDoc: 50,
  },
  access: {
    /**
     * The public sees live stock, plus recently sold listings, which keep their URL for
     * ninety days with a clear sold state before redirecting to the model page. A sold car
     * that 404s throws away a page that is often still ranking.
     */
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;

      const soldCutoff = new Date(
        Date.now() - SOLD_VISIBLE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      const publiclyVisible: Where = {
        or: [
          { status: { equals: "live" } },
          {
            and: [{ status: { equals: "sold" } }, { soldAt: { greater_than: soldCutoff } }],
          },
        ],
      };

      const own = dealerIdOf(req.user);
      if (own) {
        const scoped: Where = { or: [publiclyVisible, { dealer: { equals: own } }] };
        return scoped;
      }
      return publiclyVisible;
    },

    create: ({ req }) => {
      const user = req.user;
      if (isPlatformStaff(user)) return true;
      if (!isDealerStaff(user)) return false;

      // A dealer role with no dealership, or an unverified one, cannot publish. The
      // verification state is re-read in beforeChange too, because a dealership can be
      // suspended between a session starting and a listing being saved.
      return Boolean(dealerIdOf(user));
    },

    update: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      if (!isDealerStaff(req.user)) return false;
      const own = dealerIdOf(req.user);
      return own ? { dealer: { equals: own } } : false;
    },

    delete: ({ req }) => {
      if (isPlatformAdmin(req.user)) return true;
      if (!canManageDealer(req.user)) return false;
      const own = dealerIdOf(req.user);
      return own ? { dealer: { equals: own } } : false;
    },
  },

  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data;

        // THE line. Not a check on what the client sent, a replacement of it.
        if (isDealerStaff(req.user)) {
          data.dealer = dealerIdOf(req.user);
        }

        if (operation === "create" && !data.publicRef) {
          data.publicRef = generatePublicRef();
        }

        return data;
      },
    ],

    beforeChange: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data;

        // An unverified or suspended dealership cannot have live stock, however the write
        // arrived. Checked here rather than only in access.create so that a dealership
        // suspended mid-session cannot publish on its way out.
        if (data.status === "live") {
          const dealerId = data.dealer ?? originalDoc?.dealer;
          if (dealerId) {
            const dealer = await req.payload.findByID({
              collection: "dealers",
              id: typeof dealerId === "object" ? dealerId.id : dealerId,
              depth: 0,
              req,
            });
            if (dealer?.verificationStatus !== "verified") {
              throw new Error(
                "This dealership is not verified, so its stock cannot go live. Contact Rynet to complete verification.",
              );
            }
          }
        }

        // Stamp the lifecycle dates from the status rather than trusting the client.
        if (data.status === "live" && !data.publishedAt)
          data.publishedAt = new Date().toISOString();
        if (data.status === "sold" && !data.soldAt) data.soldAt = new Date().toISOString();

        // Keep the price history honest: append on every change, never rewrite.
        const previous = originalDoc?.price;
        if (
          typeof previous === "number" &&
          typeof data.price === "number" &&
          previous !== data.price
        ) {
          data.previousPrice = previous;
          data.priceHistory = [
            ...(originalDoc?.priceHistory ?? []),
            { price: data.price, changedAt: new Date().toISOString() },
          ];
        }

        return data;
      },
    ],

    /*
     * Stock is cached, so a write has to say so.
     *
     * The home page reads its featured row and its counts through a sixty second cache. That
     * is the right window for load and the wrong one for a dealership that has just marked a
     * car sold and is looking at it still for sale on the front page. Both hooks fire on the
     * status change as well as on the price, because either one changes what the public sees.
     */
    afterChange: [() => dropTag("vehicles")],
    afterDelete: [() => dropTag("vehicles")],
  },

  fields: [
    {
      name: "title",
      type: "text",
      label: "Name",
      // Built from the year, make, model and variant. Not edited by hand. Hidden in the form,
      // because the header already shows it; it stays the list's first column and its search.
      admin: {
        readOnly: true,
        hidden: true,
        disableListFilter: true,
      },
      hooks: {
        /*
         * The document stores make, model and variant as relationship ids, so the names are read
         * from the three lists. This used to read `makeName`, `modelName` and `variantName`, which
         * are not fields on a car, so every stored title was the year alone. The migration
         * 20260916_120000_vehicle_titles recomputed the titles already stored.
         *
         * Taxonomies are readable by everyone, so looking the names up widens nothing.
         * Renaming a make, model or variant does not refresh the titles of cars already using it.
         */
        beforeChange: [
          async ({ data, originalDoc, req }) => {
            const current = (key: string): unknown =>
              data?.[key] !== undefined ? data[key] : originalDoc?.[key];

            const nameOf = async (
              collection: "makes" | "models" | "variants",
              raw: unknown,
            ): Promise<string | null> => {
              let id = raw;
              if (id && typeof id === "object") {
                const name = (id as { name?: unknown }).name;
                if (typeof name === "string") return name;
                id = (id as { id?: unknown }).id;
              }
              if (typeof id !== "number" && typeof id !== "string") return null;
              if (id === "") return null;
              const doc = await req.payload.findByID({
                collection,
                id,
                depth: 0,
                select: { name: true },
                disableErrors: true,
                overrideAccess: true,
                req,
              });
              return typeof doc?.name === "string" ? doc.name : null;
            };

            const [make, model, variant] = await Promise.all([
              nameOf("makes", current("make")),
              nameOf("models", current("model")),
              nameOf("variants", current("variant")),
            ]);
            return vehicleTitle({
              modelYear: current("modelYear") as number | string | null | undefined,
              make,
              model,
              variant,
            });
          },
        ],
      },
    },

    {
      // The first photo, small, as a list column. A `ui` field stores nothing and draws nothing
      // in the form; it exists only to give the list a Photo column.
      name: "listPhoto",
      type: "ui",
      label: "Photo",
      admin: {
        components: { Cell: "/components/admin/cells/vehicle-photo-cell#VehiclePhotoCell" },
      },
    },

    /*
     * The main column: four tabs in the order a person fills a listing in. The tabs have no
     * `name`, and rows and collapsibles never do, so none of this changes a column or an API
     * field. Only top-level fields can sit in the sidebar, which is why the sidebar fields
     * follow the tabs rather than living inside them.
     */
    {
      type: "tabs",
      tabs: [
        {
          label: "The car",
          fields: [
            {
              name: "condition",
              type: "select",
              required: true,
              defaultValue: "pre_owned",
              index: true,
              label: "New or used",
              options: [
                { value: "new", label: "New" },
                { value: "demo", label: "Demo" },
                { value: "pre_owned", label: "Used" },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "make",
                  type: "relationship",
                  relationTo: "makes",
                  required: true,
                  index: true,
                  label: "Make",
                },
                {
                  name: "model",
                  type: "relationship",
                  relationTo: "models",
                  required: true,
                  index: true,
                  label: "Model",
                  filterOptions: ({ data }) => withinParent("make", data?.make, data?.model),
                },
                {
                  name: "variant",
                  type: "relationship",
                  relationTo: "variants",
                  index: true,
                  label: "Variant",
                  // Five seeded cars point at a variant of another model, because variant web
                  // address names are unique across all models. The current value stays pickable
                  // so those cars still save.
                  filterOptions: ({ data }) => withinParent("model", data?.model, data?.variant),
                },
              ],
            },
            {
              name: "derivative",
              type: "text",
              label: "Extra trim details",
              admin: {
                disableListColumn: true,
                disableListFilter: true,
                // Anything the variant list does not cover, for example a trim pack.
                description: "Only if the variant does not cover it, for example a trim pack.",
              },
            },
            {
              type: "row",
              fields: [
                {
                  name: "modelYear",
                  type: "number",
                  required: true,
                  index: true,
                  label: "Model year",
                },
                { name: "registrationYear", type: "number", label: "First registered (year)" },
                {
                  name: "mileageKm",
                  type: "number",
                  required: true,
                  index: true,
                  label: "Mileage (km)",
                  admin: { components: { Cell: CELL.km } },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "bodyType",
                  type: "relationship",
                  relationTo: "body-types",
                  index: true,
                  label: "Body shape",
                },
                {
                  name: "fuelType",
                  type: "relationship",
                  relationTo: "fuel-types",
                  index: true,
                  label: "Fuel",
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "transmission",
                  type: "relationship",
                  relationTo: "transmissions",
                  index: true,
                  label: "Gearbox",
                },
                {
                  name: "drivetrain",
                  type: "relationship",
                  relationTo: "drivetrains",
                  index: true,
                  label: "Drive",
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "exteriorColour",
                  type: "relationship",
                  relationTo: "colours",
                  index: true,
                  label: "Colour",
                },
                {
                  name: "interiorColour",
                  type: "relationship",
                  relationTo: "colours",
                  label: "Interior colour",
                  admin: { disableListColumn: true, disableListFilter: true },
                },
              ],
            },
            {
              name: "features",
              type: "relationship",
              relationTo: "features",
              hasMany: true,
              label: "Features",
              admin: {
                // Structured, never free text. A free-text feature cannot be filtered, compared
                // or counted.
                description: "Pick from the list so buyers can filter by them.",
              },
            },
            {
              name: "description",
              type: "richText",
              label: "Description",
              admin: {
                disableListColumn: true,
                disableListFilter: true,
                description: "Shown on the listing page.",
              },
            },
            {
              type: "collapsible",
              label: "Technical details",
              admin: { initCollapsed: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "engineCapacityCc",
                      type: "number",
                      label: "Engine size (cc)",
                      admin: { disableListColumn: true, disableListFilter: true },
                    },
                    {
                      name: "cylinders",
                      type: "number",
                      label: "Cylinders",
                      admin: { disableListColumn: true, disableListFilter: true },
                    },
                    {
                      name: "powerKw",
                      type: "number",
                      label: "Power (kW)",
                      admin: { disableListColumn: true, disableListFilter: true },
                    },
                  ],
                },
                {
                  type: "row",
                  fields: [
                    {
                      name: "torqueNm",
                      type: "number",
                      label: "Torque (Nm)",
                      admin: { disableListColumn: true, disableListFilter: true },
                    },
                    {
                      name: "doors",
                      type: "number",
                      label: "Doors",
                      admin: { disableListColumn: true, disableListFilter: true },
                    },
                    {
                      name: "seats",
                      type: "number",
                      label: "Seats",
                      admin: { disableListColumn: true, disableListFilter: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Price",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "price",
                  type: "number",
                  required: true,
                  index: true,
                  label: "Price (R)",
                  admin: {
                    description: "Whole rands, for example 249900.",
                    components: {
                      Cell: CELL.rand,
                      afterInput: ["/components/admin/fields/rand-preview#RandPreview"],
                    },
                  },
                },
                {
                  name: "priceType",
                  type: "select",
                  required: true,
                  defaultValue: "retail",
                  label: "Price type",
                  options: [
                    { value: "retail", label: "Normal price" },
                    { value: "on_the_road", label: "On the road price" },
                    { value: "poa", label: "Price on request" },
                  ],
                },
                {
                  name: "vatStatus",
                  type: "select",
                  defaultValue: "vat_inclusive",
                  label: "VAT",
                  options: [
                    { value: "vat_inclusive", label: "Includes VAT" },
                    { value: "vat_exclusive", label: "Excludes VAT" },
                    { value: "non_vat", label: "No VAT" },
                  ],
                },
              ],
            },
            {
              name: "previousPrice",
              type: "number",
              label: "Previous price (R)",
              admin: {
                readOnly: true,
                components: {
                  Cell: CELL.rand,
                  afterInput: ["/components/admin/fields/rand-preview#RandPreview"],
                },
                condition: (data) => typeof data?.previousPrice === "number",
                // Set automatically when the price changes. Drives the price-drop badge.
                description:
                  "Set automatically when you change the price. Shows a price-drop badge when higher.",
              },
            },
            {
              // Append only. Written by the beforeChange hook above, never by hand, so it is
              // hidden in the admin (UI only; the hook and the API are unchanged).
              name: "priceHistory",
              type: "array",
              admin: {
                readOnly: true,
                hidden: true,
                disableListColumn: true,
                disableListFilter: true,
              },
              fields: [
                { name: "price", type: "number" },
                { name: "changedAt", type: "date" },
              ],
            },
            {
              /*
               * Was: "Derived from the finance defaults, not entered. Recalculated for all stock
               * when the prime rate changes." NOT IMPLEMENTED: nothing writes this. The site
               * works each instalment out live from the Finance calculator settings
               * (src/components/listing/finance-estimate.ts), so it is hidden in the admin.
               */
              name: "monthlyEstimate",
              type: "number",
              admin: {
                readOnly: true,
                hidden: true,
                disableListColumn: true,
                disableListFilter: true,
              },
            },
          ],
        },
        {
          label: "Photos and video",
          fields: [
            {
              name: "gallery",
              type: "array",
              minRows: 0,
              label: "Photos",
              labels: { singular: "Photo", plural: "Photos" },
              admin: {
                disableListColumn: true,
                disableListFilter: true,
                // Drag to reorder, or use the move buttons. Both work, because a drag-only
                // reorder fails WCAG 2.2 SC 2.5.7.
                description:
                  "The first photo is the main one. Drag, or use Move up and Move down in the row menu.",
              },
              fields: [
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  required: true,
                  label: "Photo",
                },
                {
                  name: "alt",
                  type: "text",
                  label: "Photo description",
                  admin: {
                    // Left empty, this is generated from the vehicle's own details. Override it
                    // when the photo shows something specific.
                    description: "Leave empty to describe it automatically.",
                  },
                },
              ],
            },
            {
              name: "video",
              type: "group",
              label: "Video",
              admin: { disableListColumn: true, disableListFilter: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "url",
                      type: "text",
                      label: "Video link",
                      admin: { description: "A YouTube or Vimeo link." },
                    },
                    {
                      name: "provider",
                      type: "select",
                      label: "Video site",
                      options: [
                        { value: "youtube", label: "YouTube" },
                        { value: "vimeo", label: "Vimeo" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Paperwork",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "stockNumber",
                  type: "text",
                  index: true,
                  label: "Stock number",
                  admin: {
                    description: "The dealership's own reference.",
                  },
                },
                {
                  name: "vin",
                  type: "text",
                  label: "VIN",
                  access: {
                    /**
                     * Platform staff and the OWNING dealership. Not any dealership.
                     *
                     * This previously read `isDealerStaff`, which is true for every dealer
                     * account on the platform, and every dealership can read every live
                     * listing. So any dealership could ask for a competitor's stock and get the
                     * VINs with it, which is what you need to clone a car or put a finance
                     * application on one. The public path was closed the whole time, which is
                     * why the anonymous VIN test passed while this was open.
                     */
                    read: fieldReadableByOwningDealer("dealer"),
                  },
                  admin: {
                    disableListColumn: true,
                    disableListFilter: true,
                    // Not encrypted at rest. Protected by access control: never returned to a
                    // public query, never to another dealership, and never published in
                    // structured data.
                    description: "Never shown on the site or to other dealerships.",
                  },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "serviceHistory",
                  type: "select",
                  label: "Service history",
                  options: [
                    { value: "full_franchise", label: "Full franchise service history" },
                    { value: "full_independent", label: "Full independent service history" },
                    { value: "partial", label: "Partial service history" },
                    { value: "none", label: "No service history" },
                    { value: "unknown", label: "Not known" },
                  ],
                },
                {
                  name: "roadworthy",
                  type: "select",
                  label: "Roadworthy certificate",
                  options: [
                    { value: "current", label: "Valid roadworthy" },
                    { value: "expired", label: "Expired" },
                    { value: "not_required", label: "Not needed" },
                    { value: "unknown", label: "Not known" },
                  ],
                },
                {
                  name: "licenceExpiry",
                  type: "date",
                  label: "Licence disc expires",
                  admin: {
                    date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
                  },
                },
              ],
            },
            {
              name: "warrantyRemaining",
              type: "group",
              label: "Warranty left",
              admin: { disableListColumn: true, disableListFilter: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "months", type: "number", label: "Months" },
                    { name: "km", type: "number", label: "Kilometres" },
                    { name: "provider", type: "text", label: "Warranty company" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // The sidebar, in the order a person looks at it.
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      label: "Listing status",
      /*
       * The labels say what the public sees, because the read rule above decides it: only Live
       * cars, and Sold cars for ninety days, are visible. Reserved does not show a reserved badge
       * yet, it hides the car like the others.
       */
      options: [
        { value: "draft", label: "Draft (hidden)" },
        { value: "pending_review", label: "Waiting for Rynet to check (hidden)" },
        { value: "live", label: "Live on the site" },
        { value: "reserved", label: "Reserved (hidden)" },
        { value: "sold", label: "Sold (shown as sold for 90 days)" },
        { value: "expired", label: "Expired (hidden)" },
        { value: "archived", label: "Archived (hidden)" },
      ],
      admin: {
        position: "sidebar",
        description: "Only Live cars, and Sold cars for 90 days, can be seen on the site.",
        components: {
          Cell: {
            path: CELL.badge,
            clientProps: { tones: CAR_STATUS_TONES, labels: CAR_STATUS_LIST_LABELS },
          },
        },
      },
    },
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      required: true,
      index: true,
      label: "Dealership",
      access: {
        // Only platform staff may retarget a listing. For a dealer user the value is
        // overwritten server side regardless, so this closes the admin UI path too.
        update: ({ req }) => isPlatformStaff(req.user),
      },
      // Set automatically from the signed-in user when a dealership user saves (beforeValidate).
      // Platform staff choose it.
      admin: { position: "sidebar", description: "The dealership selling this car." },
    },
    {
      name: "branch",
      type: "relationship",
      relationTo: "branches",
      index: true,
      label: "Branch",
      filterOptions: ({ data }) => withinParent("dealer", data?.dealer, data?.branch),
      // Which branch the vehicle physically sits at.
      admin: { position: "sidebar", description: "Where the car is parked." },
    },
    {
      name: "isDemonstration",
      type: "checkbox",
      defaultValue: false,
      label: "Example listing",
      access: { update: ({ req }) => isPlatformStaff(req.user) },
      admin: {
        position: "sidebar",
        readOnly: true,
        disableBulkEdit: true,
        components: { Cell: CELL.yesNo },
        // Seeded example stock. Labelled as such wherever it appears publicly.
        description:
          "Made-up stock for showing the site. Labelled as an example wherever it appears.",
      },
    },
    {
      type: "collapsible",
      label: "Record details",
      admin: { position: "sidebar", initCollapsed: true },
      fields: [
        {
          name: "publicRef",
          type: "text",
          unique: true,
          index: true,
          label: "Listing reference",
          admin: {
            readOnly: true,
            // The stable id in the URL. Not the database id, which would leak stock volume, and
            // not the stock number, which dealers change.
            description: "Part of the web address. Set automatically.",
          },
        },
        {
          name: "publishedAt",
          type: "date",
          index: true,
          label: "First went live",
          admin: { readOnly: true },
        },
        {
          name: "soldAt",
          type: "date",
          index: true,
          label: "Marked sold on",
          admin: { readOnly: true },
        },
      ],
    },
    {
      /*
       * Was: "Buffered in memory and flushed by cron. Never written on a page view: on SQLite that
       * would be a write lock on the busiest page on the site." NOT IMPLEMENTED: there is no cron
       * and nothing writes this or leadCount yet, so both are hidden in the admin.
       */
      name: "viewCount",
      type: "number",
      defaultValue: 0,
      admin: {
        readOnly: true,
        hidden: true,
        position: "sidebar",
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      name: "leadCount",
      type: "number",
      defaultValue: 0,
      admin: {
        readOnly: true,
        hidden: true,
        position: "sidebar",
        disableListColumn: true,
        disableListFilter: true,
      },
    },
  ],
  timestamps: true,
};
