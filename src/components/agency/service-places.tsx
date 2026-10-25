import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { REVIEW_CTA } from "@/components/agency/agency-content";
import { SERVICES } from "@/content/agency/services";

/*
 * THE SEVEN SERVICES, AS THE PLACES THEY WORK ON. The hero breaks one car into the six places it
 * has to be right; this section puts a service against each of those places, drawn the same way
 * in miniature: the stock line, the website, the Google result, the ad, the photograph, the
 * WhatsApp enquiry and the month's report. Same example car, never a real dealership.
 *
 * Server-rendered and static. The pictures are decorative (aria-hidden); each tile's name is the
 * link, stretched over the tile, so the whole tile is one target and one tab stop.
 */

const PRICE = "R 474 900";

function Bakkie({ tone = "#c62a32" }: { tone?: string }) {
  return (
    <svg viewBox="0 0 240 90" className="rn-places__car" aria-hidden="true">
      <path
        d="M10 62 L10 47 Q11 41 19 40 L58 37 L78 17 Q81 13 88 13 L146 13 Q151 13 151 18 L151 40 L226 40 Q231 40 231 45 L231 62 Z"
        fill={tone}
      />
      <path d="M85 19 L110 19 L110 35 L71 35 Z M114 19 L145 19 L145 35 L114 35 Z" fill="#dbe4ef" />
      <circle cx="52" cy="64" r="15" fill="#0b1626" />
      <circle cx="196" cy="64" r="15" fill="#0b1626" />
    </svg>
  );
}

const PICTURES: Record<string, () => ReactNode> = {
  "dealership-websites": () => (
    <div className="rn-places__card">
      <p className="rn-places__bar">yourdealership.co.za</p>
      <Bakkie />
      <p className="rn-places__strong">2021 Hilux 2.8 GD-6</p>
      <p className="rn-places__price">{PRICE}</p>
    </div>
  ),
  "stock-feeds-and-inventory": () => (
    <div className="rn-places__card rn-places__card--code">
      {[
        ["2021 Hilux 2.8 GD-6", PRICE],
        ["2019 Polo Vivo 1.4", "R 189 900"],
        ["2022 Ranger XLT", "R 539 900"],
      ].map(([car, price]) => (
        <p key={car} className="rn-places__row">
          <span className="rn-places__ok" />
          <span>{car}</span>
          <span>{price}</span>
        </p>
      ))}
      <p className="rn-places__muted">Read 2 hours ago, 0 errors</p>
    </div>
  ),
  "paid-media": () => (
    <div className="rn-places__card">
      <p className="rn-places__muted">Your Dealership, Sponsored</p>
      <Bakkie tone="#4a5a70" />
      <p className="rn-places__split">
        <span className="rn-places__price">{PRICE}</span>
        <span className="rn-places__btn">Send message</span>
      </p>
    </div>
  ),
  "seo-and-local-search": () => (
    <div className="rn-places__card">
      <p className="rn-places__url">yourdealership.co.za</p>
      <p className="rn-places__link">Used bakkies for sale in Pretoria | Your Dealership</p>
      <p className="rn-places__muted">Open now, 8:00 to 17:00. 64 cars in stock.</p>
      <p className="rn-places__actions">
        <span>Directions</span>
        <span>Call</span>
        <span>Website</span>
      </p>
    </div>
  ),
  "photography-and-video": () => (
    <div className="rn-places__card rn-places__card--photo">
      <span className="rn-places__corner rn-places__corner--tl" />
      <span className="rn-places__corner rn-places__corner--tr" />
      <span className="rn-places__corner rn-places__corner--bl" />
      <span className="rn-places__corner rn-places__corner--br" />
      <Bakkie />
      <p className="rn-places__muted">Photo 1 of 24, front three quarter</p>
    </div>
  ),
  "crm-and-lead-routing": () => (
    <div className="rn-places__card rn-places__card--chat">
      <p className="rn-places__bubble">Is the Hilux still available?</p>
      <p className="rn-places__bubble rn-places__bubble--us">
        Yes, it is. When would you like to see it?
      </p>
      <p className="rn-places__muted">Routed to sales, answered in 4 minutes</p>
    </div>
  ),
  reporting: () => (
    <div className="rn-places__card">
      <p className="rn-places__strong">This month, in one page</p>
      {[
        ["Website", 72],
        ["Rynet", 58],
        ["Google", 40],
        ["Facebook", 30],
      ].map(([label, width]) => (
        <p key={label} className="rn-places__bars">
          <span>{label}</span>
          <span className="rn-places__track">
            <span style={{ width: `${width}%` }} />
          </span>
        </p>
      ))}
    </div>
  ),
};

export function ServicePlaces() {
  return (
    <ul className="rn-places">
      {SERVICES.map((service) => {
        const Picture = PICTURES[service.slug];
        return (
          <li key={service.slug} className="rn-places__tile group">
            <div className="rn-places__stage" aria-hidden="true">
              {Picture ? <Picture /> : null}
            </div>
            <div className="rn-places__body">
              <h3 className="rn-places__name">
                <Link href={`/digital/services/${service.slug}`} className="rn-places__link-cover">
                  {service.name}
                </Link>
              </h3>
              <p className="rn-places__summary">{service.summary}</p>
              <span className="rn-places__more" aria-hidden="true">
                How it works
                <ArrowRight className="size-4" />
              </span>
            </div>
          </li>
        );
      })}
      <li className="rn-places__tile rn-places__tile--ask">
        <div className="rn-places__body">
          <h3 className="rn-places__name">Not sure which you need?</h3>
          <p className="rn-places__summary">
            Most dealerships need three or four of these, and nobody needs all seven on day one. The
            free review tells you where to start.
          </p>
          <Link href={REVIEW_CTA.href} className="rn-link-arrow mt-3 self-start">
            {REVIEW_CTA.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </li>
    </ul>
  );
}
