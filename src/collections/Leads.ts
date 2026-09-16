import type { CollectionConfig, Where } from "payload";

import { dealerIdOf, isDealerStaff, isPlatformAdmin, isPlatformStaff } from "@/access/roles";
import { withinParent } from "@/lib/admin-filter-options";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * Leads.
 *
 * The most sensitive table on the platform: a dealer reading a competitor's leads would be
 * the single worst failure this product could have. So read and update are scoped by a
 * Where clause on the dealer, and the adversarial test suite authenticates as dealer A and
 * asserts an empty result set against dealer B's leads on every one of these operations.
 *
 * Nobody can delete a lead, including a platform admin. A lead carries a consent record and
 * a POPIA retention obligation, and both need the row to still exist. Removal happens
 * through the retention purge, which is a deliberate scheduled job with an audit trail, not
 * a delete button next to a row someone finds inconvenient.
 */
export const Leads: CollectionConfig = {
  slug: "leads",
  labels: { singular: "Enquiry", plural: "Enquiries" },
  defaultSort: "-createdAt",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["createdAt", "name", "type", "dealer", "status", "phone"],
    group: ADMIN_GROUP.daily,
    listSearchableFields: ["name", "email", "phone"],
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
  },
  access: {
    /**
     * A dealership sees the leads it owns, plus the trade-ins that were disclosed to it.
     *
     * A trade-in lead has no `dealer`: it belongs to Rynet while it is offered around, and the
     * seller was told it goes to up to five dealerships. `disclosedTo` is the list of those
     * five, so it is both the access rule and, with the `disclosures` array beside it, the
     * answer to "who has my details" that POPIA section 23 entitles the seller to ask for.
     */
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      const own = dealerIdOf(req.user);
      if (!own) return false;

      // Annotated, because TypeScript widens the inferred union of the two branches into
      // something that no longer satisfies `Where`.
      const ownedOrDisclosed: Where = {
        or: [{ dealer: { equals: own } }, { disclosedTo: { in: [own] } }],
      };
      return ownedOrDisclosed;
    },
    // Anyone can submit an enquiry. Rate limiting, Turnstile, a honeypot and a timing check
    // sit in front of the route handler rather than here.
    create: () => true,
    /**
     * Deliberately NOT widened to disclosed trade-ins. Five dealerships can see one of those,
     * and letting any of them mark it "sold" or rewrite the seller's number would be five
     * businesses editing each other's view of the same record.
     */
    update: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      if (!isDealerStaff(req.user)) return false;
      const own = dealerIdOf(req.user);
      return own ? { dealer: { equals: own } } : false;
    },
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // `disclosedTo` exists only so the read rule has something it can query. Deriving it
        // here means the two can never disagree, whatever wrote the disclosures.
        if (!data) return data;
        if (Array.isArray(data.disclosures)) {
          data.disclosedTo = data.disclosures
            .map((entry: { dealer?: unknown }) =>
              typeof entry?.dealer === "object" && entry.dealer !== null
                ? (entry.dealer as { id?: unknown }).id
                : entry?.dealer,
            )
            .filter((id: unknown) => id !== null && id !== undefined);
        }
        return data;
      },
    ],
  },
  fields: [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true, label: "Name" },
        { name: "phone", type: "text", label: "Phone" },
        { name: "email", type: "email", label: "Email" },
      ],
    },
    {
      name: "message",
      type: "textarea",
      label: "Message",
      admin: { disableListColumn: true, disableListFilter: true },
    },
    {
      type: "row",
      fields: [
        {
          name: "type",
          type: "select",
          required: true,
          index: true,
          label: "Kind of enquiry",
          options: [
            { value: "enquiry", label: "Question about a car" },
            { value: "test_drive", label: "Test drive request" },
            { value: "finance", label: "Finance enquiry" },
            { value: "trade_in", label: "Wants to sell a car" },
            { value: "callback", label: "Asked for a call back" },
            { value: "whatsapp_click", label: "Tapped WhatsApp (no details left)" },
            { value: "phone_reveal", label: "Viewed the phone number (no details left)" },
            { value: "dealer_contact", label: "Contacted a dealership" },
            { value: "agency_enquiry", label: "Rynet Digital enquiry" },
          ],
        },
        {
          name: "vehicle",
          type: "relationship",
          relationTo: "vehicles",
          index: true,
          label: "Car",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "dealer",
          type: "relationship",
          relationTo: "dealers",
          index: true,
          label: "Dealership",
          admin: {
            description:
              "Empty for Rynet Digital enquiries and for sellers, who go to several dealerships.",
          },
        },
        {
          name: "branch",
          type: "relationship",
          relationTo: "branches",
          label: "Branch",
          // Only the chosen dealership's branches. The current value always stays pickable, so an
          // older enquiry saves as it is.
          filterOptions: ({ data }) => withinParent("dealer", data?.dealer, data?.branch),
        },
      ],
    },

    /**
     * The car a private individual wants to sell.
     *
     * Its own group rather than a paragraph in `message`, because these are the fields a
     * dealer actually prices against, and a dealer cannot filter a text blob for "bakkies
     * under 120 000km in Gauteng". They are the product of a trade-in lead, not a note on it.
     *
     * Make and model are free text on purpose. The taxonomy covers what dealerships stock,
     * and a seller's car may be something nobody on the platform lists. A relationship here
     * would make the form reject a real car, which is the worst possible failure for a page
     * whose whole job is to accept one.
     *
     * There is deliberately NO estimated value field. Rynet does not value cars: no licensed
     * valuation source is integrated, and printing a number we invented is exactly what the
     * brief forbids. Dealerships make the offers.
     */
    {
      name: "tradeIn",
      type: "group",
      label: "Their car",
      admin: {
        disableListColumn: true,
        disableListFilter: true,
        condition: (data) => data?.type === "trade_in",
        // The seller's vehicle. Only present on a trade-in lead.
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "make", type: "text", label: "Make" },
            { name: "model", type: "text", label: "Model" },
            { name: "modelYear", type: "number", label: "Year" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "mileageKm", type: "number", label: "Mileage (km)" },
            {
              name: "transmission",
              type: "select",
              label: "Gearbox",
              options: [
                { value: "manual", label: "Manual" },
                { value: "automatic", label: "Automatic" },
              ],
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "condition",
              type: "select",
              label: "Condition",
              options: [
                { value: "excellent", label: "Excellent, nothing needs doing" },
                { value: "good", label: "Good, a few marks" },
                { value: "fair", label: "Fair, needs some work" },
                { value: "poor", label: "Poor, or not running" },
              ],
            },
            {
              name: "serviceHistory",
              type: "select",
              label: "Service history",
              options: [
                { value: "full", label: "Full, with the book" },
                { value: "partial", label: "Partial" },
                { value: "none", label: "None" },
              ],
            },
          ],
        },
        {
          name: "finance",
          type: "select",
          label: "Still owes money on it?",
          admin: {
            // Outstanding finance. A seller cannot pass title while a bank holds it, so this
            // changes what happens next rather than only the price.
            description:
              "If a bank still owns the car, it cannot be sold until the loan is settled.",
          },
          options: [
            { value: "none", label: "Paid off" },
            { value: "outstanding", label: "Still on finance" },
            { value: "unsure", label: "Not sure" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "province", type: "relationship", relationTo: "provinces", label: "Province" },
            { name: "city", type: "text", label: "Town" },
          ],
        },
        { name: "notes", type: "textarea", label: "Seller's notes" },
      ],
    },
    {
      name: "notes",
      type: "array",
      label: "Notes",
      labels: { singular: "Note", plural: "Notes" },
      admin: { disableListColumn: true, disableListFilter: true },
      fields: [
        { name: "body", type: "textarea", required: true, label: "Note" },
        {
          type: "row",
          fields: [
            { name: "author", type: "relationship", relationTo: "users", label: "Written by" },
            { name: "createdAt", type: "date", label: "Date" },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Record keeping",
      admin: { initCollapsed: true },
      fields: [
        /**
         * Who this lead has been passed to, and when.
         *
         * Only ever populated on a trade-in, where the seller consented to their details going to
         * up to five dealerships. POPIA section 23(1)(b) gives a data subject the right to know
         * the identity of everyone who has had access to their information, and a boolean or a
         * count cannot answer that. This can.
         *
         * Append only in practice: the distribution job adds rows and nothing removes them, because
         * a disclosure that happened does not stop having happened when the relationship ends.
         *
         * Read only in the admin as well (UI only, the access rule below is what protects it).
         */
        {
          name: "disclosures",
          type: "array",
          label: "Sent to dealerships",
          labels: { singular: "Dealership", plural: "Dealerships" },
          access: {
            create: ({ req }) => isPlatformStaff(req.user),
            update: ({ req }) => isPlatformStaff(req.user),
          },
          admin: {
            condition: (data) => data?.type === "trade_in",
            readOnly: true,
            disableBulkEdit: true,
            disableListColumn: true,
            disableListFilter: true,
            // Every dealership this seller's details were sent to, and when.
            description: "Every dealership that received this seller's details.",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "dealer",
                  type: "relationship",
                  relationTo: "dealers",
                  required: true,
                  label: "Dealership",
                },
                { name: "disclosedAt", type: "date", required: true, label: "Sent on" },
                {
                  name: "withdrawnAt",
                  type: "date",
                  label: "Seller withdrew on",
                  // Set when the seller withdraws consent. The row stays: it is the record that
                  // the disclosure happened.
                },
              ],
            },
          ],
        },
        /**
         * The same dealerships, flattened, so access control can query them.
         *
         * COMPUTED, never written by hand. A Payload `Where` cannot join into an array's
         * relationship, and the read rule needs a plain `in` to work at all. Keeping this in a
         * hook rather than asking callers to maintain both is what stops the access list and the
         * disclosure record drifting apart, which is the kind of drift nobody notices until a
         * dealership can see something it should not.
         *
         * Derived from the disclosures above, so hidden in the admin (UI only).
         */
        {
          name: "disclosedTo",
          type: "relationship",
          relationTo: "dealers",
          hasMany: true,
          index: true,
          access: {
            create: ({ req }) => isPlatformStaff(req.user),
            update: ({ req }) => isPlatformStaff(req.user),
          },
          admin: {
            readOnly: true,
            hidden: true,
            disableBulkEdit: true,
            disableListColumn: true,
            disableListFilter: true,
          },
        },
        {
          name: "consent",
          type: "relationship",
          relationTo: "consent-records",
          label: "Permission record",
          admin: {
            readOnly: true,
            disableBulkEdit: true,
            disableListColumn: true,
            disableListFilter: true,
            // POPIA lawful basis. A lead without a consent record is a lead we cannot lawfully
            // act on.
            description: "The POPIA consent they gave.",
          },
        },
        {
          name: "source",
          type: "group",
          label: "Where they came from",
          // Captured at submission. Read only afterwards.
          admin: { readOnly: true, disableListColumn: true, disableListFilter: true },
          fields: [
            {
              type: "row",
              fields: [
                { name: "utmSource", type: "text", label: "Campaign source" },
                { name: "utmMedium", type: "text", label: "Campaign medium" },
                { name: "utmCampaign", type: "text", label: "Campaign name" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "referrer", type: "text", label: "Came from" },
                { name: "landingPage", type: "text", label: "First page they saw" },
                { name: "deviceType", type: "text", label: "Device" },
              ],
            },
          ],
        },
      ],
    },

    // The sidebar.
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      index: true,
      label: "Progress",
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Serious buyer" },
        { value: "appointment_set", label: "Appointment booked" },
        { value: "sold", label: "Sale made" },
        { value: "lost", label: "Lost" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "lostReason",
      type: "text",
      label: "Why it was lost",
      admin: {
        position: "sidebar",
        disableListFilter: true,
        condition: (d) => d?.status === "lost",
      },
    },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      label: "Handled by",
      admin: { position: "sidebar" },
    },
    {
      name: "firstResponseAt",
      type: "date",
      admin: {
        readOnly: true,
        hidden: true,
        position: "sidebar",
        disableListColumn: true,
        disableListFilter: true,
        // Was: "Stamped on the first outbound action. Drives the response SLA timer."
        // NOT IMPLEMENTED: nothing writes it yet.
      },
    },
    {
      name: "isDemonstration",
      type: "checkbox",
      defaultValue: false,
      label: "Example enquiry",
      access: { update: ({ req }) => isPlatformAdmin(req.user) },
      admin: { position: "sidebar", readOnly: true, disableBulkEdit: true },
    },
  ],
  timestamps: true,
};
