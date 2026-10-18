import type { CollectionConfig, Where } from "payload";

import { dealerIdOf, isPlatformStaff, platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * A dealership's Facebook Page or Instagram account, connected so Rynet can post its ads there.
 *
 * Made by the connect flow (src/app/api/portal/social), never by hand: a row is only as good as
 * the token on it, and only Facebook hands those out. So every write is server code, after it has
 * checked who is asking, and the API accepts writes from Rynet staff only.
 *
 * THE TOKEN
 *
 * A Page token can post as the dealership to its own customers. It is encrypted before it is
 * stored (src/lib/social/secrets.ts) and its field cannot be read through any API, by anybody,
 * staff included: the publisher reads it on the server with access switched off, and nowhere else
 * does.
 *
 * A dealership sees its own rows, in the portal, without the token.
 */
export const SocialAccounts: CollectionConfig = {
  slug: "social-accounts",
  labels: { singular: "Connected social page", plural: "Connected social pages" },
  admin: {
    useAsTitle: "displayName",
    defaultColumns: ["displayName", "network", "dealer", "state", "autoPost"],
    group: ADMIN_GROUP.lists,
    description:
      "Facebook Pages and Instagram accounts dealerships have connected from their portal.",
  },
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
      name: "dealer",
      type: "relationship",
      relationTo: "dealers",
      required: true,
      index: true,
      label: "Dealership",
    },
    {
      type: "row",
      fields: [
        {
          name: "network",
          type: "select",
          required: true,
          label: "Where",
          options: [
            { value: "facebook", label: "Facebook Page" },
            { value: "instagram", label: "Instagram" },
          ],
        },
        { name: "displayName", type: "text", required: true, label: "Name" },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "externalId",
          type: "text",
          required: true,
          index: true,
          label: "Its id at Meta",
          admin: { readOnly: true },
        },
        {
          // A Page and the Instagram account linked to it share this, so they are chosen together.
          name: "pageId",
          type: "text",
          index: true,
          label: "Facebook Page id",
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: "token",
      type: "text",
      hidden: true,
      access: { read: () => false, create: () => false, update: () => false },
    },
    {
      name: "state",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      label: "State",
      options: [
        { value: "pending", label: "Offered, not chosen yet" },
        { value: "connected", label: "Connected" },
        { value: "reconnect", label: "Needs connecting again" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "autoPost",
      type: "checkbox",
      defaultValue: false,
      label: "Post new cars automatically",
      admin: { position: "sidebar" },
    },
    {
      name: "connectedBy",
      type: "relationship",
      relationTo: "users",
      label: "Connected by",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "connectedAt",
      type: "date",
      label: "Connected on",
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "lastPostedAt",
      type: "date",
      label: "Last posted",
      admin: { position: "sidebar", readOnly: true },
    },
    { name: "lastError", type: "text", label: "What went wrong last", admin: { readOnly: true } },
  ],
};
