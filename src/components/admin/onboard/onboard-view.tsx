import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { readSignup } from "@/lib/dealer-signup-schema";

import { type DeskDealer, type DeskSignup, OnboardDesk, type Place } from "./onboard-desk";

/**
 * Admin > Onboard a dealership (`/admin/onboard`).
 *
 * The one screen staff use once a dealership has said yes: who they are, their cars, and the
 * message that tells them they are live. Everything a dealership would otherwise have to do
 * themselves happens here, by us, which is the whole of the onboarding offer.
 *
 * Wrapped in Payload's own page template so it has the same menu and the same sign-in check as
 * every other admin screen. Staff only: a dealership account never reaches the admin at all, and
 * this says so plainly rather than showing a form that every request behind it would refuse.
 */
export async function OnboardView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user)
    redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/onboard`)}`);

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
      <Gutter className="rn-admin-home rn-onboard">{children}</Gutter>
    </DefaultTemplate>
  );

  if (!isPlatformStaff(user)) {
    return template(
      <header className="rn-admin-home__head">
        <h1 className="rn-admin-home__title">Onboard a dealership</h1>
        <p className="rn-admin-home__lead">Only Rynet staff can onboard dealerships.</p>
      </header>,
    );
  }

  const [provinces, cities, dealers, signupLeads] = await Promise.all([
    payload.find({
      collection: "provinces",
      limit: 0,
      pagination: false,
      depth: 0,
      sort: "name",
      overrideAccess: true,
    }),
    payload.find({
      collection: "cities",
      limit: 0,
      pagination: false,
      depth: 0,
      sort: "name",
      overrideAccess: true,
    }),
    payload.find({
      collection: "dealers",
      where: {
        and: [
          { isDemonstration: { not_equals: true } },
          { verificationStatus: { not_equals: "archived" } },
        ],
      },
      limit: 0,
      pagination: false,
      depth: 0,
      sort: "tradingName",
      overrideAccess: true,
    }),
    payload.find({
      collection: "leads",
      where: {
        and: [{ type: { equals: "dealer_signup" } }, { status: { in: ["new", "contacted"] } }],
      },
      limit: 30,
      depth: 0,
      sort: "-createdAt",
      overrideAccess: true,
    }),
  ]);

  // Dealerships that asked to list from /list-your-stock and have not been onboarded yet.
  const signups: DeskSignup[] = (signupLeads.docs as unknown as Record<string, unknown>[]).map(
    (doc) => ({
      id: doc.id as number,
      contactName: String(doc.name ?? ""),
      phone: String(doc.phone ?? ""),
      email: (doc.email as string | null) ?? "",
      askedAt: String(doc.createdAt ?? ""),
      ...readSignup(doc.message as string | null),
    }),
  );

  const provinceList: Place[] = (provinces.docs as unknown as Record<string, unknown>[]).map(
    (doc) => ({ id: doc.id as number, name: String(doc.name ?? "") }),
  );
  const cityList: Place[] = (cities.docs as unknown as Record<string, unknown>[]).map((doc) => ({
    id: doc.id as number,
    name: String(doc.name ?? ""),
    parent: typeof doc.province === "number" ? doc.province : null,
  }));
  const dealerList: DeskDealer[] = (dealers.docs as unknown as Record<string, unknown>[]).map(
    (doc) => {
      const principal = (doc.principal ?? {}) as {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      };
      const feed = (doc.stockFeed ?? {}) as {
        websiteUrl?: string | null;
        readWebsite?: boolean | null;
      };
      return {
        id: doc.id as number,
        tradingName: String(doc.tradingName ?? ""),
        slug: String(doc.slug ?? ""),
        contactName: principal.name ?? null,
        contactEmail: principal.email ?? null,
        whatsapp: (doc.whatsappNumber as string | null) ?? principal.phone ?? null,
        websiteUrl: feed.websiteUrl ?? null,
        readsWebsite: feed.readWebsite === true,
      };
    },
  );

  const requested = Number(
    (searchParams as Record<string, string | string[] | undefined> | undefined)?.dealer,
  );
  const siteUrl = (payload.config.serverURL || "https://rynet.co.za").replace(/\/$/, "");

  return template(
    <>
      <header className="rn-admin-home__head">
        <h1 className="rn-admin-home__title">Onboard a dealership</h1>
        <p className="rn-admin-home__lead">
          They said yes. Fill in who they are, load their cars from their website or a spreadsheet,
          then send them their showroom. They do nothing.
        </p>
      </header>
      <OnboardDesk
        provinces={provinceList}
        cities={cityList}
        dealers={dealerList}
        signups={signups}
        initialDealerId={Number.isInteger(requested) && requested > 0 ? requested : null}
        siteUrl={siteUrl}
        adminRoute={adminRoute}
      />
    </>,
  );
}
