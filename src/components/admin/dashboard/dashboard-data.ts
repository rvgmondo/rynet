import type { PayloadRequest, SanitizedPermissions, Where } from "payload";

import { readLabel } from "@/components/admin/nav/nav-groups";

/**
 * Everything the admin home screen shows, read through the Local API as the signed-in person.
 *
 * Every query passes the request and `overrideAccess: false`, so the numbers are exactly what
 * this person's own access rules allow, the same as the lists they link to. A count that cannot
 * be read is left out rather than shown as a guess. Nothing here writes.
 */

/** Taps that leave no name or message. Counted, but not as enquiries. */
export const CLICK_TYPES = ["whatsapp_click", "phone_reveal"] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type LatestEnquiry = {
  id: string | number;
  name: string;
  kind: string;
  dealership: string | null;
  isNew: boolean;
  createdAt: string;
};

export type RecentCar = {
  id: string | number;
  name: string;
  status: string | null;
  statusLabel: string;
  dealership: string | null;
  updatedAt: string;
};

export type DashboardData = {
  weekAgo: Date;
  liveCars: number | null;
  draftCars: number | null;
  enquiriesThisWeek: number | null;
  clicksThisWeek: number | null;
  dealershipsWaiting: number | null;
  exampleCars: number | null;
  exampleDealerships: number | null;
  latestEnquiries: LatestEnquiry[] | null;
  recentCars: RecentCar[] | null;
};

type Doc = Record<string, unknown>;

function nameOf(value: unknown, key: string): string | null {
  if (value && typeof value === "object") {
    const name = (value as Doc)[key];
    if (typeof name === "string" && name.trim().length > 0) return name.trim();
  }
  return null;
}

/** The label an option VALUE is shown with in the admin, read from the collection itself. */
export function optionLabeller(
  req: PayloadRequest,
  collection: "leads" | "vehicles",
  fieldName: string,
): (value: unknown) => string {
  const field = req.payload.collections[collection]?.config.flattenedFields.find(
    (f) => "name" in f && f.name === fieldName,
  );
  const options =
    field && "options" in field && Array.isArray(field.options) ? field.options : ([] as unknown[]);
  return (value: unknown) => {
    for (const option of options) {
      if (typeof option === "string" && option === value) return option;
      if (option && typeof option === "object" && (option as Doc).value === value) {
        return readLabel((option as Doc).label, req.i18n, String(value));
      }
    }
    return typeof value === "string" ? value : "Not set";
  };
}

export async function loadDashboardData({
  req,
  permissions,
  now,
}: {
  req: PayloadRequest;
  permissions: SanitizedPermissions | undefined;
  now: Date;
}): Promise<DashboardData> {
  const { payload } = req;
  const canRead = (slug: "vehicles" | "leads" | "dealers") =>
    Boolean(permissions?.collections?.[slug]?.read);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const count = async (collection: "vehicles" | "leads" | "dealers", where: Where) => {
    if (!canRead(collection)) return null;
    const result = await payload.count({ collection, where, req, overrideAccess: false });
    return result.totalDocs;
  };

  const kindLabel = optionLabeller(req, "leads", "type");
  const statusLabel = optionLabeller(req, "vehicles", "status");

  const latestEnquiries = async (): Promise<LatestEnquiry[] | null> => {
    if (!canRead("leads")) return null;
    const result = await payload.find({
      collection: "leads",
      where: { type: { not_in: [...CLICK_TYPES] } },
      sort: "-createdAt",
      limit: 5,
      depth: 1,
      pagination: false,
      select: { name: true, type: true, status: true, dealer: true, createdAt: true },
      populate: { dealers: { tradingName: true } },
      req,
      overrideAccess: false,
    });
    return result.docs.map((doc) => ({
      id: doc.id,
      name: typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : "No name given",
      kind: kindLabel(doc.type),
      dealership: nameOf(doc.dealer, "tradingName"),
      isNew: doc.status === "new",
      createdAt: String(doc.createdAt),
    }));
  };

  const recentCars = async (): Promise<RecentCar[] | null> => {
    if (!canRead("vehicles")) return null;
    const result = await payload.find({
      collection: "vehicles",
      sort: "-updatedAt",
      limit: 5,
      depth: 1,
      pagination: false,
      select: {
        title: true,
        modelYear: true,
        make: true,
        model: true,
        variant: true,
        status: true,
        dealer: true,
        updatedAt: true,
      },
      populate: {
        makes: { name: true },
        models: { name: true },
        variants: { name: true },
        dealers: { tradingName: true },
      },
      req,
      overrideAccess: false,
    });
    return result.docs.map((doc) => {
      // Built from the linked make, model and variant rather than the stored title, so the
      // name is right even where a stored title is not.
      const built = [
        typeof doc.modelYear === "number" ? String(doc.modelYear) : null,
        nameOf(doc.make, "name"),
        nameOf(doc.model, "name"),
        nameOf(doc.variant, "name"),
      ]
        .filter(Boolean)
        .join(" ");
      const title = typeof doc.title === "string" ? doc.title.trim() : "";
      return {
        id: doc.id,
        name: built || title || "Car with no details yet",
        status: typeof doc.status === "string" ? doc.status : null,
        statusLabel: statusLabel(doc.status),
        dealership: nameOf(doc.dealer, "tradingName"),
        updatedAt: String(doc.updatedAt),
      };
    });
  };

  const since = weekAgo.toISOString();

  const [
    liveCars,
    draftCars,
    enquiriesThisWeek,
    clicksThisWeek,
    dealershipsWaiting,
    exampleCars,
    exampleDealerships,
    enquiries,
    cars,
  ] = await Promise.all([
    count("vehicles", { status: { equals: "live" } }),
    count("vehicles", { status: { equals: "draft" } }),
    count("leads", {
      and: [{ type: { not_in: [...CLICK_TYPES] } }, { createdAt: { greater_than_equal: since } }],
    }),
    count("leads", {
      and: [{ type: { in: [...CLICK_TYPES] } }, { createdAt: { greater_than_equal: since } }],
    }),
    count("dealers", { verificationStatus: { equals: "pending" } }),
    count("vehicles", { isDemonstration: { equals: true } }),
    count("dealers", { isDemonstration: { equals: true } }),
    latestEnquiries(),
    recentCars(),
  ]);

  return {
    weekAgo,
    liveCars,
    draftCars,
    enquiriesThisWeek,
    clicksThisWeek,
    dealershipsWaiting,
    exampleCars,
    exampleDealerships,
    latestEnquiries: enquiries,
    recentCars: cars,
  };
}
