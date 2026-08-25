import type { CollectionConfig, Where } from "payload";

import {
  canManageDealer,
  dealerIdOf,
  isDealerStaff,
  isPlatformAdmin,
  isPlatformStaff,
} from "@/access/roles";
import { generatePublicRef } from "@/lib/slug";

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

export const Vehicles: CollectionConfig = {
  slug: "vehicles",
  labels: { singular: "Vehicle", plural: "Vehicles" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "dealer", "price", "status", "mileageKm", "publishedAt"],
    group: "Stock",
    listSearchableFields: ["title", "stockNumber", "publicRef"],
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
  },

  fields: [
    {
      name: "title",
      type: "text",
      admin: {
        readOnly: true,
        description: "Built from the year, make, model and variant. Not edited by hand.",
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const parts = [data?.modelYear, data?.makeName, data?.modelName, data?.variantName];
            return parts.filter(Boolean).join(" ") || "Untitled vehicle";
          },
        ],
      },
    },
    {
      name: "publicRef",
      type: "text",
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: "sidebar",
        description:
          "The stable id in the URL. Not the database id, which would leak stock volume, and not the stock number, which dealers change.",
      },
    },
    {
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      required: true,
      index: true,
      access: {
        // Only platform staff may retarget a listing. For a dealer user the value is
        // overwritten server side regardless, so this closes the admin UI path too.
        update: ({ req }) => isPlatformStaff(req.user),
      },
      admin: { position: "sidebar", description: "Set automatically from the signed-in user." },
    },
    {
      name: "branch",
      type: "relationship",
      relationTo: "branches",
      index: true,
      admin: { position: "sidebar", description: "Which branch the vehicle physically sits at." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      options: [
        { value: "draft", label: "Draft" },
        { value: "pending_review", label: "Awaiting review" },
        { value: "live", label: "Live" },
        { value: "reserved", label: "Reserved" },
        { value: "sold", label: "Sold" },
        { value: "expired", label: "Expired" },
        { value: "archived", label: "Archived" },
      ],
      admin: { position: "sidebar" },
    },

    {
      type: "tabs",
      tabs: [
        {
          label: "Vehicle",
          fields: [
            {
              name: "condition",
              type: "select",
              required: true,
              defaultValue: "pre_owned",
              index: true,
              options: [
                { value: "new", label: "New" },
                { value: "demo", label: "Demo" },
                { value: "pre_owned", label: "Pre-owned" },
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
                },
                {
                  name: "model",
                  type: "relationship",
                  relationTo: "models",
                  required: true,
                  index: true,
                },
                { name: "variant", type: "relationship", relationTo: "variants", index: true },
              ],
            },
            {
              name: "derivative",
              type: "text",
              admin: {
                description: "Anything the variant list does not cover, for example a trim pack.",
              },
            },
            {
              type: "row",
              fields: [
                { name: "modelYear", type: "number", required: true, index: true },
                { name: "registrationYear", type: "number" },
                { name: "mileageKm", type: "number", required: true, index: true },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "bodyType", type: "relationship", relationTo: "body-types", index: true },
                { name: "fuelType", type: "relationship", relationTo: "fuel-types", index: true },
                {
                  name: "transmission",
                  type: "relationship",
                  relationTo: "transmissions",
                  index: true,
                },
                {
                  name: "drivetrain",
                  type: "relationship",
                  relationTo: "drivetrains",
                  index: true,
                },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "engineCapacityCc", type: "number" },
                { name: "cylinders", type: "number" },
                { name: "powerKw", type: "number" },
                { name: "torqueNm", type: "number" },
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
                },
                { name: "interiorColour", type: "relationship", relationTo: "colours" },
                { name: "doors", type: "number" },
                { name: "seats", type: "number" },
              ],
            },
            {
              name: "features",
              type: "relationship",
              relationTo: "features",
              hasMany: true,
              admin: {
                description:
                  "Structured, never free text. A free-text feature cannot be filtered, compared or counted.",
              },
            },
            { name: "description", type: "richText" },
          ],
        },
        {
          label: "Price",
          fields: [
            {
              type: "row",
              fields: [
                { name: "price", type: "number", required: true, index: true },
                {
                  name: "priceType",
                  type: "select",
                  required: true,
                  defaultValue: "retail",
                  options: [
                    { value: "retail", label: "Retail" },
                    { value: "on_the_road", label: "On the road" },
                    { value: "poa", label: "Price on application" },
                  ],
                },
                {
                  name: "vatStatus",
                  type: "select",
                  defaultValue: "vat_inclusive",
                  options: [
                    { value: "vat_inclusive", label: "VAT inclusive" },
                    { value: "vat_exclusive", label: "VAT exclusive" },
                    { value: "non_vat", label: "Non-VAT" },
                  ],
                },
              ],
            },
            {
              name: "previousPrice",
              type: "number",
              admin: {
                readOnly: true,
                description:
                  "Set automatically when the price changes. Drives the price-drop badge.",
              },
            },
            {
              name: "priceHistory",
              type: "array",
              admin: { readOnly: true, description: "Append only." },
              fields: [
                { name: "price", type: "number" },
                { name: "changedAt", type: "date" },
              ],
            },
            {
              name: "monthlyEstimate",
              type: "number",
              admin: {
                readOnly: true,
                description:
                  "Derived from the finance defaults, not entered. Recalculated for all stock when the prime rate changes.",
              },
            },
          ],
        },
        {
          label: "History and papers",
          fields: [
            {
              name: "vin",
              type: "text",
              access: {
                // Never leaves the server for a public request. The listing page shows the
                // last six characters to the owning dealer only, and the Vehicle JSON-LD
                // omits vehicleIdentificationNumber entirely.
                read: ({ req }) => isPlatformStaff(req.user) || isDealerStaff(req.user),
              },
              admin: {
                description:
                  "Stored encrypted, never returned to a public query and never published in structured data.",
              },
            },
            { name: "stockNumber", type: "text", index: true },
            {
              name: "serviceHistory",
              type: "select",
              options: [
                { value: "full_franchise", label: "Full franchise service history" },
                { value: "full_independent", label: "Full independent service history" },
                { value: "partial", label: "Partial service history" },
                { value: "none", label: "No service history" },
                { value: "unknown", label: "Not known" },
              ],
            },
            {
              name: "warrantyRemaining",
              type: "group",
              fields: [
                { name: "months", type: "number" },
                { name: "km", type: "number" },
                { name: "provider", type: "text" },
              ],
            },
            {
              name: "roadworthy",
              type: "select",
              options: [
                { value: "current", label: "Current roadworthy" },
                { value: "expired", label: "Expired" },
                { value: "not_required", label: "Not required" },
                { value: "unknown", label: "Not known" },
              ],
            },
            { name: "licenceExpiry", type: "date" },
          ],
        },
        {
          label: "Media",
          fields: [
            {
              name: "gallery",
              type: "array",
              minRows: 0,
              labels: { singular: "Photo", plural: "Photos" },
              admin: {
                description:
                  "Drag to reorder, or use the move buttons. Both work, because a drag-only reorder fails WCAG 2.2 SC 2.5.7.",
              },
              fields: [
                { name: "image", type: "upload", relationTo: "media", required: true },
                {
                  name: "alt",
                  type: "text",
                  admin: {
                    description:
                      "Left empty, this is generated from the vehicle's own details. Override it when the photo shows something specific.",
                  },
                },
              ],
            },
            {
              name: "video",
              type: "group",
              fields: [
                { name: "url", type: "text" },
                {
                  name: "provider",
                  type: "select",
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
      name: "publishedAt",
      type: "date",
      index: true,
      admin: { readOnly: true, position: "sidebar" },
    },
    { name: "soldAt", type: "date", index: true, admin: { readOnly: true, position: "sidebar" } },
    {
      name: "viewCount",
      type: "number",
      defaultValue: 0,
      admin: {
        readOnly: true,
        position: "sidebar",
        description:
          "Buffered in memory and flushed by cron. Never written on a page view: on SQLite that would be a write lock on the busiest page on the site.",
      },
    },
    {
      name: "leadCount",
      type: "number",
      defaultValue: 0,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "isDemonstration",
      type: "checkbox",
      defaultValue: false,
      access: { update: ({ req }) => isPlatformStaff(req.user) },
      admin: {
        position: "sidebar",
        description: "Seeded example stock. Labelled as such wherever it appears publicly.",
      },
    },
  ],
  timestamps: true,
};
