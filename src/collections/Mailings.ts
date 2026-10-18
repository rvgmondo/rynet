import type { CollectionConfig } from "payload";

import { isPlatformAdmin, platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * The Mailer's three tables (Admin > Mailer, src/components/admin/mailer).
 *
 *   email-templates   emails staff send often, saved to start from next time
 *   mailings          one send to many dealerships: the words, and who asked for it
 *   mail-deliveries   one row per dealership per mailing, and what happened to it
 *
 * Deliveries are their own table rather than an array on the mailing, so the sender can mark each
 * one as it goes without rewriting a mailing of three hundred rows every time, and so "every
 * email Amico has had from us" is one query. Staff only, all three.
 */

export const EmailTemplates: CollectionConfig = {
  slug: "email-templates",
  labels: { singular: "Email template", plural: "Email templates" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "subject", "updatedAt"],
    group: ADMIN_GROUP.lists,
    description: "Emails to dealerships you send often. Pick one in the Mailer to start from it.",
  },
  access: {
    read: platformStaffOnly,
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: platformStaffOnly,
  },
  fields: [
    { name: "name", type: "text", required: true, label: "What it is for" },
    { name: "subject", type: "text", required: true, label: "Subject" },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: "Words",
      admin: {
        rows: 12,
        description:
          "A blank line starts a paragraph, a line starting with a dash is a bullet, **bold**, [link](https://...). Fields like {{firstName}} and {{dealership}} are filled in for each dealership.",
      },
    },
    {
      type: "row",
      fields: [
        { name: "buttonLabel", type: "text", label: "Button words" },
        { name: "buttonUrl", type: "text", label: "Button goes to" },
      ],
    },
  ],
};

export const Mailings: CollectionConfig = {
  slug: "mailings",
  labels: { singular: "Mailing", plural: "Mailings" },
  admin: {
    useAsTitle: "subject",
    defaultColumns: ["subject", "audience", "status", "createdAt"],
    group: ADMIN_GROUP.lists,
    description:
      "Emails sent to dealerships from the Mailer. Each one's deliveries are listed with it.",
  },
  defaultSort: "-createdAt",
  access: {
    read: platformStaffOnly,
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: ({ req }) => isPlatformAdmin(req.user),
  },
  fields: [
    { name: "subject", type: "text", required: true },
    { name: "body", type: "textarea", required: true },
    {
      type: "row",
      fields: [
        { name: "buttonLabel", type: "text" },
        { name: "buttonUrl", type: "text" },
      ],
    },
    { name: "audience", type: "text", label: "Sent to", admin: { readOnly: true } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "sending",
      options: [
        { value: "sending", label: "Sending" },
        { value: "done", label: "Done" },
        { value: "cancelled", label: "Stopped" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      label: "Sent by",
      admin: { position: "sidebar", readOnly: true },
    },
  ],
};

export const MailDeliveries: CollectionConfig = {
  slug: "mail-deliveries",
  labels: { singular: "Mail delivery", plural: "Mail deliveries" },
  admin: {
    useAsTitle: "to",
    defaultColumns: ["to", "dealer", "mailing", "status", "sentAt"],
    group: ADMIN_GROUP.lists,
    description: "Each dealership's copy of a mailing, and whether it went.",
  },
  defaultSort: "-createdAt",
  access: {
    read: platformStaffOnly,
    create: platformStaffOnly,
    update: platformStaffOnly,
    delete: ({ req }) => isPlatformAdmin(req.user),
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "mailing",
          type: "relationship",
          relationTo: "mailings",
          required: true,
          index: true,
        },
        { name: "dealer", type: "relationship", relationTo: "dealers", index: true },
      ],
    },
    { name: "to", type: "email", required: true, label: "Sent to" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "queued",
      index: true,
      options: [
        { value: "queued", label: "Waiting" },
        { value: "sent", label: "Sent" },
        { value: "failed", label: "Did not send" },
        { value: "skipped", label: "Left out" },
      ],
    },
    { name: "error", type: "text", label: "Why", admin: { readOnly: true } },
    { name: "sentAt", type: "date", label: "Sent at", admin: { readOnly: true } },
  ],
};
