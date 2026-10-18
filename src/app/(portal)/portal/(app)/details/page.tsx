import { KeyRound } from "lucide-react";
import type { Metadata } from "next";

import { canManageDealer } from "@/access/roles";
import { DetailsForm } from "@/components/portal/details-form";
import { COMPANY } from "@/content/company";
import { requirePortalSession } from "@/lib/portal/session";

export const metadata: Metadata = { title: "Your details" };

export default async function PortalDetails() {
  const { dealer, user } = await requirePortalSession();
  const principal = dealer.principal ?? {};

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">Your details</p>
          <h1 className="rn-portal-head__title">How buyers reach you</h1>
          <p className="rn-portal-head__lead">
            Your name, address, opening hours and logo are kept by Rynet so they stay right
            everywhere they appear. To change any of them, email{" "}
            <a className="rn-link" href={`mailto:${COMPANY.infoEmail}`}>
              {COMPANY.infoEmail}
            </a>
            .
          </p>
        </div>
      </header>

      <div className="rn-portal-grid2">
        <section className="rn-portal-card" aria-labelledby="details-contact">
          <div className="rn-portal-card__head">
            <h2 id="details-contact" className="rn-portal-card__title">
              Contact
            </h2>
          </div>
          <div className="rn-portal-card__body">
            <DetailsForm
              canEdit={canManageDealer(user)}
              values={{
                whatsappNumber: dealer.whatsappNumber ?? "",
                principalName: principal.name ?? "",
                principalEmail: principal.email ?? "",
                principalPhone: principal.phone ?? "",
                rynetEmails: dealer.emailOptOut !== true,
              }}
            />
          </div>
        </section>

        <section className="rn-portal-card" aria-labelledby="details-login">
          <div className="rn-portal-card__head">
            <h2 id="details-login" className="rn-portal-card__title">
              Your login
            </h2>
          </div>
          <div className="rn-portal-card__body grid gap-3 text-sm">
            <p>
              Signed in as <strong className="text-heading">{user.email}</strong>.
            </p>
            <p>
              A second step at sign-in, from an app on your phone, means a stolen password on its
              own gets nobody into your enquiries.
            </p>
            <p>
              <a className="rn-btn rn-btn--outline rn-btn--sm" href="/account/two-factor">
                <KeyRound aria-hidden="true" />
                {user.twoFactorEnabled ? "Two-factor is on" : "Turn on two-factor"}
              </a>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
