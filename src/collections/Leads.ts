import type { CollectionConfig, Where } from "payload";

import { dealerIdOf, isDealerStaff, isPlatformAdmin, isPlatformStaff } from "@/access/roles";

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
  labels: { singular: "Lead", plural: "Leads" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "type", "dealer", "status", "createdAt"],
    group: "Leads",
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
      name: "type",
      type: "select",
      required: true,
      index: true,
      options: [
        { value: "enquiry", label: "General enquiry" },
        { value: "test_drive", label: "Test drive request" },
        { value: "finance", label: "Finance application" },
        { value: "trade_in", label: "Trade-in valuation" },
        { value: "callback", label: "Callback request" },
        { value: "whatsapp_click", label: "WhatsApp click" },
        { value: "phone_reveal", label: "Phone number revealed" },
        { value: "dealer_contact", label: "Dealer page contact" },
        { value: "agency_enquiry", label: "Agency enquiry" },
      ],
    },
    { name: "vehicle", type: "relationship", relationTo: "vehicles", index: true },
    { name: "dealer", type: "relationship", relationTo: "dealers", index: true },
    { name: "branch", type: "relationship", relationTo: "branches" },
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "email", type: "email" },
        { name: "phone", type: "text" },
      ],
    },
    { name: "message", type: "textarea" },

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
      admin: {
        condition: (data) => data?.type === "trade_in",
        description: "The seller's vehicle. Only present on a trade-in lead.",
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "make", type: "text" },
            { name: "model", type: "text" },
            { name: "modelYear", type: "number" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "mileageKm", type: "number" },
            {
              name: "transmission",
              type: "select",
              options: [
                { value: "manual", label: "Manual" },
                { value: "automatic", label: "Automatic" },
              ],
            },
          ],
        },
        {
          name: "condition",
          type: "select",
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
          options: [
            { value: "full", label: "Full, with the book" },
            { value: "partial", label: "Partial" },
            { value: "none", label: "None" },
          ],
        },
        {
          name: "finance",
          type: "select",
          admin: {
            description:
              "Outstanding finance. A seller cannot pass title while a bank holds it, so this changes what happens next rather than only the price.",
          },
          options: [
            { value: "none", label: "Paid off" },
            { value: "outstanding", label: "Still on finance" },
            { value: "unsure", label: "Not sure" },
          ],
        },
        { name: "province", type: "relationship", relationTo: "provinces" },
        { name: "city", type: "text" },
        { name: "notes", type: "textarea" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      index: true,
      options: [
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "appointment_set", label: "Appointment set" },
        { value: "sold", label: "Sold" },
        { value: "lost", label: "Lost" },
      ],
    },
    { name: "lostReason", type: "text", admin: { condition: (d) => d?.status === "lost" } },
    { name: "assignedTo", type: "relationship", relationTo: "users" },
    {
      name: "firstResponseAt",
      type: "date",
      admin: {
        readOnly: true,
        description: "Stamped on the first outbound action. Drives the response SLA timer.",
      },
    },
    {
      name: "source",
      type: "group",
      admin: { description: "Captured at submission. Read only afterwards." },
      fields: [
        { name: "utmSource", type: "text" },
        { name: "utmMedium", type: "text" },
        { name: "utmCampaign", type: "text" },
        { name: "referrer", type: "text" },
        { name: "landingPage", type: "text" },
        { name: "deviceType", type: "text" },
      ],
    },
    {
      name: "consent",
      type: "relationship",
      relationTo: "consent-records",
      admin: {
        description:
          "POPIA lawful basis. A lead without a consent record is a lead we cannot lawfully act on.",
      },
    },
    {
      name: "notes",
      type: "array",
      fields: [
        { name: "body", type: "textarea", required: true },
        { name: "author", type: "relationship", relationTo: "users" },
        { name: "createdAt", type: "date" },
      ],
    },
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
     */
    {
      name: "disclosures",
      type: "array",
      access: {
        create: ({ req }) => isPlatformStaff(req.user),
        update: ({ req }) => isPlatformStaff(req.user),
      },
      admin: {
        condition: (data) => data?.type === "trade_in",
        description: "Every dealership this seller's details were sent to, and when.",
      },
      fields: [
        { name: "dealer", type: "relationship", relationTo: "dealers", required: true },
        { name: "disclosedAt", type: "date", required: true },
        {
          name: "withdrawnAt",
          type: "date",
          admin: {
            description:
              "Set when the seller withdraws consent. The row stays: it is the record that the disclosure happened.",
          },
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
      admin: { readOnly: true, description: "Derived from the disclosures above." },
    },
    {
      name: "isDemonstration",
      type: "checkbox",
      defaultValue: false,
      access: { update: ({ req }) => isPlatformAdmin(req.user) },
      admin: { position: "sidebar" },
    },
  ],
  timestamps: true,
};
