import { randomBytes } from "node:crypto";

import type { CollectionConfig } from "payload";

import { isPlatformStaff, platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * Website mockups made for dealerships, and the private links they are sent.
 *
 * A mockup is one self-contained HTML file: the design, its scripts from the usual CDNs, and its
 * photographs inlined. Staff upload it here, and the dealership gets a link at
 * rynet.co.za/preview/<token> that only works if you have it.
 *
 * WHY THE FILE IS NEVER SERVED FROM HERE
 *
 * Reading the file through Payload's own address would hand a dealership's mockup to anyone who
 * guessed its file name, and would run its scripts with Rynet's own origin. So read access is
 * staff only, and the only public way to see one is the preview route, which serves it inside a
 * sandbox with no access to Rynet's cookies or storage, hidden from search engines, with Rynet
 * Digital's bar along the bottom. See src/app/preview/[token]/route.ts.
 *
 * Opened tells you the moment to call: the preview route records the first and latest time the
 * link was opened, and how often, never counting a view by Rynet staff.
 */
export const Previews: CollectionConfig = {
  slug: "previews",
  labels: { singular: "Website mockup", plural: "Website mockups" },
  admin: {
    useAsTitle: "dealership",
    defaultColumns: ["dealership", "contactName", "firstViewedAt", "viewCount", "updatedAt"],
    group: ADMIN_GROUP.daily,
    description:
      "Homepage mockups made for dealerships. Upload the finished HTML file, then send the private link.",
  },
  access: {
    read: platformStaffOnly,
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: ({ req }) => isPlatformStaff(req.user),
  },
  upload: {
    // Beside media, outside the folders a deploy replaces (scripts/host-deploy.sh).
    staticDir: "previews",
    mimeTypes: ["text/html"],
    filesRequiredOnCreate: true,
  },
  fields: [
    {
      name: "dealership",
      type: "text",
      required: true,
      label: "Dealership",
    },
    {
      type: "row",
      fields: [
        { name: "contactName", type: "text", label: "Sent to" },
        { name: "phone", type: "text", label: "Their phone or WhatsApp" },
      ],
    },
    {
      name: "request",
      type: "relationship",
      relationTo: "leads",
      label: "From this request",
      filterOptions: { type: { equals: "mockup_request" } },
      admin: { description: "The free mockup request it answers, if there was one." },
    },
    {
      // The link, the WhatsApp message and whether it has been opened, drawn by the component.
      name: "sendPanel",
      type: "ui",
      admin: {
        components: { Field: "/components/admin/previews/send-panel#PreviewSendPanel" },
      },
    },
    {
      name: "token",
      type: "text",
      unique: true,
      index: true,
      label: "Private link code",
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Made for you. Anyone with the link can see the mockup, nobody else.",
      },
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === "string" && value.length >= 20
              ? value
              : randomBytes(18).toString("base64url"),
        ],
      },
    },
    {
      name: "firstViewedAt",
      type: "date",
      label: "First opened",
      admin: { readOnly: true, position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "lastViewedAt",
      type: "date",
      label: "Last opened",
      admin: { readOnly: true, position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "viewCount",
      type: "number",
      defaultValue: 0,
      label: "Times opened",
      admin: { readOnly: true, position: "sidebar" },
    },
    { name: "notes", type: "textarea", label: "Notes" },
  ],
};
