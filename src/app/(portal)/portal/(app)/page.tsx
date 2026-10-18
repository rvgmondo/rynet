import type { Metadata } from "next";
import Link from "next/link";

import { CarRow } from "@/components/portal/car-row";
import { LeadRow } from "@/components/portal/lead-row";
import { firstName, greeting } from "@/lib/admin-time";
import { portalCars, portalCounts, portalLeads } from "@/lib/portal/data";
import { requirePortalSession } from "@/lib/portal/session";

export const metadata: Metadata = { title: "Overview" };

export default async function PortalHome() {
  const session = await requirePortalSession();
  const now = new Date();
  const [counts, recent, cars] = await Promise.all([
    portalCounts(session),
    portalLeads(session, { limit: 5 }),
    portalCars(session, { status: { equals: "live" } }),
  ]);
  const name = firstName(session.user.name);
  const busiest = [...cars].sort((a, b) => b.enquiries - a.enquiries).slice(0, 5);
  const waiting = counts.newLeads === 1 ? "One buyer is" : `${counts.newLeads} buyers are`;

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">{session.dealer.tradingName}</p>
          <h1 className="rn-portal-head__title">
            {greeting(now)}
            {name ? `, ${name}` : ""}.
          </h1>
          <p className="rn-portal-head__lead">
            {counts.newLeads > 0
              ? `${waiting} waiting to hear from you.`
              : "Nobody is waiting on you. Here is how your showroom is doing."}
          </p>
        </div>
      </header>

      <div className="rn-portal-stats">
        <Link
          href="/portal/enquiries?show=new"
          className={`rn-portal-stat${counts.newLeads > 0 ? " rn-portal-stat--hot" : ""}`}
        >
          <span className="rn-portal-stat__label">New enquiries</span>
          <span className="rn-portal-stat__value">{counts.newLeads}</span>
          <span className="rn-portal-stat__note">Not answered yet</span>
        </Link>
        <Link href="/portal/cars" className="rn-portal-stat">
          <span className="rn-portal-stat__label">Cars live</span>
          <span className="rn-portal-stat__value">{counts.live}</span>
          <span className="rn-portal-stat__note">On Rynet now</span>
        </Link>
        <Link href="/portal/enquiries" className="rn-portal-stat">
          <span className="rn-portal-stat__label">Enquiries</span>
          <span className="rn-portal-stat__value">{counts.monthLeads}</span>
          <span className="rn-portal-stat__note">In the last 30 days</span>
        </Link>
        <div className="rn-portal-stat">
          <span className="rn-portal-stat__label">WhatsApp and calls</span>
          <span className="rn-portal-stat__value">{counts.taps}</span>
          <span className="rn-portal-stat__note">Taps on your number, last 30 days</span>
        </div>
      </div>

      <div className="rn-portal-grid2">
        <section className="rn-portal-card" aria-labelledby="home-leads">
          <div className="rn-portal-card__head">
            <h2 id="home-leads" className="rn-portal-card__title">
              Latest enquiries
            </h2>
            <Link href="/portal/enquiries" className="rn-portal-card__link">
              All of them
            </Link>
          </div>
          {recent.leads.length > 0 ? (
            <ul className="rn-portal-list">
              {recent.leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} now={now} />
              ))}
            </ul>
          ) : (
            <p className="rn-portal-empty">
              No enquiries yet. They arrive here the moment a buyer sends one.
            </p>
          )}
        </section>

        <section className="rn-portal-card" aria-labelledby="home-cars">
          <div className="rn-portal-card__head">
            <h2 id="home-cars" className="rn-portal-card__title">
              Most asked about
            </h2>
            <Link href="/portal/cars" className="rn-portal-card__link">
              All your cars
            </Link>
          </div>
          {busiest.length > 0 ? (
            <ul className="rn-portal-list">
              {busiest.map((car) => (
                <CarRow key={car.id} car={car} compact />
              ))}
            </ul>
          ) : (
            <p className="rn-portal-empty">No cars live yet. Rynet is loading them for you.</p>
          )}
        </section>
      </div>
    </>
  );
}
