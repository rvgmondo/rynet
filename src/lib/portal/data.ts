import type { Where } from "payload";

import type { PortalSession } from "@/lib/portal/session";
import { vehicleUrl } from "@/lib/urls";
import { pick } from "@/lib/vehicle-photo";
import type { Media } from "@/payload-types";

/**
 * What the portal pages read, always as the signed-in user (`overrideAccess: false`). The
 * dealership filter in each query is for the page's sake, so a sales agent's list is theirs and
 * not every public car on Rynet; the access rules underneath are what keep it honest.
 */

export type PortalCar = {
  id: number;
  title: string;
  status: string;
  price: number | null;
  photo: string | null;
  url: string | null;
  fromWebsite: boolean;
  enquiries: number;
  updatedAt: string;
};

export type PortalLead = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  type: string;
  status: string;
  carTitle: string | null;
  createdAt: string;
};

const nameOf = (value: unknown): string | null =>
  value && typeof value === "object" && "name" in value
    ? String((value as { name?: unknown }).name ?? "") || null
    : null;

/** Kinds of enquiry that leave no details: counted, never listed as somebody to call. */
const NO_DETAILS = ["whatsapp_click", "phone_reveal"];

export const LEAD_TYPE_LABELS: Record<string, string> = {
  enquiry: "Question about a car",
  test_drive: "Wants a test drive",
  finance: "Asked about finance",
  trade_in: "Wants to sell you a car",
  callback: "Asked for a call back",
  dealer_contact: "Contacted you",
};

export const LEAD_STATE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Serious buyer",
  appointment_set: "Appointment booked",
  sold: "Sale made",
  lost: "Lost",
};

export async function portalCars(session: PortalSession, where?: Where): Promise<PortalCar[]> {
  const { payload, user, dealerId } = session;
  const found = await payload.find({
    collection: "vehicles",
    where: { and: [{ dealer: { equals: dealerId } }, ...(where ? [where] : [])] },
    sort: "-updatedAt",
    limit: 500,
    depth: 1,
    user,
    overrideAccess: false,
  });
  const docs = found.docs as unknown as Record<string, unknown>[];
  if (docs.length === 0) return [];

  // One query for every car's enquiry count, not one per car.
  const leads = await payload.find({
    collection: "leads",
    where: {
      and: [
        { dealer: { equals: dealerId } },
        { vehicle: { in: docs.map((doc) => doc.id as number) } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    select: { vehicle: true },
    user,
    overrideAccess: false,
  });
  const counts = new Map<number, number>();
  for (const lead of leads.docs as unknown as { vehicle?: number | null }[]) {
    if (typeof lead.vehicle === "number") {
      counts.set(lead.vehicle, (counts.get(lead.vehicle) ?? 0) + 1);
    }
  }

  return docs.map((doc) => {
    const gallery = (doc.gallery as { image?: Media | number | null }[] | null) ?? [];
    const first = gallery.find((row) => row.image && typeof row.image === "object")?.image as
      | Media
      | undefined;
    const make = doc.make as { slug?: string } | null;
    const model = doc.model as { slug?: string } | null;
    const status = String(doc.status ?? "draft");
    const visible = status === "live" || status === "sold";
    return {
      id: doc.id as number,
      title: String(doc.title ?? "Untitled car"),
      status,
      price: (doc.price as number | null) ?? null,
      photo: first ? (pick(first, "thumbnail")?.url ?? null) : null,
      url:
        visible && make?.slug && model?.slug
          ? vehicleUrl({
              makeSlug: make.slug,
              modelSlug: model.slug,
              modelYear: (doc.modelYear as number | null) ?? 0,
              variantName: nameOf(doc.variant),
              publicRef: String(doc.publicRef ?? ""),
            })
          : null,
      fromWebsite: doc.sourceManaged === true,
      enquiries: counts.get(doc.id as number) ?? 0,
      updatedAt: String(doc.updatedAt ?? ""),
    };
  });
}

export async function portalLeads(
  session: PortalSession,
  options: { status?: string; limit?: number } = {},
): Promise<{ leads: PortalLead[]; total: number }> {
  const { payload, user, dealerId } = session;
  const found = await payload.find({
    collection: "leads",
    where: {
      and: [
        { dealer: { equals: dealerId } },
        { type: { not_in: NO_DETAILS } },
        ...(options.status ? [{ status: { equals: options.status } }] : []),
      ],
    },
    sort: "-createdAt",
    limit: options.limit ?? 100,
    depth: 1,
    user,
    overrideAccess: false,
  });
  const leads = (found.docs as unknown as Record<string, unknown>[]).map((doc) => {
    const vehicle = doc.vehicle as { title?: string } | number | null;
    return {
      id: doc.id as number,
      name: String(doc.name ?? ""),
      phone: (doc.phone as string | null) ?? null,
      email: (doc.email as string | null) ?? null,
      message: (doc.message as string | null) ?? null,
      type: String(doc.type ?? "enquiry"),
      status: String(doc.status ?? "new"),
      carTitle: vehicle && typeof vehicle === "object" ? (vehicle.title ?? null) : null,
      createdAt: String(doc.createdAt ?? ""),
    };
  });
  return { leads, total: found.totalDocs };
}

/** The counts on the overview, each one a single count query. */
export async function portalCounts(session: PortalSession) {
  const { payload, user, dealerId } = session;
  const count = (collection: "vehicles" | "leads", where: Where) =>
    payload
      .count({
        collection,
        where: { and: [{ dealer: { equals: dealerId } }, where] },
        user,
        overrideAccess: false,
      })
      .then((result) => result.totalDocs);

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [live, newLeads, monthLeads, taps] = await Promise.all([
    count("vehicles", { status: { equals: "live" } }),
    count("leads", { and: [{ status: { equals: "new" } }, { type: { not_in: NO_DETAILS } }] }),
    count("leads", {
      and: [{ createdAt: { greater_than: monthAgo } }, { type: { not_in: NO_DETAILS } }],
    }),
    count("leads", {
      and: [{ createdAt: { greater_than: monthAgo } }, { type: { in: NO_DETAILS } }],
    }),
  ]);
  return { live, newLeads, monthLeads, taps };
}
