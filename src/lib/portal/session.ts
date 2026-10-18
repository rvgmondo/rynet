import config from "@payload-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload, type Payload } from "payload";

import { dealerIdOf, isDealerStaff, isPlatformStaff } from "@/access/roles";
import type { Dealer, User } from "@/payload-types";

/**
 * Who is signed in to the dealer portal, and which dealership they belong to.
 *
 * THE ONE RULE THAT KEEPS DEALERSHIPS APART
 *
 * The dealership comes from the signed-in account, never from the address bar, a form field or
 * anything else the browser sends. Every read and write in the portal then goes through Payload
 * as that user (`overrideAccess: false`), so the access rules on each collection, the same ones
 * e2e/isolation.spec.ts attacks, decide what comes back. The portal adds no access logic of its
 * own to get wrong.
 */

export type PortalSession = {
  payload: Payload;
  user: User;
  dealerId: number;
  dealer: Dealer;
};

/** The signed-in dealership user, or a redirect to sign in. Staff are sent to the admin. */
export async function requirePortalSession(): Promise<PortalSession> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });

  if (user?.collection !== "users") redirect("/portal/sign-in");
  if (isPlatformStaff(user)) redirect("/admin");
  if (!isDealerStaff(user)) redirect("/portal/sign-in?reason=not-a-dealer");

  const dealerId = Number(dealerIdOf(user));
  if (!Number.isInteger(dealerId) || dealerId <= 0) redirect("/portal/sign-in?reason=no-dealer");

  const dealer = await payload
    .findByID({
      collection: "dealers",
      id: dealerId,
      depth: 1,
      user,
      overrideAccess: false,
    })
    .catch(() => null);
  if (!dealer) redirect("/portal/sign-in?reason=no-dealer");

  return { payload, user: user as User, dealerId, dealer: dealer as Dealer };
}

/** For pages that only need to know whether somebody is signed in, without redirecting. */
export async function currentPortalUser(): Promise<User | null> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return user && user.collection === "users" ? (user as User) : null;
}
