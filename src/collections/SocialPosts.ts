import type { CollectionConfig, Where } from "payload";

import { dealerIdOf, isPlatformStaff, platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * Every post Rynet sends, or will send, to a dealership's Facebook Page or Instagram, and what
 * happened to it. The queue and the history in one table, worked by src/lib/social/publisher.ts.
 *
 * Written by server code only, like the accounts: a dealership asks for a post from its portal
 * and sees how it went there, and Rynet staff can see every one here.
 */
export const SocialPosts: CollectionConfig = {
  slug: "social-posts",
  labels: { singular: "Social post", plural: "Social posts" },
  admin: {
    useAsTitle: "caption",
    defaultColumns: ["dealer", "network", "kind", "status", "runAfter", "postedAt"],
    group: ADMIN_GROUP.lists,
    description: "Posts sent to dealerships' Facebook Pages and Instagram, and what happened.",
  },
  defaultSort: "-createdAt",
  access: {
    read: ({ req }) => {
      if (isPlatformStaff(req.user)) return true;
      const own = dealerIdOf(req.user);
      if (!own) return false;
      const mine: Where = { dealer: { equals: own } };
      return mine;
    },
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: platformStaffOnly,
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
          index: true,
          label: "Dealership",
        },
        {
          // Not required: a disconnected page is deleted, and its history stays.
          name: "account",
          type: "relationship",
          relationTo: "social-accounts",
          index: true,
          label: "Posted to",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "network",
          type: "select",
          required: true,
          options: [
            { value: "facebook", label: "Facebook" },
            { value: "instagram", label: "Instagram" },
          ],
        },
        {
          name: "kind",
          type: "select",
          required: true,
          defaultValue: "manual",
          label: "How it was asked for",
          options: [
            { value: "manual", label: "Posted from the portal" },
            { value: "auto", label: "New car, posted automatically" },
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
    { name: "caption", type: "textarea", required: true, label: "Words" },
    {
      // A file in social-media/, served publicly at /social-media/<name> so Meta can fetch it.
      name: "imageFile",
      type: "text",
      required: true,
      label: "Picture file",
      admin: { readOnly: true },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "queued",
      index: true,
      options: [
        { value: "queued", label: "Waiting" },
        { value: "publishing", label: "Posting now" },
        { value: "posted", label: "Posted" },
        { value: "failed", label: "Did not post" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "runAfter",
      type: "date",
      index: true,
      label: "Not before",
      admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
    },
    { name: "attempts", type: "number", defaultValue: 0, admin: { position: "sidebar" } },
    { name: "startedAt", type: "date", admin: { position: "sidebar", readOnly: true } },
    { name: "postedAt", type: "date", label: "Posted at", admin: { position: "sidebar" } },
    {
      type: "row",
      fields: [
        { name: "externalPostId", type: "text", label: "Its id there", admin: { readOnly: true } },
        { name: "permalink", type: "text", label: "Link to the post", admin: { readOnly: true } },
      ],
    },
    { name: "error", type: "text", label: "What went wrong", admin: { readOnly: true } },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      label: "Asked for by",
      admin: { position: "sidebar", readOnly: true },
    },
  ],
};
