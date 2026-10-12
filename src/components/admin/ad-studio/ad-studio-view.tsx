import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { isPlatformStaff } from "@/access/roles";
import type { AdCar, AdDealer } from "@/lib/ad-studio/caption";
import { vehicleUrl } from "@/lib/urls";
import { pick } from "@/lib/vehicle-photo";
import type { Media } from "@/payload-types";

import { AdStudio } from "./ad-studio";

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

const nameOf = (value: unknown): string | null =>
  value && typeof value === "object" && "name" in value
    ? String((value as { name?: unknown }).name ?? "") || null
    : null;

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

  const dealerDoc = (await payload
    .findByID({ collection: "dealers", id: dealerId, depth: 1, overrideAccess: true })
    .catch(() => null)) as Record<string, unknown> | null;
  if (!dealerDoc) return template(head("That dealership is not on Rynet."));

  const branch = await payload.find({
    collection: "branches",
    where: { dealer: { equals: dealerId } },
    sort: "-isPrimary",
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const town = nameOf((branch.docs[0] as Record<string, unknown> | undefined)?.city);

  const logo = dealerDoc.logo as Media | number | null | undefined;
  const logoUrl = logo && typeof logo === "object" ? (pick(logo, "card")?.url ?? null) : null;
  const slug = String(dealerDoc.slug ?? "");
  const dealer: AdDealer = {
    tradingName: String(dealerDoc.tradingName ?? ""),
    logoUrl,
    showroomUrl: `${siteUrl}/dealers/${slug}`,
    town,
  };

  const vehicles = await payload.find({
    collection: "vehicles",
    where: { and: [{ dealer: { equals: dealerId } }, { status: { equals: "live" } }] },
    sort: "-updatedAt",
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });

  const cars: AdCar[] = (vehicles.docs as unknown as Record<string, unknown>[])
    .map((doc) => {
      const gallery = (doc.gallery as { image?: Media | number | null }[] | null) ?? [];
      const photos = gallery
        .map((row) =>
          row.image && typeof row.image === "object" ? pick(row.image, "gallery")?.url : null,
        )
        .filter((url): url is string => Boolean(url))
        .slice(0, 3);
      const make = doc.make as { slug?: string } | null;
      const model = doc.model as { slug?: string } | null;
      return {
        id: doc.id as number,
        title: String(doc.title ?? ""),
        year: (doc.modelYear as number | null) ?? null,
        price: (doc.price as number | null) ?? null,
        mileageKm: (doc.mileageKm as number | null) ?? null,
        transmission: nameOf(doc.transmission),
        town,
        url: `${siteUrl}${vehicleUrl({
          makeSlug: make?.slug ?? "",
          modelSlug: model?.slug ?? "",
          modelYear: (doc.modelYear as number | null) ?? 0,
          variantName: nameOf(doc.variant),
          publicRef: String(doc.publicRef ?? ""),
        })}`,
        photos,
      };
    })
    .filter((car) => car.photos.length > 0);

  return template(
    <>
      {head(
        `Ready-to-post ads of ${dealer.tradingName}'s cars, for their Facebook, Instagram and WhatsApp. Pick a car, download, send.`,
      )}
      <AdStudio dealer={dealer} cars={cars} totalLive={vehicles.totalDocs} siteUrl={siteUrl} />
    </>,
  );
}
