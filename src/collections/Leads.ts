import type { CollectionConfig } from "payload";

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
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      const own = dealerIdOf(req.user);
      return own ? { dealer: { equals: own } } : false;
    },
    // Anyone can submit an enquiry. Rate limiting, Turnstile, a honeypot and a timing check
    // sit in front of the route handler rather than here.
    create: () => true,
    update: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      if (!isDealerStaff(req.user)) return false;
      const own = dealerIdOf(req.user);
      return own ? { dealer: { equals: own } } : false;
    },
    delete: () => false,
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
