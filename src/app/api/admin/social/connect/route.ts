import { staffOnly } from "@/lib/onboarding/staff-request";
import { metaApp, metaAuthUrl, socialSetup } from "@/lib/social/meta";
import { RYNET_OWNER, signState } from "@/lib/social/secrets";
import { callbackUrl, seeOther } from "@/lib/social/site";

/** Connect Rynet's own Facebook Page (and its Instagram), from Admin > Social. Staff only. */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return seeOther("/admin/login?redirect=%2Fadmin%2Fsocial");
  const app = metaApp();
  if (!socialSetup().ready || !app) return seeOther("/admin/social?problem=not-ready");
  const userId = Number((auth.user as { id?: unknown }).id);
  return seeOther(metaAuthUrl(signState({ dealerId: RYNET_OWNER, userId }), callbackUrl(), app));
}
