import { createHmac, timingSafeEqual } from "node:crypto";

import type { Payload } from "payload";

/**
 * The "Stop these emails" link in every mailing: rynet.co.za/unsubscribe?d=<dealer>&t=<code>.
 *
 * The code is an HMAC of the dealership's id under the app's secret, so a link works without a
 * login (it is pressed from an inbox) and cannot be made for a dealership it was not sent to.
 * It never expires: a mailing from a year ago must still be able to say no.
 */

const secret = () => process.env.PAYLOAD_SECRET || "rynet-development-secret";

export function unsubscribeCode(dealerId: number): string {
  return createHmac("sha256", secret())
    .update(`unsubscribe:${dealerId}`)
    .digest("hex")
    .slice(0, 32);
}

export function checkUnsubscribe(dealerId: number, code: string): boolean {
  if (!Number.isInteger(dealerId) || dealerId <= 0 || !/^[a-f0-9]{32}$/.test(code)) return false;
  const expected = unsubscribeCode(dealerId);
  return timingSafeEqual(Buffer.from(code), Buffer.from(expected));
}

export function unsubscribeUrl(siteUrl: string, dealerId: number): string {
  return `${siteUrl}/unsubscribe?d=${dealerId}&t=${unsubscribeCode(dealerId)}`;
}

/**
 * The address in the List-Unsubscribe header, which Gmail and Apple Mail press for the reader
 * with a POST ("one click"). A route rather than the page, because a page cannot answer a POST.
 */
export function oneClickUrl(siteUrl: string, dealerId: number): string {
  return `${siteUrl}/api/unsubscribe?d=${dealerId}&t=${unsubscribeCode(dealerId)}`;
}

/** Records the opt-out. Straight to the row: there is nobody signed in to check access for. */
export async function optOut(payload: Payload, dealerId: number): Promise<boolean> {
  const dealer = await payload
    .findByID({ collection: "dealers", id: dealerId, depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!dealer) return false;
  await payload.db.updateOne({ collection: "dealers", id: dealerId, data: { emailOptOut: true } });
  return true;
}
