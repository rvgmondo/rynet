import { COMPANY } from "@/content/company";
import { renderEmail } from "@/lib/mail/layout";

/**
 * Who hears about a new enquiry, and what the email says. Pure, so both are tested.
 *
 * THE RULE
 *
 * A buyer's enquiry about a car goes to that dealership: the address its own routing rules give
 * for that kind of enquiry (and branch), then the branch's email, then the dealer principal's.
 * Consent for exactly that was given on the form, so the buyer's details are in the email and the
 * dealership can reply straight to the buyer.
 *
 * Anything meant for Rynet itself goes to the right Rynet mailbox: dealerships wanting to list,
 * mockup requests and Rynet Digital enquiries to sales, people selling a car to info.
 *
 * A dealership enquiry that has nowhere to go (no address on record at all) goes to info instead,
 * saying so, so a buyer is never left waiting on a lead nobody saw. Taps on WhatsApp or a phone
 * number carry no details and send nothing, and an example dealership never receives anything.
 */

export type LeadForEmail = {
  id: number;
  type: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
};

export type DealerForEmail = {
  tradingName: string;
  isDemonstration?: boolean | null;
  principalEmail?: string | null;
  routing?: { leadType?: string | null; toAddress?: string | null; branch?: number | null }[];
} | null;

export type Recipient = { to: string; audience: "dealer" | "staff"; fallback?: boolean };

const NO_EMAIL = new Set(["whatsapp_click", "phone_reveal"]);
const TO_SALES = new Set(["dealer_signup", "mockup_request", "agency_enquiry"]);
const TO_INFO = new Set(["trade_in"]);

export function recipientFor(
  lead: LeadForEmail,
  dealer: DealerForEmail,
  branch: { id?: number; email?: string | null } | null,
): Recipient | null {
  if (NO_EMAIL.has(lead.type)) return null;
  if (TO_SALES.has(lead.type)) return { to: COMPANY.salesEmail, audience: "staff" };
  if (TO_INFO.has(lead.type)) return { to: COMPANY.infoEmail, audience: "staff" };
  if (!dealer) return { to: COMPANY.infoEmail, audience: "staff" };
  if (dealer.isDemonstration) return null;

  const rules = dealer.routing ?? [];
  const forType = rules.filter((rule) => rule.leadType === lead.type && rule.toAddress);
  const rule =
    forType.find((r) => branch?.id !== undefined && r.branch === branch.id) ??
    forType.find((r) => !r.branch);
  const address = rule?.toAddress || branch?.email || dealer.principalEmail;
  return address
    ? { to: address, audience: "dealer" }
    : { to: COMPANY.infoEmail, audience: "staff", fallback: true };
}

const KIND: Record<string, string> = {
  enquiry: "A question about a car",
  test_drive: "A test drive request",
  finance: "A finance enquiry",
  callback: "A request to call back",
  dealer_contact: "A message for your dealership",
  trade_in: "Someone wants to sell their car",
  agency_enquiry: "A Rynet Digital enquiry",
  dealer_signup: "A dealership wants to list on Rynet",
  mockup_request: "A free website mockup request",
};

export function leadEmail(
  lead: LeadForEmail,
  recipient: Recipient,
  context: {
    dealerName?: string | null;
    carTitle?: string | null;
    carUrl?: string | null;
    adminUrl: string;
    /** The dealership's own enquiries page, for a dealership with a portal login. */
    portalUrl?: string | null;
  },
): { subject: string; text: string; html: string; replyTo?: string } {
  const kind = KIND[lead.type] ?? "A new enquiry";
  const about = context.carTitle ? `: ${context.carTitle}` : "";
  const lines = [
    `${kind}${about}.`,
    "",
    `Name: ${lead.name}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    context.carUrl ? `The car: ${context.carUrl}` : null,
    "",
    lead.message?.trim() || "No message.",
    "",
  ].filter((line): line is string => line !== null);

  if (recipient.audience === "dealer") {
    lines.push(
      "They asked through Rynet and agreed to their details being passed to you. Reply to this email to answer them directly.",
    );
    if (context.portalUrl) lines.push("", `All your enquiries: ${context.portalUrl}`);
  } else {
    if (recipient.fallback) {
      lines.push(
        `This should have gone to ${context.dealerName ?? "the dealership"}, but they have no email address on record. Pass it on, and add one to their record.`,
        "",
      );
    }
    lines.push(`In the admin: ${context.adminUrl}`);
  }

  const details = [
    `**Name:** ${lead.name}`,
    lead.phone ? `**Phone:** ${lead.phone}` : null,
    lead.email ? `**Email:** ${lead.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const note =
    recipient.audience === "dealer"
      ? "They asked through Rynet and agreed to their details being passed to you. Reply to this email to answer them directly."
      : recipient.fallback
        ? `This should have gone to ${context.dealerName ?? "the dealership"}, but they have no email address on record. Pass it on, and add one to their record.`
        : null;
  const button =
    recipient.audience === "dealer"
      ? context.portalUrl
        ? { label: "Open your enquiries", url: context.portalUrl }
        : context.carUrl
          ? { label: "See the car", url: context.carUrl }
          : null
      : { label: "Open it in the admin", url: context.adminUrl };
  const { html } = renderEmail({
    preheader: `${lead.name}${lead.message ? `: ${lead.message.trim().slice(0, 90)}` : ""}`,
    heading: `${kind}${about}`,
    body: [
      details,
      context.carUrl && context.carTitle
        ? `**The car:** [${context.carTitle}](${context.carUrl})`
        : null,
      lead.message?.trim() || "No message.",
      note,
    ]
      .filter(Boolean)
      .join("\n\n"),
    button,
  });

  return {
    subject: `${kind}${about}`,
    text: lines.join("\n"),
    html,
    ...(recipient.audience === "dealer" && lead.email ? { replyTo: lead.email } : {}),
  };
}
