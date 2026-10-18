import type { Metadata } from "next";
import { headers } from "next/headers";

import { AdStudio } from "@/components/admin/ad-studio/ad-studio";
import { loadAdStudio } from "@/lib/ad-studio/load";
import { requirePortalSession } from "@/lib/portal/session";

export const metadata: Metadata = { title: "Ads" };

/** The Ad studio, for the dealership's own cars, read as the dealership. */
export default async function PortalAds() {
  const session = await requirePortalSession();
  const host = (await headers()).get("host");
  const siteUrl = (
    session.payload.config.serverURL || (host ? `https://${host}` : "https://rynet.co.za")
  ).replace(/\/$/, "");

  const data = await loadAdStudio(session.payload, session.dealerId, siteUrl, {
    user: session.user,
    overrideAccess: false,
  });

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">Ads</p>
          <h1 className="rn-portal-head__title">Ready to post</h1>
          <p className="rn-portal-head__lead">
            An ad of any of your cars, in the sizes Facebook, Instagram and WhatsApp want, with the
            words to go with it. Pick a car, download, post.
          </p>
        </div>
      </header>
      {data ? (
        <AdStudio
          dealer={data.dealer}
          cars={data.cars}
          totalLive={data.totalLive}
          siteUrl={siteUrl}
          own
          emptyText="You have no live cars with photographs yet, so there is nothing to make an ad of. They appear here as soon as your cars are live."
        />
      ) : null}
    </>
  );
}
