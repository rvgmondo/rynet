import { randomBytes } from "node:crypto";

import type { CollectionConfig } from "payload";

import { isPlatformStaff, platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";
import { MOCKUP_LINK_DAYS } from "@/lib/preview-link";
import { slugify } from "@/lib/slug";

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
    defaultColumns: ["dealership", "stage", "firstViewedAt", "viewCount", "expiresAt"],
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
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === "create" && data && !data.expiresAt) {
          data.expiresAt = new Date(Date.now() + MOCKUP_LINK_DAYS * 86_400_000).toISOString();
        }
        return data;
      },
    ],
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
      // The link the dealership gets: rynet.co.za/p/<slug>. Readable on purpose. The pages are
      // noindex, listed nowhere and in no sitemap, so a link is only found by being sent.
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      label: "Link name",
      admin: {
        position: "sidebar",
        description:
          "The end of the link, for example changan-pretoria. Made from the dealership's name when left empty.",
      },
      hooks: {
        beforeValidate: [
          async ({ value, data, req, originalDoc }) => {
            const base =
              slugify(
                typeof value === "string" && value.trim() ? value : String(data?.dealership ?? ""),
              ) || "mockup";
            // Another mockup may already use the name: add -2, -3 until it is free.
            for (let attempt = 1; attempt < 50; attempt += 1) {
              const candidate = attempt === 1 ? base : `${base}-${attempt}`;
              const taken = await req.payload.count({
                collection: "previews",
                where: {
                  and: [
                    { slug: { equals: candidate } },
                    ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
                  ],
                },
                overrideAccess: true,
                req,
              });
              if (taken.totalDocs === 0) return candidate;
            }
            return `${base}-${randomBytes(3).toString("hex")}`;
          },
        ],
      },
    },
    {
      name: "token",
      type: "text",
      unique: true,
      index: true,
      label: "Old link code",
      admin: {
        readOnly: true,
        hidden: true,
        // Kept so a /preview/<code> link sent before readable links existed still opens.
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
    {
      name: "stage",
      type: "select",
      defaultValue: "draft",
      label: "Where it stands",
      options: [
        { value: "draft", label: "Not sent yet" },
        { value: "sent", label: "Sent" },
        { value: "interested", label: "They like it" },
        { value: "won", label: "Became a client" },
        { value: "lost", label: "Not interested" },
      ],
      admin: { position: "sidebar" },
    },
    {
      // The link stops working after this. Set on creation (see MOCKUP_LINK_DAYS) and moved with
      // the buttons on the panel above. An ended link shows a short note, never the mockup.
      name: "expiresAt",
      type: "date",
      label: "Link works until",
      admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "notes", type: "textarea", label: "Notes" },
  ],
};
