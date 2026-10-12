import config from "@payload-config";
import { getPayload, type Payload } from "payload";

import { isPlatformStaff } from "@/access/roles";

/**
 * The onboarding routes are for Rynet staff only, and it is the request's own session that says
 * so: its cookies are handed to Payload, which answers with the signed-in user or with nobody. A
 * dealership account is not platform staff and gets the same answer as a stranger.
 */
export async function staffOnly(
  request: Request,
): Promise<
  | { ok: true; payload: Payload; user: { name?: string | null; email?: string | null } }
  | { ok: false; response: Response }
> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!isPlatformStaff(user)) {
    return {
      ok: false,
      response: Response.json({ error: "Sign in as Rynet staff first." }, { status: 403 }),
    };
  }
  return { ok: true, payload, user: user as { name?: string | null; email?: string | null } };
}

/** A dealership id from a request, or null when it is not a positive whole number. */
export function dealerIdFrom(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
