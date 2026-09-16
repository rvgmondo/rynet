import type { CollectionConfig, FieldAccess, Where } from "payload";

import {
  canManageDealer,
  dealerIdOf,
  isPlatformAdmin,
  isPlatformStaff,
  platformStaffOnly,
} from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";
import { DEALER_QUICK_FILTERS, DEALER_STATUS_TONES } from "@/lib/admin-quick-filters";
import { contrastRatio } from "@/lib/contrast";
import { slugify } from "@/lib/slug";

/**
 * Fields a dealership may never write about itself.
 *
 * Every one of these is a figure Rynet publishes as its own assessment. Platform staff can
 * still correct them by hand, which is what makes a bad import fixable.
 */
const computedByThePlatform: FieldAccess = ({ req }) => isPlatformStaff(req.user);

/** Columns and filters that mean nothing in a list: rich text, photos, rows of settings. */
const notInList = { disableListColumn: true, disableListFilter: true } as const;

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
  defaultSort: "tradingName",
  admin: {
    useAsTitle: "tradingName",
    defaultColumns: [
      "tradingName",
      "verificationStatus",
      "liveCars",
      "plan",
      "isDemonstration",
      "updatedAt",
    ],
    group: ADMIN_GROUP.daily,
    listSearchableFields: ["tradingName", "legalName"],
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
    components: {
      beforeListTable: [
        {
          path: "/components/admin/list/quick-filters#QuickFilters",
          clientProps: { filters: DEALER_QUICK_FILTERS },
        },
      ],
    },
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
    /*
     * The sidebar. Only top-level fields can sit there, which is why these two live outside the
     * tabs: inside a tab, `position: "sidebar"` does nothing. The tabs below have no `name`, so
     * moving a field in or out of one changes no column.
     */
    {
      name: "verificationStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      label: "Verification",
      options: [
        { value: "pending", label: "Waiting for checks" },
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
        position: "sidebar",
        components: {
          Cell: {
            path: "/components/admin/cells/value-cells#StatusBadgeCell",
            clientProps: { tones: DEALER_STATUS_TONES },
          },
        },
        /*
         * Was: "Nothing publishes unless this reads Verified." A car cannot be SET live unless its
         * dealership is verified (Vehicles beforeChange), but suspending a dealership does not take
         * its live cars off the site, because search filters on each car's own status. The hint
         * promises only what is enforced.
         */
        description: "Only verified dealerships can put cars live.",
      },
    },
    {
      name: "isDemonstration",
      type: "checkbox",
      defaultValue: false,
      label: "Example dealership",
      access: { update: ({ req }) => isPlatformStaff(req.user) },
      admin: {
        position: "sidebar",
        readOnly: true,
        components: { Cell: "/components/admin/cells/value-cells#YesNoCell" },
        // Seeded example dealership, not a real business. Labelled as such everywhere it appears
        // on the public site.
        description: "Not a real business. Labelled as an example on the site.",
      },
    },
    {
      /*
       * Live cars, counted fresh, as a list column, and a warning in the sidebar when a dealership
       * that is not verified still has cars on the site. A `ui` field stores nothing. This replaces
       * the stored listing count, which nothing ever wrote.
       */
      name: "liveCars",
      type: "ui",
      label: "Live cars",
      admin: {
        position: "sidebar",
        components: {
          Cell: "/components/admin/cells/dealer-live-cars-cell#DealerLiveCarsCell",
          Field: "/components/admin/dealers/live-cars-note#LiveCarsNote",
        },
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Profile",
          fields: [
            {
              name: "tradingName",
              type: "text",
              required: true,
              index: true,
              label: "Dealership name",
            },
            {
              name: "legalName",
              type: "text",
              required: true,
              label: "Registered company name",
              // As registered with CIPC. May differ from the trading name.
              admin: { description: "As registered with CIPC." },
            },
            {
              name: "logo",
              type: "upload",
              relationTo: "media",
              label: "Logo",
              admin: notInList,
            },
            {
              name: "aboutRichText",
              type: "richText",
              label: "About the dealership",
              admin: notInList,
            },
            {
              type: "row",
              fields: [
                {
                  name: "foundedYear",
                  type: "number",
                  label: "Year founded",
                  admin: { disableListFilter: true },
                },
                {
                  name: "group",
                  type: "relationship",
                  relationTo: "dealer-groups",
                  label: "Dealer group",
                },
              ],
            },
            {
              name: "accreditations",
              type: "relationship",
              relationTo: "accreditations",
              hasMany: true,
              label: "Industry memberships",
              /**
               * Platform staff only, and not because of a policy in a description field.
               *
               * /how-verification-works tells the public, as a statement of fact, that where
               * a dealership displays RMI, NADA, MIWA or SAMBRA membership we have seen the
               * certificate. A dealership able to write this field makes that sentence
               * false, and it was writable: a note in `admin.description` is guidance for
               * the person looking at the screen, not a control on the API.
               */
              access: {
                create: ({ req }) => isPlatformStaff(req.user),
                update: ({ req }) => isPlatformStaff(req.user),
              },
              admin: {
                disableListColumn: true,
                // Added by Rynet once the certificate has been seen. A dealership cannot set this.
                description: "Add only after you have seen the certificate.",
              },
            },
            {
              type: "collapsible",
              label: "Advanced",
              admin: { initCollapsed: true },
              fields: [
                {
                  name: "slug",
                  type: "text",
                  required: true,
                  unique: true,
                  index: true,
                  label: "Web address name",
                  // Their address at /dealers/[slug]. Filled in from the trading name when empty.
                  admin: { description: "Their page is /dealers/ followed by this." },
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
              ],
            },
          ],
        },
        {
          label: "Checks",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "registrationNumber",
                  type: "text",
                  // CIPC company registration number.
                  label: "CIPC registration number",
                },
                { name: "vatNumber", type: "text", label: "VAT number" },
              ],
            },
            {
              name: "motorTradeNumber",
              type: "text",
              label: "Motor trade number",
              // Motor trade number, where the dealership holds one.
              admin: { description: "If they have one." },
            },
            {
              name: "verificationNotes",
              type: "textarea",
              label: "Private notes",
              access: {
                read: ({ req }) => isPlatformStaff(req.user),
                create: ({ req }) => isPlatformStaff(req.user),
                update: ({ req }) => isPlatformStaff(req.user),
              },
              // Internal. Never shown to the dealership or the public.
              admin: { ...notInList, description: "Only Rynet staff see this." },
            },
          ],
        },
        /**
         * Trade-ins.
         *
         * A dealership decides for itself whether it wants private sellers' details and which
         * makes it will look at, so these are writable by the dealership rather than by Rynet.
         * That is the opposite of `accreditations` or `verificationStatus`, which are Rynet's
         * assessment and platform staff only.
         *
         * `acceptsTradeIns` defaults to FALSE and that default is the important part. It gates
         * whether a stranger's name and phone number are sent to this business at all, and
         * nobody should receive personal information because a checkbox happened to start on.
         */
        {
          label: "Buying cars",
          fields: [
            {
              name: "acceptsTradeIns",
              type: "checkbox",
              defaultValue: false,
              label: "Wants sellers' details",
              admin: {
                // Receive private sellers who want to sell a car, from /sell-to-a-dealer. Their
                // name and number are sent to the dealership, so this stays off until it asks.
                description:
                  "Sends them people selling a car on the site. Leave off unless they asked.",
              },
            },
            {
              name: "buysMakes",
              type: "relationship",
              relationTo: "makes",
              hasMany: true,
              label: "Only these makes",
              admin: {
                condition: (data) => Boolean(data?.acceptsTradeIns),
                // Naming makes here means they are only sent those, which is fewer leads but less
                // of their time wasted.
                description: "Leave empty to receive any make.",
              },
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
              admin: notInList,
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "name", type: "text", label: "Name" },
                    { name: "email", type: "email", label: "Email" },
                    { name: "phone", type: "text", label: "Phone" },
                  ],
                },
              ],
            },
            { name: "whatsappNumber", type: "text", label: "WhatsApp number" },
          ],
        },
        {
          label: "Plan",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "plan",
                  type: "relationship",
                  relationTo: "plans",
                  label: "Plan",
                  access: {
                    update: ({ req }) => isPlatformStaff(req.user),
                  },
                },
                {
                  name: "listingLimit",
                  type: "number",
                  defaultValue: 25,
                  label: "Cars allowed",
                  access: { update: ({ req }) => isPlatformStaff(req.user) },
                  admin: {
                    disableListFilter: true,
                    // Was: "Set from the plan. Overridable per dealership by staff."
                    // NOT IMPLEMENTED: nothing counts a dealership's cars against this number.
                    description: "Not enforced yet.",
                  },
                },
              ],
            },
            /**
             * The three computed figures, closed at the API rather than only in the interface.
             *
             * `admin.readOnly` greys a field out on the screen and does nothing whatsoever to
             * a PATCH. All three were writable by a dealer principal, so a dealership could
             * award itself five stars from four hundred reviews it had never received, which
             * is the exact thing the brief forbids and the worst available lie on a platform
             * that sells trust.
             *
             * Hidden in the admin (UI only) because nothing writes them yet: listingCount read 0
             * for every dealership, whatever its stock.
             */
            {
              name: "listingCount",
              type: "number",
              defaultValue: 0,
              access: { update: computedByThePlatform },
              admin: {
                ...notInList,
                readOnly: true,
                hidden: true,
                // Was: "Live listings. Maintained by a job, never written on a page view."
                // NOT IMPLEMENTED: there is no such job.
              },
            },
            {
              name: "reviewScore",
              type: "number",
              access: { update: computedByThePlatform },
              admin: {
                ...notInList,
                readOnly: true,
                hidden: true,
                // Computed. Stays empty until the dealership has five verified reviews, and no
                // aggregateRating is emitted before then. NOT IMPLEMENTED: there are no reviews.
              },
            },
            {
              name: "reviewCount",
              type: "number",
              defaultValue: 0,
              access: { update: computedByThePlatform },
              admin: { ...notInList, readOnly: true, hidden: true },
            },
          ],
        },
        /*
         * Settings the site does not read yet. Kept, because they are columns that may hold data,
         * but out of the way so nobody fills them in expecting something to happen.
         */
        {
          label: "Not in use yet",
          description: "The site does not use these settings yet.",
          fields: [
            {
              name: "heroImages",
              type: "upload",
              relationTo: "media",
              hasMany: true,
              label: "Showroom photos",
              admin: notInList,
            },
            {
              name: "franchises",
              type: "relationship",
              relationTo: "franchises",
              hasMany: true,
              label: "Brand franchises",
              admin: notInList,
            },
            {
              name: "socialProfiles",
              type: "array",
              label: "Social media",
              labels: { singular: "Profile", plural: "Profiles" },
              admin: notInList,
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "platform",
                      type: "select",
                      label: "Site",
                      options: ["facebook", "instagram", "youtube", "tiktok", "linkedin", "x"].map(
                        (v) => ({ value: v, label: v[0]?.toUpperCase() + v.slice(1) }),
                      ),
                    },
                    { name: "url", type: "text", label: "Link" },
                  ],
                },
              ],
            },
            {
              name: "emailRouting",
              type: "array",
              label: "Where enquiries should go",
              labels: { singular: "Rule", plural: "Rules" },
              admin: {
                ...notInList,
                // Was: "Where each kind of lead goes. Without a rule, leads fall back to the
                // dealer principal." NOT IMPLEMENTED: no enquiry email is sent anywhere yet.
                description: "No enquiry emails are sent yet.",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "leadType",
                      type: "select",
                      required: true,
                      label: "Kind of enquiry",
                      options: [
                        { value: "enquiry", label: "Question about a car" },
                        { value: "test_drive", label: "Test drive request" },
                        { value: "finance", label: "Finance enquiry" },
                        { value: "trade_in", label: "Wants to sell a car" },
                        { value: "callback", label: "Asked for a call back" },
                      ],
                    },
                    { name: "toAddress", type: "email", required: true, label: "Send to" },
                    {
                      name: "branch",
                      type: "relationship",
                      relationTo: "branches",
                      label: "Branch",
                    },
                  ],
                },
              ],
            },
            /*
             * Was described as: "Available on higher plans. Colours are contrast-checked on save
             * and rejected if they fail." NOT IMPLEMENTED: the dealership page does not read these.
             */
            {
              name: "theme",
              type: "group",
              label: "Page design",
              admin: notInList,
              fields: [
                {
                  name: "accent",
                  type: "text",
                  label: "Accent colour",
                  admin: {
                    // Hex value. Must reach 4.5:1 against white or the page becomes unreadable
                    // for some visitors.
                    description: "A hex colour like #C81E2B, dark enough to read on white.",
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
                  label: "Top of page layout",
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
      ],
    },
  ],
  timestamps: true,
};
