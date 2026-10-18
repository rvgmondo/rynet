import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { loadAdStudio } from "@/lib/ad-studio/load";

import { AdStudio, type StudioSocial } from "./ad-studio";

/**
 * Admin > Ad studio (`/admin/ad-studio?dealer=ID`).
 *
 * Ready-to-post ads of a dealership's cars, made in a click: the dealership gets something it can
 * use on its own Facebook page the same day, which is the part of the onboarding offer that pays
 * them back before Rynet has sent a single buyer.
 *
 * Live cars only, and only cars with a photograph: an ad of a car a buyer cannot find on Rynet,
 * or of a grey box, does more harm than none.
 */

export async function AdStudioView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user)
    redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/ad-studio`)}`);

  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className="rn-admin-home rn-onboard rn-studio">{children}</Gutter>
    </DefaultTemplate>
  );

  const head = (lead: string) => (
    <header className="rn-admin-home__head">
      <h1 className="rn-admin-home__title">Ad studio</h1>
      <p className="rn-admin-home__lead">{lead}</p>
    </header>
  );

  if (!isPlatformStaff(user)) return template(head("Only Rynet staff can make ads."));

  const siteUrl = (payload.config.serverURL || "https://rynet.co.za").replace(/\/$/, "");
  const query = searchParams as Record<string, string | string[] | undefined> | undefined;
  const dealerId = Number(query?.dealer);

  const dealers = await payload.find({
    collection: "dealers",
    where: {
      and: [
        { isDemonstration: { not_equals: true } },
        { verificationStatus: { equals: "verified" } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    sort: "tradingName",
    overrideAccess: true,
  });
  const choices = (dealers.docs as unknown as Record<string, unknown>[]).map((doc) => ({
    id: doc.id as number,
    tradingName: String(doc.tradingName ?? ""),
  }));

  if (!Number.isInteger(dealerId) || dealerId <= 0) {
    return template(
      <>
        {head("Choose a dealership to make ads of its cars.")}
        <ul className="rn-studio__dealers">
          {choices.map((choice) => (
            <li key={choice.id}>
              <a
                className="rn-onboard__button"
                href={`${adminRoute}/ad-studio?dealer=${choice.id}`}
              >
                {choice.tradingName}
              </a>
            </li>
          ))}
        </ul>
      </>,
    );
  }

  const data = await loadAdStudio(payload, dealerId, siteUrl, { overrideAccess: true });
  if (!data) return template(head("That dealership is not on Rynet."));
  const { dealer, cars, totalLive } = data;

  // Rynet's own Page and Instagram, for Post it. A dealership's own Page is theirs to post to.
  const rynetAccounts = (
    (
      await payload.find({
        collection: "social-accounts",
        where: { and: [{ dealer: { exists: false } }, { state: { equals: "connected" } }] },
        depth: 0,
        limit: 10,
        overrideAccess: true,
      })
    ).docs as unknown as StudioSocial["accounts"]
  )
    .map((account) => ({
      id: account.id,
      network: account.network,
      displayName: account.displayName,
    }))
    .sort((a, b) => a.network.localeCompare(b.network));

  return template(
    <>
      {head(
        `Ready-to-post ads of ${dealer.tradingName}'s cars, for their Facebook, Instagram and WhatsApp. Pick a car, download, send.`,
      )}
      <AdStudio
        dealer={dealer}
        cars={cars}
        totalLive={totalLive}
        siteUrl={siteUrl}
        social={{
          accounts: rynetAccounts,
          canPost: true,
          endpoint: "/api/admin/social/post",
          connectHref: `${adminRoute}/social`,
          whose: "Rynet's",
        }}
      />
    </>,
  );
}
