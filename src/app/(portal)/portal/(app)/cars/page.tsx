import type { Metadata } from "next";
import Link from "next/link";

import { CarRow } from "@/components/portal/car-row";
import { type CarTab, tabOf } from "@/lib/portal/cars";
import { portalCars } from "@/lib/portal/data";
import { requirePortalSession } from "@/lib/portal/session";

export const metadata: Metadata = { title: "Your cars" };

type Tab = { id: CarTab; label: string; empty: string };

const LIVE: Tab = { id: "live", label: "Live", empty: "No cars live right now." };

const TABS: Tab[] = [
  LIVE,
  { id: "reserved", label: "Reserved", empty: "Nothing reserved." },
  { id: "sold", label: "Sold", empty: "Nothing marked sold yet." },
  {
    id: "hidden",
    label: "Not showing",
    empty: "Every car you have is showing. Nothing is held back.",
  },
];

export default async function PortalCars({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; problem?: string }>;
}) {
  const session = await requirePortalSession();
  const { show, problem } = await searchParams;
  const tab = TABS.find((each) => each.id === show) ?? LIVE;

  const cars = await portalCars(session);
  const counts = new Map<CarTab, number>();
  for (const car of cars) counts.set(tabOf(car.status), (counts.get(tabOf(car.status)) ?? 0) + 1);
  const shown = cars.filter((car) => tabOf(car.status) === tab.id);
  const fromWebsite = cars.some((car) => car.fromWebsite);

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">Your cars</p>
          <h1 className="rn-portal-head__title">Stock on Rynet</h1>
          <p className="rn-portal-head__lead">
            Mark a car sold or reserved the moment it happens, and the site follows straight away.
            {fromWebsite
              ? " Cars read from your website keep their price and details from there: change them on your website and Rynet catches up within a few hours."
              : ""}
          </p>
        </div>
      </header>

      {problem ? (
        <p className="rn-portal-problem mb-6" role="alert">
          That car could not be changed: something on its listing needs fixing first, usually a
          photograph that is no longer there. Tell us on WhatsApp or at{" "}
          <a className="rn-link" href="mailto:info@rynet.co.za">
            info@rynet.co.za
          </a>{" "}
          and we will put it right.
        </p>
      ) : null}

      <nav className="rn-portal-tabs" aria-label="Which cars">
        {TABS.map((each) => (
          <Link
            key={each.id}
            href={each.id === "live" ? "/portal/cars" : `/portal/cars?show=${each.id}`}
            className="rn-portal-tab"
            aria-current={each.id === tab.id ? "page" : undefined}
          >
            {each.label} <span className="rn-portal-tab__count">{counts.get(each.id) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <section className="rn-portal-card" aria-label={`${tab.label} cars`}>
        {tab.id === "hidden" && shown.length > 0 ? (
          <p className="rn-portal-card__body text-sm text-muted">
            These are not on the site. Usually a car is missing a photograph or a price, or it has
            gone from your website. Rynet looks at these, and you can ask us about any of them.
          </p>
        ) : null}
        {shown.length > 0 ? (
          <ul className="rn-portal-list">
            {shown.map((car) => (
              <CarRow key={car.id} car={car} />
            ))}
          </ul>
        ) : (
          <p className="rn-portal-empty">{tab.empty}</p>
        )}
      </section>
    </>
  );
}
