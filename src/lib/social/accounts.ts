import type { Payload, Where } from "payload";

import type { MetaAccount } from "@/lib/social/meta";
import { encryptToken } from "@/lib/social/secrets";

/**
 * A dealership's connected Page, from "Facebook said yes" to "Rynet can post there".
 *
 * Facebook hands back every Page the person manages. Those are stored as offers (state
 * `pending`, tokens encrypted) until the dealership chooses one, which happens on its own when
 * there is only one. One Page per dealership, with the Instagram account linked to it: choosing
 * another replaces the first.
 *
 * WHOSE PAGE
 *
 * A dealership's (its id), or Rynet's own (null), connected by staff from Admin > Social so the
 * marketplace can post to its own followers. The same tables and the same publisher serve both.
 */

/** Rynet's own Pages have no dealership. */
export type Owner = number | null;

export const ownerWhere = (owner: Owner): Where =>
  owner === null ? { dealer: { exists: false } } : { dealer: { equals: owner } };

export async function offerAccounts(
  payload: Payload,
  dealerId: Owner,
  accounts: MetaAccount[],
): Promise<void> {
  await payload.db.deleteMany({
    collection: "social-accounts",
    where: { and: [ownerWhere(dealerId), { state: { equals: "pending" } }] },
  });
  for (const account of accounts) {
    await payload.create({
      collection: "social-accounts",
      data: {
        dealer: dealerId,
        network: account.network,
        externalId: account.externalId,
        displayName: account.displayName,
        pageId: account.pageId,
        token: encryptToken(account.pageToken),
        state: "pending",
      },
      overrideAccess: true,
    });
  }
}

type Row = {
  id: number;
  network: string;
  externalId: string;
  pageId?: string | null;
  state: string;
};

/** Makes one offered Page (and its Instagram) this dealership's connection. False if not offered. */
export async function choosePage(
  payload: Payload,
  dealerId: Owner,
  userId: number,
  pageId: string,
): Promise<boolean> {
  const rows = (
    await payload.find({
      collection: "social-accounts",
      where: ownerWhere(dealerId),
      depth: 0,
      limit: 100,
      overrideAccess: true,
    })
  ).docs as unknown as Row[];

  const chosen = rows.filter((row) => row.state === "pending" && row.pageId === pageId);
  if (chosen.length === 0) return false;

  // Whatever was connected before, and every offer not taken, goes.
  const leaving = rows.filter((row) => !chosen.includes(row));
  for (const row of leaving) {
    await payload.delete({ collection: "social-accounts", id: row.id, overrideAccess: true });
  }

  const now = new Date().toISOString();
  for (const row of chosen) {
    await payload.update({
      collection: "social-accounts",
      id: row.id,
      data: { state: "connected", connectedAt: now, connectedBy: userId, lastError: null },
      overrideAccess: true,
    });
  }
  return true;
}

/** Pages offered by more than one row are one Page: grouped for the "which Page?" question. */
export function groupOffers<T extends { pageId?: string | null; network: string }>(
  rows: T[],
): { pageId: string; facebook: T | null; instagram: T | null }[] {
  const pages = new Map<string, { pageId: string; facebook: T | null; instagram: T | null }>();
  for (const row of rows) {
    if (!row.pageId) continue;
    const entry = pages.get(row.pageId) ?? { pageId: row.pageId, facebook: null, instagram: null };
    if (row.network === "instagram") entry.instagram = row;
    else entry.facebook = row;
    pages.set(row.pageId, entry);
  }
  return [...pages.values()];
}
