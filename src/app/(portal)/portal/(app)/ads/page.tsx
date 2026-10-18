import type { Metadata } from "next";
import { headers } from "next/headers";

import { canManageDealer } from "@/access/roles";
import { AdStudio, type StudioSocial } from "@/components/admin/ad-studio/ad-studio";
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

  const accounts = await session.payload.find({
    collection: "social-accounts",
    where: {
      and: [{ dealer: { equals: session.dealerId } }, { state: { equals: "connected" } }],
    },
    depth: 0,
    limit: 10,
    user: session.user,
    overrideAccess: false,
  });
  const social: StudioSocial = {
    // Facebook first: it is the Page people connected, and Instagram comes with it.
    accounts: (accounts.docs as unknown as StudioSocial["accounts"])
      .map((account) => ({
        id: account.id,
        network: account.network,
        displayName: account.displayName,
      }))
      .sort((a, b) => a.network.localeCompare(b.network)),
    canPost: canManageDealer(session.user),
  };

  return (
    <>
      <header className="rn-portal-head">
        <div>
          <p className="rn-portal-head__eyebrow">Ads</p>
          <h1 className="rn-portal-head__title">Ready to post</h1>
          <p className="rn-portal-head__lead">
            An ad of any of your cars, in the sizes Facebook, Instagram and WhatsApp want, with the
            words to go with it. Pick a car, check the words, and post it or download it.
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
          social={social}
          emptyText="You have no live cars with photographs yet, so there is nothing to make an ad of. They appear here as soon as your cars are live."
        />
      ) : null}
    </>
  );
}
