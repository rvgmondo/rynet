import type { Payload } from "payload";

import { ownCaption } from "@/lib/ad-studio/caption";
import { dealerTown, toAdCar } from "@/lib/ad-studio/load";
import { photoBytes, storeAdImage, storeCarImage } from "@/lib/social/media";
import { nextAutoSlot } from "@/lib/social/slots";

/**
 * Putting posts in the queue. Two ways in, and src/lib/social/publisher.ts sends both.
 *
 *   queueManualPost   somebody at the dealership pressed Post in the portal. It goes now.
 *   queueAutoPosts    a car has just gone live, and the dealership asked for new cars to be
 *                     posted for them. It goes in the next free slot (lib/social/slots.ts).
 */

export const MAX_CAPTION = 2200;

type Account = { id: number; network: "facebook" | "instagram"; connectedAt?: string | null };

export async function queueManualPost(
  payload: Payload,
  input: {
    dealerId: number;
    userId: number;
    accounts: Account[];
    image: Buffer;
    caption: string;
    vehicleId: number | null;
  },
): Promise<number[]> {
  const imageFile = await storeAdImage(input.image);
  const now = new Date().toISOString();
  const ids: number[] = [];
  for (const account of input.accounts) {
    const row = await payload.create({
      collection: "social-posts",
      data: {
        dealer: input.dealerId,
        account: account.id,
        network: account.network,
        kind: "manual",
        vehicle: input.vehicleId,
        caption: input.caption.slice(0, MAX_CAPTION),
        imageFile,
        status: "queued",
        runAfter: now,
        attempts: 0,
        createdBy: input.userId,
      },
      overrideAccess: true,
    });
    ids.push(row.id as number);
  }
  return ids;
}

/**
 * Called when a car goes live. Posts it to every account of its dealership that has automatic
 * posting on, once per account, ever: a car that sells and comes back is not news twice. Only cars
 * that arrived after the account was connected, so switching it on does not post the whole
 * existing showroom. Never throws: a car going live must never fail because of a social post.
 */
export async function queueAutoPosts(payload: Payload, vehicleId: number): Promise<void> {
  try {
    const car = (await payload.findByID({
      collection: "vehicles",
      id: vehicleId,
      depth: 2,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
    if (car.status !== "live" || car.isDemonstration === true) return;

    const dealer = car.dealer as { id?: number; tradingName?: string; slug?: string } | null;
    const dealerId = Number(typeof dealer === "object" ? dealer?.id : dealer);
    if (!Number.isInteger(dealerId)) return;

    const accounts = await payload.find({
      collection: "social-accounts",
      where: {
        and: [
          { dealer: { equals: dealerId } },
          { state: { equals: "connected" } },
          { autoPost: { equals: true } },
        ],
      },
      depth: 0,
      limit: 10,
      overrideAccess: true,
    });
    const createdAt = new Date(String(car.createdAt ?? 0)).getTime();
    const eligible = (accounts.docs as unknown as Account[]).filter(
      (account) => !account.connectedAt || new Date(account.connectedAt).getTime() <= createdAt,
    );
    if (eligible.length === 0) return;

    const already = await payload.find({
      collection: "social-posts",
      where: { vehicle: { equals: vehicleId } },
      depth: 0,
      limit: 50,
      select: { account: true },
      overrideAccess: true,
    });
    const done = new Set(
      (already.docs as unknown as { account?: number | { id: number } | null }[]).map((row) =>
        row.account && typeof row.account === "object" ? row.account.id : row.account,
      ),
    );
    const todo = eligible.filter((account) => !done.has(account.id));
    if (todo.length === 0) return;

    const siteUrl = (process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za").replace(
      /\/$/,
      "",
    );
    const adCar = toAdCar(car, await dealerTown(payload, dealerId), siteUrl);
    const photo = adCar.photos[0];
    // No photograph, no post: a post of a grey box does more harm than none.
    if (!photo) return;

    const imageFile = await storeCarImage(await photoBytes(photo), {
      title: adCar.title,
      price: adCar.price,
      dealer: String(dealer?.tradingName ?? ""),
      domain: siteUrl.replace(/^https?:\/\//, ""),
    });

    for (const account of todo) {
      const booked = await payload.find({
        collection: "social-posts",
        where: {
          and: [
            { account: { equals: account.id } },
            { kind: { equals: "auto" } },
            { status: { not_equals: "failed" } },
            { runAfter: { greater_than: new Date(Date.now() - 2 * 86_400_000).toISOString() } },
          ],
        },
        depth: 0,
        limit: 100,
        select: { runAfter: true },
        overrideAccess: true,
      });
      const times = (booked.docs as unknown as { runAfter?: string | null }[])
        .map((row) => (row.runAfter ? new Date(row.runAfter) : null))
        .filter((date): date is Date => date !== null);

      await payload.create({
        collection: "social-posts",
        data: {
          dealer: dealerId,
          account: account.id,
          network: account.network,
          kind: "auto",
          vehicle: vehicleId,
          caption: ownCaption(adCar).slice(0, MAX_CAPTION),
          imageFile,
          status: "queued",
          runAfter: nextAutoSlot(times, new Date()).toISOString(),
          attempts: 0,
        },
        overrideAccess: true,
      });
    }
  } catch (error) {
    payload.logger.warn({ err: error, msg: "automatic social post not queued", vehicleId });
  }
}
