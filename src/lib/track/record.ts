import config from "@payload-config";
import { getPayload } from "payload";

import { rateLimit, visitorKey } from "@/lib/rate-limit";

import { addView, flushIfDue, isCrawler, type PendingView } from "./views";

type Payload = Awaited<ReturnType<typeof getPayload>>;

/** The car a beacon names by its public reference, or nothing. */
async function vehicleFor(payload: Payload, body: unknown) {
  const raw = (body as { vehicleRef?: unknown } | null)?.vehicleRef;
  const ref = typeof raw === "string" ? raw.slice(0, 20) : null;
  if (!ref) return null;
  const found = await payload.find({
    collection: "vehicles",
    where: { publicRef: { equals: ref } },
    limit: 1,
    depth: 0,
  });
  const vehicle = found.docs[0];
  if (!vehicle) return null;
  const idOf = (value: unknown) =>
    typeof value === "number" ? value : ((value as { id?: number } | null)?.id ?? null);
  return { id: vehicle.id, dealer: idOf(vehicle.dealer), branch: idOf(vehicle.branch) };
}

/**
 * A tap that shows intent but leaves no details: a revealed phone number or a WhatsApp tap.
 *
 * It writes a lead with no personal details, because there are none to collect, rate limited per
 * hashed visitor so nobody can inflate a competitor's numbers. Callers always answer 204, whatever
 * happened: a failed count must never stand between a buyer and a dealership.
 */
export async function recordContactTap(
  request: Request,
  type: "phone_reveal" | "whatsapp_click",
  name: string,
): Promise<void> {
  const key = await visitorKey(request.headers, process.env.PAYLOAD_SECRET ?? "rynet");
  if (!rateLimit(`${type}:${key}`, 30, 10 * 60 * 1000).allowed) return;

  const payload = await getPayload({ config });
  const vehicle = await vehicleFor(payload, await request.json().catch(() => null));
  if (!vehicle) return;

  await payload.create({
    collection: "leads",
    data: {
      type,
      vehicle: vehicle.id,
      dealer: vehicle.dealer ?? undefined,
      branch: vehicle.branch ?? undefined,
      // The lead schema needs a name. There is no person attached to a tap, and inventing one
      // would put a fake contact in a dealership's inbox.
      name,
      status: "new",
    },
  });
}

/** Writes buffered views, adding to the day's row for each car or starting it. */
async function writeViews(payload: Payload, rows: PendingView[]): Promise<void> {
  for (const row of rows) {
    const found = await payload.find({
      collection: "car-views",
      where: { and: [{ vehicle: { equals: row.vehicle } }, { day: { equals: row.day } }] },
      limit: 1,
      depth: 0,
    });
    const existing = found.docs[0];
    if (existing) {
      await payload.update({
        collection: "car-views",
        id: existing.id,
        data: { views: (existing.views ?? 0) + row.views },
      });
    } else {
      await payload.create({
        collection: "car-views",
        data: {
          vehicle: row.vehicle,
          dealer: row.dealer ?? undefined,
          day: row.day,
          views: row.views,
        },
      });
    }
  }
}

/**
 * One person opening one car. Not counted for crawlers, for anyone signed in to the admin (Rynet
 * or dealership staff looking at their own stock), or twice for the same visitor and car on one day.
 */
export async function recordView(request: Request): Promise<void> {
  if (isCrawler(request.headers.get("user-agent"))) return;
  const key = await visitorKey(request.headers, process.env.PAYLOAD_SECRET ?? "rynet");
  if (!rateLimit(`view:${key}`, 120, 10 * 60 * 1000).allowed) return;

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers }).catch(() => ({ user: null }));
  if (user && user.collection === "users") return;

  const vehicle = await vehicleFor(payload, await request.json().catch(() => null));
  if (!vehicle) return;

  addView(key, vehicle.id, vehicle.dealer);
  await flushIfDue((rows) => writeViews(payload, rows));
}
