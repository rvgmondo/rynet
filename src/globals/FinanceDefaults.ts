import type { GlobalConfig } from "payload";

import { platformStaffOnly } from "@/access/roles";
import { ADMIN_GROUP } from "@/lib/admin-nav";

/**
 * Finance calculator defaults.
 *
 * South African vehicle credit sits under the National Credit Act, so a wrong instalment
 * shown beside a price is a compliance problem rather than a display bug. Three decisions
 * follow from that and none of them are negotiable in code review:
 *
 * 1. The prime rate lives here, not in a constant, so an admin updates it the day the SARB
 *    moves it rather than waiting for a deploy. Every stored monthly estimate is recomputed
 *    by a background job when it changes. NOT IMPLEMENTED as written: nothing stores a monthly
 *    estimate. The site works every instalment out live from these figures
 *    (src/components/listing/finance-estimate.ts), so a change here shows on the next page load.
 * 2. The disclaimer is a required field with no usable default. It cannot be emptied and it
 *    ships marked "requires legal review" until a qualified human has signed it off.
 * 3. The calculator presents an estimate and shows the total cost of credit. It never
 *    presents itself as a quotation, because a quotation under the NCA is a specific thing
 *    with specific obligations and we are not a credit provider.
 */
export const FinanceDefaults: GlobalConfig = {
  slug: "finance-defaults",
  label: "Finance calculator",
  admin: {
    group: ADMIN_GROUP.settings,
    // Was: "Drives every instalment estimate on the site. Changing the prime rate recalculates all
    // stock."
    description: "The figures behind every monthly instalment shown on the site.",
    hideAPIURL: true,
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
          label: "Prime rate (%)",
          admin: {
            /*
             * SARB prime. 10.5 as at 28 May 2026, on a 7.00 repo. The date lives here rather than
             * in the hint, because a date on the screen goes stale the day the rate moves.
             */
            description: "The Reserve Bank prime rate. Change it on the day it moves.",
          },
        },
        {
          name: "defaultRateOffsetPercent",
          type: "number",
          required: true,
          defaultValue: 1.5,
          label: "Added to prime (%)",
          admin: {
            // Added to prime for the default estimate, since few buyers get prime.
            description: "Most buyers pay more than prime.",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "defaultTermMonths",
          type: "number",
          required: true,
          defaultValue: 72,
          label: "Loan term (months)",
        },
        {
          name: "defaultDepositPercent",
          type: "number",
          required: true,
          defaultValue: 10,
          label: "Deposit (%)",
        },
        {
          name: "defaultBalloonPercent",
          type: "number",
          required: true,
          defaultValue: 0,
          label: "Balloon payment (%)",
        },
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
          label: "Initiation fee (R)",
          // Rand, VAT inclusive. Capped by the NCA.
          admin: { description: "Including VAT." },
        },
        {
          name: "monthlyServiceFee",
          type: "number",
          required: true,
          defaultValue: 69,
          label: "Monthly service fee (R)",
          // Rand per month, VAT inclusive.
          admin: { description: "Including VAT." },
        },
      ],
    },
    {
      name: "disclaimer",
      type: "textarea",
      required: true,
      defaultValue:
        "REQUIRES LEGAL REVIEW. This calculator gives an estimate only and is not a quotation, an offer of credit, or a pre-approval. The actual instalment depends on a credit assessment by a registered credit provider and on the rate you are offered. Rynet is not a credit provider and does not arrange credit.",
      label: "Disclaimer shown with every instalment",
      admin: {
        /*
         * Shown with every instalment figure on the site. Cannot be emptied. Keep the review marker
         * until a South African attorney has signed this off.
         */
        description: "Required by law. Keep the review note until an attorney signs it off.",
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
      label: "Disclaimer last checked on",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
        // When the disclaimer wording was last checked by someone qualified.
      },
    },
  ],
};
