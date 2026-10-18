import type { Metadata } from "next";
import Link from "next/link";

import { LeadRow } from "@/components/portal/lead-row";
import { portalLeads } from "@/lib/portal/data";
import { requirePortalSession } from "@/lib/portal/session";

export const metadata: Metadata = { title: "Enquiries" };

const TABS = [
  { id: "all", label: "All", status: undefined },
  { id: "new", label: "New", status: "new" },
  { id: "contacted", label: "Contacted", status: "contacted" },
  { id: "appointment_set", label: "Appointment booked", status: "appointment_set" },
  { id: "sold", label: "Sale made", status: "sold" },
] as const;

export default async function PortalEnquiries({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const session = await requirePortalSession();
  const { show } = await searchParams;
  const tab = TABS.find((each) => each.id === show) ?? TABS[0];
  const { leads, total } = await portalLeads(session, { status: tab.status, limit: 200 });
  const now = new Date();

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">Enquiries</p>
          <h1 className="rn-portal-head__title">Buyers asking about your cars</h1>
          <p className="rn-portal-head__lead">
            The quickest reply usually wins the sale. WhatsApp opens with a first line already
            written, and moving an enquiry along keeps the whole team on the same page.
          </p>
        </div>
      </header>

      <nav className="rn-portal-tabs" aria-label="Which enquiries">
        {TABS.map((each) => (
          <Link
            key={each.id}
            href={each.id === "all" ? "/portal/enquiries" : `/portal/enquiries?show=${each.id}`}
            className="rn-portal-tab"
            aria-current={each.id === tab.id ? "page" : undefined}
          >
            {each.label}
          </Link>
        ))}
      </nav>

      <section className="rn-portal-card" aria-label={`${tab.label} enquiries`}>
        {leads.length > 0 ? (
          <ul className="rn-portal-list">
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} now={now} />
            ))}
          </ul>
        ) : (
          <p className="rn-portal-empty">
            {tab.id === "all" ? "No enquiries yet." : "None here right now."}
          </p>
        )}
        {total > leads.length ? (
          <p className="rn-portal-card__body text-sm text-muted">
            Showing the latest {leads.length} of {total}.
          </p>
        ) : null}
      </section>
    </>
  );
}
