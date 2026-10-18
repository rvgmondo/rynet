import { ExternalLink } from "lucide-react";

import { RynetLockup, RynetMark } from "@/components/brand/rynet-mark";
import { SkipLink } from "@/components/layout/skip-link";
import { PortalNav, SignOutButton } from "@/components/portal/portal-nav";
import { requirePortalSession } from "@/lib/portal/session";
import { dealerUrl } from "@/lib/urls";

/** Everything here belongs to whoever is signed in, so nothing is ever prerendered or cached. */
export const dynamic = "force-dynamic";

/**
 * The signed-in frame: the navy rail with the dealership's name, the pages, and sign out.
 * requirePortalSession sends anybody else to sign in before a byte of this renders.
 */
export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const { payload, user, dealerId, dealer } = await requirePortalSession();

  const fresh = await payload.count({
    collection: "leads",
    where: { and: [{ dealer: { equals: dealerId } }, { status: { equals: "new" } }] },
    user,
    overrideAccess: false,
  });

  const verified = dealer.verificationStatus === "verified";

  return (
    <>
      <SkipLink />
      <div className="rn-portal">
        <aside className="rn-portal-rail">
          <RynetMark className="rn-portal-rail__gauge" tone="on-navy" detail="full" />
          <div className="rn-portal-rail__brand">
            <a href="/portal" aria-label="Rynet for dealerships, overview">
              <RynetLockup className="rn-portal-rail__lockup" tone="on-navy" />
            </a>
            <span className="rn-portal-rail__tag">Dealers</span>
          </div>
          <div className="rn-portal-rail__dealer">
            <p className="rn-portal-rail__dealer-label">Your dealership</p>
            <p className="rn-portal-rail__dealer-name">{dealer.tradingName}</p>
            {verified && dealer.slug ? (
              <a
                className="rn-portal-rail__dealer-link"
                href={dealerUrl(dealer.slug)}
                target="_blank"
                rel="noreferrer"
              >
                See your showroom <ExternalLink aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <PortalNav newEnquiries={fresh.totalDocs} />
          <SignOutButton className="rn-portal-rail__signout rn-portal-rail__signout--mobile" />
          <div className="rn-portal-rail__foot">
            <p>
              Signed in as <span className="rn-portal-rail__who">{user.name}</span>
            </p>
            <SignOutButton className="rn-portal-rail__signout" />
          </div>
        </aside>
        <main id="main" tabIndex={-1} className="rn-portal-main">
          <div className="rn-portal-page">{children}</div>
        </main>
      </div>
    </>
  );
}
