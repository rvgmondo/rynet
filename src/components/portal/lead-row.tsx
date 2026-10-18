import { Mail, MessageCircle, Phone } from "lucide-react";

import { changeEnquiryState } from "@/app/actions/portal";
import { whenLabel } from "@/lib/admin-time";
import { whatsappLink, whatsappNumber } from "@/lib/onboarding/whatsapp";
import { LEAD_STATE_LABELS, LEAD_TYPE_LABELS, type PortalLead } from "@/lib/portal/data";

const NEXT_STEPS = ["contacted", "appointment_set", "sold", "lost"] as const;

/** One enquiry: who, about what, what they said, how to reach them, and how far it has got. */
export function LeadRow({ lead, now }: { lead: PortalLead; now: Date }) {
  const number = whatsappNumber(lead.phone);
  const first = lead.name.trim().split(/\s+/)[0] ?? "";
  const about = lead.carTitle ? ` about the ${lead.carTitle}` : "";
  const hello = `Hi${first ? ` ${first}` : ""}, thanks for your enquiry on Rynet${about}.`;
  return (
    <li className={`rn-portal-lead${lead.status === "new" ? " rn-portal-lead--new" : ""}`}>
      <div className="min-w-0">
        <p className="rn-portal-lead__who">{lead.name || "No name given"}</p>
        <p className="rn-portal-lead__about">
          {LEAD_TYPE_LABELS[lead.type] ?? "Enquiry"}
          {lead.carTitle ? `: ${lead.carTitle}` : ""}
        </p>
        {lead.message ? <p className="rn-portal-lead__message">{lead.message}</p> : null}
        <div className="rn-portal-lead__contact">
          {number ? (
            <a
              className="rn-btn rn-btn--sm rn-btn--outline"
              href={whatsappLink(number, hello)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" /> WhatsApp
            </a>
          ) : null}
          {lead.phone ? (
            <a className="rn-btn rn-btn--sm rn-btn--outline" href={`tel:${lead.phone}`}>
              <Phone aria-hidden="true" /> {lead.phone}
            </a>
          ) : null}
          {lead.email ? (
            <a className="rn-btn rn-btn--sm rn-btn--outline" href={`mailto:${lead.email}`}>
              <Mail aria-hidden="true" /> Email
            </a>
          ) : null}
        </div>
      </div>
      <div className="rn-portal-lead__side">
        <p className="rn-portal-lead__when">{whenLabel(lead.createdAt, now)}</p>
        <span className={`rn-portal-state${lead.status === "new" ? " rn-portal-state--sold" : ""}`}>
          {LEAD_STATE_LABELS[lead.status] ?? lead.status}
        </span>
        <form action={changeEnquiryState} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={lead.id} />
          <label htmlFor={`lead-${lead.id}`} className="sr-only">
            Progress of the enquiry from {lead.name}
          </label>
          <select
            id={`lead-${lead.id}`}
            name="status"
            className="rn-select !min-h-10 !w-auto"
            defaultValue={lead.status === "new" ? "contacted" : lead.status}
          >
            {NEXT_STEPS.map((step) => (
              <option key={step} value={step}>
                {LEAD_STATE_LABELS[step]}
              </option>
            ))}
            {lead.status !== "new" ? <option value="new">Back to new</option> : null}
          </select>
          <button type="submit" className="rn-btn rn-btn--sm rn-btn--secondary">
            Update
          </button>
        </form>
      </div>
    </li>
  );
}
