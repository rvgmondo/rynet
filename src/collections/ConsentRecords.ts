import type { CollectionConfig } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

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
  defaultSort: "-grantedAt",
  admin: {
    useAsTitle: "subjectEmail",
    defaultColumns: ["grantedAt", "purpose", "subjectEmail", "withdrawnAt"],
    group: ADMIN_GROUP.lists,
    // Was: "Append only. Nothing here can be edited or deleted, which is the point."
    description:
      "A permanent record of what people agreed to. Nothing here can be changed or deleted.",
    pagination: { defaultLimit: 25 },
    hideAPIURL: true,
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
      label: "What they agreed to",
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
    {
      type: "row",
      fields: [
        { name: "subjectEmail", type: "email", index: true, label: "Email" },
        { name: "subjectPhone", type: "text", label: "Phone" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "grantedAt", type: "date", required: true, label: "Agreed on" },
        {
          name: "withdrawnAt",
          type: "date",
          label: "Withdrawn on",
          // Set by writing a new withdrawal record, not by editing this one. Shown here for
          // readability.
        },
      ],
    },
    {
      name: "policyVersion",
      type: "text",
      required: true,
      label: "Privacy notice version",
      // Which version of the privacy notice was on screen when this was given.
    },
    {
      name: "evidence",
      type: "textarea",
      label: "Exact wording they saw",
      /*
       * The exact wording the person agreed to, stored verbatim. Not a reference to it, the text
       * itself, because the wording on the page will change.
       */
      admin: { disableListColumn: true, disableListFilter: true },
    },
    {
      name: "ipHash",
      type: "text",
      label: "Submission code",
      admin: {
        disableListColumn: true,
        disableListFilter: true,
        /*
         * Hashed, never the raw address. Enough to demonstrate a distinct submission, not enough to
         * be personal information in its own right.
         */
        description: "A scrambled code, not their internet address.",
      },
    },
  ],
  timestamps: true,
};
