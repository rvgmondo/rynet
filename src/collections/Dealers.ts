import type { CollectionConfig, Where } from "payload";

import {
  canManageDealer,
  dealerIdOf,
  isPlatformAdmin,
  isPlatformStaff,
  platformStaffOnly,
} from "@/access/roles";
import { contrastRatio } from "@/lib/contrast";
import { slugify } from "@/lib/slug";

/**
 * Dealerships. The only entity on the platform that may own stock.
 *
 * `verificationStatus` is the trust proposition made into a column. Nothing publishes while
 * it is anything other than `verified`, and the decision trail is append-only, so "who
 * approved this dealership and on what evidence" is always answerable.
 */
export const Dealers: CollectionConfig = {
  slug: "dealers",
  labels: { singular: "Dealership", plural: "Dealerships" },
  admin: {
    useAsTitle: "tradingName",
    defaultColumns: ["tradingName", "verificationStatus", "group", "plan", "listingCount"],
    group: "Dealers",
  },
  access: {
    // The public directory only ever shows verified dealerships. An unverified or suspended
    // one is invisible rather than shown greyed out, because a half-listed dealership on a
    // platform whose promise is "verified only" is worse than none.
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      const own = dealerIdOf(req.user);
      if (own) {
        const clause: Where = {
          or: [{ verificationStatus: { equals: "verified" } }, { id: { equals: own } }],
        };
        return clause;
      }
      return { verificationStatus: { equals: "verified" } };
    },
    create: platformStaffOnly,
    update: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      if (!canManageDealer(req.user)) return false;
      const own = dealerIdOf(req.user);
      return own ? { id: { equals: own } } : false;
    },
    delete: ({ req }) => isPlatformAdmin(req.user),
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Identity",
          fields: [
            { name: "tradingName", type: "text", required: true, index: true },
            {
              name: "legalName",
              type: "text",
              required: true,
              admin: { description: "As registered with CIPC. May differ from the trading name." },
            },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: { description: "Their address at /dealers/[slug]." },
              hooks: {
                beforeValidate: [
                  ({ value, data }) =>
                    slugify(
                      typeof value === "string" && value.trim()
                        ? value
                        : ((data?.tradingName as string) ?? ""),
                    ),
                ],
              },
            },
            { name: "logo", type: "upload", relationTo: "media" },
            { name: "heroImages", type: "upload", relationTo: "media", hasMany: true },
            { name: "aboutRichText", type: "richText" },
            { name: "foundedYear", type: "number" },
            { name: "group", type: "relationship", relationTo: "dealer-groups" },
            {
              name: "franchises",
              type: "relationship",
              relationTo: "franchises",
              hasMany: true,
            },
            {
              name: "accreditations",
              type: "relationship",
              relationTo: "accreditations",
              hasMany: true,
              admin: {
                description:
                  "Only add an accreditation once the certificate has been seen. This is a trust claim.",
              },
            },
          ],
        },
        {
          label: "Verification",
          fields: [
            {
              name: "verificationStatus",
              type: "select",
              required: true,
              defaultValue: "pending",
              index: true,
              options: [
                { value: "pending", label: "Pending review" },
                { value: "verified", label: "Verified" },
                { value: "suspended", label: "Suspended" },
                { value: "archived", label: "Archived" },
              ],
              // Only platform staff decide this. A dealer editing their own profile must
              // never be able to approve themselves, which is why this field carries its
              // own access rule rather than relying on the collection's.
              access: {
                create: ({ req }) => isPlatformStaff(req.user),
                update: ({ req }) => isPlatformStaff(req.user),
              },
              admin: {
                description: "Nothing publishes unless this reads Verified.",
                position: "sidebar",
              },
            },
            {
              name: "registrationNumber",
              type: "text",
              admin: { description: "CIPC company registration number." },
            },
            { name: "vatNumber", type: "text" },
            {
              name: "motorTradeNumber",
              type: "text",
              admin: { description: "Motor trade number, where the dealership holds one." },
            },
            {
              name: "verificationNotes",
              type: "textarea",
              access: {
                read: ({ req }) => isPlatformStaff(req.user),
                create: ({ req }) => isPlatformStaff(req.user),
                update: ({ req }) => isPlatformStaff(req.user),
              },
              admin: { description: "Internal. Never shown to the dealership or the public." },
            },
          ],
        },
        {
          label: "Contact",
          fields: [
            {
              name: "principal",
              type: "group",
              label: "Dealer principal",
              fields: [
                { name: "name", type: "text" },
                { name: "email", type: "email" },
                { name: "phone", type: "text" },
              ],
            },
            { name: "whatsappNumber", type: "text" },
            {
              name: "emailRouting",
              type: "array",
              labels: { singular: "Routing rule", plural: "Routing rules" },
              admin: {
                description:
                  "Where each kind of lead goes. Without a rule, leads fall back to the dealer principal.",
              },
              fields: [
                {
                  name: "leadType",
                  type: "select",
                  required: true,
                  options: [
                    { value: "enquiry", label: "General enquiry" },
                    { value: "test_drive", label: "Test drive" },
                    { value: "finance", label: "Finance" },
                    { value: "trade_in", label: "Trade-in" },
                    { value: "callback", label: "Callback" },
                  ],
                },
                { name: "toAddress", type: "email", required: true },
                { name: "branch", type: "relationship", relationTo: "branches" },
              ],
            },
            {
              name: "socialProfiles",
              type: "array",
              fields: [
                {
                  name: "platform",
                  type: "select",
                  options: ["facebook", "instagram", "youtube", "tiktok", "linkedin", "x"].map(
                    (v) => ({ value: v, label: v[0]?.toUpperCase() + v.slice(1) }),
                  ),
                },
                { name: "url", type: "text" },
              ],
            },
          ],
        },
        {
          label: "Microsite",
          fields: [
            {
              name: "theme",
              type: "group",
              admin: {
                description:
                  "Available on higher plans. Colours are contrast-checked on save and rejected if they fail.",
              },
              fields: [
                {
                  name: "accent",
                  type: "text",
                  admin: {
                    description:
                      "Hex value, for example #E32432. Must reach 4.5:1 against white or the microsite becomes unreadable for some visitors.",
                  },
                  /**
                   * A dealer picking their own brand colour is a real feature and a real
                   * accessibility risk: brand palettes are chosen for a logo on a sign, not
                   * for 14px text on a screen. Rejecting the value with the measured ratio
                   * and the nearest passing shade is more useful than silently overriding it,
                   * because it tells them what is wrong and what to do about it.
                   */
                  validate: (value: unknown) => {
                    if (!value) return true;
                    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
                      return "Use a six-digit hex value, for example #E32432.";
                    }
                    const ratio = contrastRatio(value, "#FFFFFF");
                    if (ratio < 4.5) {
                      return `That colour reaches only ${ratio.toFixed(2)}:1 against white, and text needs 4.5:1 to stay readable. Try a darker shade of the same hue.`;
                    }
                    return true;
                  },
                },
                {
                  name: "heroLayout",
                  type: "select",
                  defaultValue: "standard",
                  options: [
                    { value: "standard", label: "Photo with stock below" },
                    { value: "split", label: "Split, photo beside the introduction" },
                    { value: "minimal", label: "Text only, stock first" },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Commercial",
          fields: [
            {
              name: "plan",
              type: "relationship",
              relationTo: "plans",
              access: {
                update: ({ req }) => isPlatformStaff(req.user),
              },
            },
            {
              name: "listingLimit",
              type: "number",
              defaultValue: 25,
              access: { update: ({ req }) => isPlatformStaff(req.user) },
              admin: { description: "Set from the plan. Overridable per dealership by staff." },
            },
            {
              name: "listingCount",
              type: "number",
              defaultValue: 0,
              admin: {
                readOnly: true,
                position: "sidebar",
                description: "Live listings. Maintained by a job, never written on a page view.",
              },
            },
            {
              name: "reviewScore",
              type: "number",
              admin: {
                readOnly: true,
                position: "sidebar",
                description:
                  "Computed. Stays empty until the dealership has five verified reviews, and no aggregateRating is emitted before then.",
              },
            },
            {
              name: "reviewCount",
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
                description:
                  "Seeded example dealership, not a real business. Labelled as such everywhere it appears on the public site.",
              },
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
};
