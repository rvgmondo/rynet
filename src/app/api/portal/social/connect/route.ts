import { portalApiSession } from "@/lib/portal/api-session";
import { metaApp, metaAuthUrl, socialSetup } from "@/lib/social/meta";
import { signState } from "@/lib/social/secrets";
import { callbackUrl, seeOther } from "@/lib/social/site";

/**
 * Connect: sends a dealer principal or manager to Facebook to choose their Page. The state that
 * goes with them is signed and names their dealership and them, so what comes back can only be
 * attached to the dealership that asked.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await portalApiSession(request, { manager: true });
  if (!auth.ok) return seeOther("/portal/sign-in");

  const setup = socialSetup();
  const app = metaApp();
  if (!setup.ready || !app) {
    return seeOther("/portal/social?problem=not-ready");
  }

  const state = signState({ dealerId: auth.dealerId, userId: Number(auth.user.id) });
  return Response.redirect(metaAuthUrl(state, callbackUrl(), app), 303);
}
