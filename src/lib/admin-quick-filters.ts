import type { QuickFilter } from "@/components/admin/list/quick-filters";

import type { BadgeTone } from "./admin-list";

/**
 * The one-click filters above the busiest admin lists, and the badge colours for their statuses.
 *
 * Plain data, handed to the list components as props from the collection configs. Option VALUES
 * here must match the collections' select values exactly; only the words are ours to choose.
 */

/** Taps that leave no name or message: counted, but nobody to reply to. */
export const LEAD_CLICK_TYPES = ["whatsapp_click", "phone_reveal"] as const;

/** Every car status the public cannot see. Only live cars, and sold ones for 90 days, show. */
export const HIDDEN_CAR_STATUSES = [
  "draft",
  "pending_review",
  "reserved",
  "expired",
  "archived",
] as const;

export const CAR_QUICK_FILTERS: QuickFilter[] = [
  { label: "All cars", conditions: [] },
  { label: "Live", conditions: [{ field: "status", operator: "equals", value: "live" }] },
  {
    label: "Hidden from the site",
    conditions: [{ field: "status", operator: "in", value: [...HIDDEN_CAR_STATUSES] }],
  },
  { label: "Sold", conditions: [{ field: "status", operator: "equals", value: "sold" }] },
  {
    label: "Example cars",
    conditions: [{ field: "isDemonstration", operator: "equals", value: true }],
  },
  {
    label: "Real cars",
    conditions: [{ field: "isDemonstration", operator: "equals", value: false }],
  },
];

export const LEAD_QUICK_FILTERS: QuickFilter[] = [
  { label: "All enquiries", conditions: [] },
  {
    label: "Needs a reply",
    conditions: [
      { field: "status", operator: "equals", value: "new" },
      { field: "type", operator: "not_in", value: [...LEAD_CLICK_TYPES] },
    ],
  },
  { label: "Sellers", conditions: [{ field: "type", operator: "equals", value: "trade_in" }] },
  {
    label: "Rynet Digital",
    conditions: [{ field: "type", operator: "equals", value: "agency_enquiry" }],
  },
  {
    label: "Taps only",
    conditions: [{ field: "type", operator: "in", value: [...LEAD_CLICK_TYPES] }],
  },
];

export const DEALER_QUICK_FILTERS: QuickFilter[] = [
  { label: "All dealerships", conditions: [] },
  {
    label: "Waiting for checks",
    conditions: [{ field: "verificationStatus", operator: "equals", value: "pending" }],
  },
  {
    label: "Verified",
    conditions: [{ field: "verificationStatus", operator: "equals", value: "verified" }],
  },
  {
    label: "Suspended",
    conditions: [{ field: "verificationStatus", operator: "equals", value: "suspended" }],
  },
  {
    label: "Buying cars",
    conditions: [{ field: "acceptsTradeIns", operator: "equals", value: true }],
  },
];

export const CAR_STATUS_TONES: Record<string, BadgeTone> = {
  live: "success",
  sold: "info",
  pending_review: "warning",
  reserved: "warning",
  draft: "neutral",
  expired: "neutral",
  archived: "neutral",
};

/** Shorter than the form's option labels, which spell out who can see the car. */
export const CAR_STATUS_LIST_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Waiting for check",
  live: "Live",
  reserved: "Reserved",
  sold: "Sold",
  expired: "Expired",
  archived: "Archived",
};

export const LEAD_STATUS_TONES: Record<string, BadgeTone> = {
  new: "warning",
  contacted: "info",
  qualified: "info",
  appointment_set: "info",
  sold: "success",
  lost: "neutral",
};

export const LEAD_TYPE_LIST_LABELS: Record<string, string> = {
  enquiry: "Question",
  test_drive: "Test drive",
  finance: "Finance",
  trade_in: "Selling a car",
  callback: "Call back",
  whatsapp_click: "WhatsApp tap",
  phone_reveal: "Phone number view",
  dealer_contact: "Dealership contact",
  agency_enquiry: "Rynet Digital",
};

export const LEAD_TYPE_TONES: Record<string, BadgeTone> = {
  trade_in: "info",
  agency_enquiry: "info",
};

export const DEALER_STATUS_TONES: Record<string, BadgeTone> = {
  verified: "success",
  pending: "warning",
  suspended: "danger",
  archived: "neutral",
};

export const ACCOUNT_STATUS_TONES: Record<string, BadgeTone> = {
  active: "success",
  invited: "warning",
  suspended: "danger",
  deletion_requested: "warning",
};
