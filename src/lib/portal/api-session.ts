import config from "@payload-config";
import { getPayload, type Payload } from "payload";

import { canManageDealer, dealerIdOf, isDealerStaff } from "@/access/roles";
import type { User } from "@/payload-types";

/**
 * requirePortalSession for route handlers, which answer with a status rather than a redirect.
 * The same rule: the dealership is the signed-in account's own, never anything the request says.
 */
export async function portalApiSession(
  request: Request,
  options: { manager?: boolean } = {},
): Promise<
  { ok: true; payload: Payload; user: User; dealerId: number } | { ok: false; response: Response }
> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  const dealerId = Number(dealerIdOf(user));
  if (!isDealerStaff(user) || !Number.isInteger(dealerId) || dealerId <= 0) {
    return {
      ok: false,
      response: Response.json({ error: "Sign in to your dealership first." }, { status: 401 }),
    };
  }
  if (options.manager && !canManageDealer(user)) {
    return {
      ok: false,
      response: Response.json(
        { error: "Only the dealer principal or a manager can do that." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, payload, user: user as User, dealerId };
}
