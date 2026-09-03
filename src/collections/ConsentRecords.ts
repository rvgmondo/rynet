import type { CollectionConfig } from "payload";

import { isPlatformStaff } from "@/access/roles";

/**
 * POPIA consent records.
 *
 * Separate from the lead rather than a checkbox on it, because consent has to survive the
 * thing it was given for. If a buyer withdraws consent, or asks what they agreed to and
 * when, the answer has to be a record with a timestamp and the version of the policy that
 * was on screen at the time. A boolean column cannot answer any of that.
 *
 * Append only. There is no update and no delete for anyone, including a platform admin.
 * Consent that can be edited after the fact is not evidence of anything.
 */
export const ConsentRecords: CollectionConfig = {
  slug: "consent-records",
  labels: { singular: "Consent record", plural: "Consent records" },
  admin: {
    useAsTitle: "purpose",
    defaultColumns: ["purpose", "subjectEmail", "grantedAt", "withdrawnAt", "policyVersion"],
    group: "Compliance",
    description: "Append only. Nothing here can be edited or deleted, which is the point.",
  },
  access: {
    read: ({ req }) => isPlatformStaff(req.user),
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: "purpose",
      type: "select",
      required: true,
      index: true,
      options: [
        { value: "enquiry", label: "Passing details to the dealership for this enquiry" },
        { value: "marketing", label: "Marketing communication from Rynet" },
        { value: "dealer_marketing", label: "Marketing communication from the dealership" },
        { value: "alerts", label: "Saved search alerts" },
        { value: "finance", label: "Passing details to a finance provider" },
        {
          value: "trade_in",
          label: "Passing details to several dealerships for a trade-in or sale offer",
        },
      ],
    },
    { name: "subjectEmail", type: "email", index: true },
    { name: "subjectPhone", type: "text" },
    {
      name: "policyVersion",
      type: "text",
      required: true,
      admin: {
        description: "Which version of the privacy notice was on screen when this was given.",
      },
    },
    { name: "grantedAt", type: "date", required: true },
    {
      name: "withdrawnAt",
      type: "date",
      admin: {
        description:
          "Set by writing a new withdrawal record, not by editing this one. Shown here for readability.",
      },
    },
    {
      name: "evidence",
      type: "textarea",
      admin: {
        description:
          "The exact wording the person agreed to, stored verbatim. Not a reference to it, the text itself, because the wording on the page will change.",
      },
    },
    {
      name: "ipHash",
      type: "text",
      admin: {
        description:
          "Hashed, never the raw address. Enough to demonstrate a distinct submission, not enough to be personal information in its own right.",
      },
    },
  ],
  timestamps: true,
};
