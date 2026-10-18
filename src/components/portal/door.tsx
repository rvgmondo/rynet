import { Check } from "lucide-react";

import { RynetLockup, RynetMark } from "@/components/brand/rynet-mark";

/**
 * The way in: the navy half with the gauge turning slowly behind it, and the form beside it. Used
 * by sign-in and by choosing a password, which are the only two pages a stranger can reach.
 */
export function PortalDoor({ children }: { children: React.ReactNode }) {
  return (
    <div className="rn-portal-door">
      <section className="rn-portal-door__art" aria-label="Rynet for dealerships">
        <RynetMark className="rn-portal-door__gauge" tone="on-navy" detail="full" />
        <RynetLockup className="rn-portal-door__lockup" tone="on-navy" title="Rynet" />
        <p className="rn-portal-door__line">
          Your showroom, <em>your</em> buyers, in one place.
        </p>
        <ul className="rn-portal-door__points">
          <li>
            <Check aria-hidden="true" /> Every car you have live, and what buyers are asking about
            each one.
          </li>
          <li>
            <Check aria-hidden="true" /> Mark a car sold or change its price, and the site follows
            straight away.
          </li>
          <li>
            <Check aria-hidden="true" /> Ready-made ads of your cars for Facebook, Instagram and
            WhatsApp.
          </li>
        </ul>
      </section>
      <main id="main" className="rn-portal-door__panel">
        <div className="rn-portal-door__form">{children}</div>
      </main>
    </div>
  );
}
