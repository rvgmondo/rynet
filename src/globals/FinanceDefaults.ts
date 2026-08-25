import type { GlobalConfig } from "payload";

import { platformStaffOnly } from "@/access/roles";

/**
 * Finance calculator defaults.
 *
 * South African vehicle credit sits under the National Credit Act, so a wrong instalment
 * shown beside a price is a compliance problem rather than a display bug. Three decisions
 * follow from that and none of them are negotiable in code review:
 *
 * 1. The prime rate lives here, not in a constant, so an admin updates it the day the SARB
 *    moves it rather than waiting for a deploy. Every stored monthly estimate is recomputed
 *    by a background job when it changes.
 * 2. The disclaimer is a required field with no usable default. It cannot be emptied and it
 *    ships marked "requires legal review" until a qualified human has signed it off.
 * 3. The calculator presents an estimate and shows the total cost of credit. It never
 *    presents itself as a quotation, because a quotation under the NCA is a specific thing
 *    with specific obligations and we are not a credit provider.
 */
export const FinanceDefaults: GlobalConfig = {
  slug: "finance-defaults",
  label: "Finance calculator defaults",
  admin: {
    group: "Settings",
    description:
      "Drives every instalment estimate on the site. Changing the prime rate recalculates all stock.",
  },
  access: {
    read: () => true,
    update: platformStaffOnly,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "primeRatePercent",
          type: "number",
          required: true,
          defaultValue: 10.5,
          admin: {
            description:
              "SARB prime. 10.5 as at 28 May 2026, on a 7.00 repo. Update this the day it moves.",
          },
        },
        {
          name: "defaultRateOffsetPercent",
          type: "number",
          required: true,
          defaultValue: 1.5,
          admin: {
            description: "Added to prime for the default estimate, since few buyers get prime.",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "defaultTermMonths", type: "number", required: true, defaultValue: 72 },
        { name: "defaultDepositPercent", type: "number", required: true, defaultValue: 10 },
        { name: "defaultBalloonPercent", type: "number", required: true, defaultValue: 0 },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "initiationFee",
          type: "number",
          required: true,
          defaultValue: 1207.5,
          admin: { description: "Rand, VAT inclusive. Capped by the NCA." },
        },
        {
          name: "monthlyServiceFee",
          type: "number",
          required: true,
          defaultValue: 69,
          admin: { description: "Rand per month, VAT inclusive." },
        },
      ],
    },
    {
      name: "disclaimer",
      type: "textarea",
      required: true,
      defaultValue:
        "REQUIRES LEGAL REVIEW. This calculator gives an estimate only and is not a quotation, an offer of credit, or a pre-approval. The actual instalment depends on a credit assessment by a registered credit provider and on the rate you are offered. Rynet is not a credit provider and does not arrange credit.",
      admin: {
        description:
          "Shown with every instalment figure on the site. Cannot be emptied. Keep the review marker until a South African attorney has signed this off.",
      },
      validate: (value: unknown) => {
        if (typeof value !== "string" || value.trim().length < 40) {
          return "The finance disclaimer is required and cannot be shortened to nothing. This is a National Credit Act obligation, not a design choice.";
        }
        return true;
      },
    },
    {
      name: "lastReviewedAt",
      type: "date",
      admin: {
        position: "sidebar",
        description: "When the disclaimer wording was last checked by someone qualified.",
      },
    },
  ],
};
