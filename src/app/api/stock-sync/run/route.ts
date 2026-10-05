import config from "@payload-config";
import { getPayload } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { runStockSync } from "@/lib/stock-import/schedule";

/**
 * "Read it now" from the admin home screen.
 *
 * Platform staff only, and it is the staff member's own session that says so: the request's
 * cookies are handed to Payload, which answers with the signed-in user or with nobody. A
 * dealership account is not platform staff and gets the same answer as a stranger.
 *
 * It runs the same pass the timer runs, including the lease, so pressing the button while a run is
 * busy does nothing but say so. The pass can take a few minutes on a full stock list, which is why
 * the button waits on the answer rather than pretending it finished.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });

  if (!isPlatformStaff(user)) {
    return Response.json({ ran: false, reason: "Sign in as Rynet staff first." }, { status: 403 });
  }

  const outcome = await runStockSync(payload, { force: true });
  return Response.json(outcome);
}
