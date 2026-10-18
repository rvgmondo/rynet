import config from "@payload-config";
import { getPayload } from "payload";

import { isPlatformStaff } from "@/access/roles";
import { portalApiSession } from "@/lib/portal/api-session";
import { choosePage, type Owner, offerAccounts } from "@/lib/social/accounts";
import { SocialApiError } from "@/lib/social/http";
import { metaApp, metaExchangeCode, metaListAccounts } from "@/lib/social/meta";
import { RYNET_OWNER, verifyState } from "@/lib/social/secrets";
import { callbackUrl, seeOther } from "@/lib/social/site";

/**
 * Where Facebook sends people back to, for a dealership connecting from its portal and for Rynet
 * staff connecting Rynet's own Page from the admin (one address, because Meta wants each one
 * registered). Two checks before anything is believed: the signed state, and that the person
 * signed in is the person the state names and is allowed to connect that owner's Page (the session
 * cookie is Lax, so it arrives on this top-level redirect). Then the code is swapped for a
 * long-lived token, and the Pages it can post to are offered, or connected straight away when
 * there is only one.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = verifyState(url.searchParams.get("state") ?? "");
  // Nothing in an unsigned state can be trusted, including which screen to go back to.
  if (!state) return seeOther("/portal/social?problem=expired");

  const forRynet = state.dealerId === RYNET_OWNER;
  const home = forRynet ? "/admin/social" : "/portal/social";
  const back = (query: string) => seeOther(`${home}?${query}`);

  const payload = await getPayload({ config });
  let owner: Owner;
  if (forRynet) {
    const { user } = await payload.auth({ headers: request.headers });
    if (!isPlatformStaff(user) || Number(user?.id) !== state.userId) {
      return back("problem=expired");
    }
    owner = null;
  } else {
    const auth = await portalApiSession(request, { manager: true });
    if (!auth.ok || auth.dealerId !== state.dealerId || Number(auth.user.id) !== state.userId) {
      return back("problem=expired");
    }
    owner = auth.dealerId;
  }

  // They pressed Cancel, or said no to a permission.
  if (url.searchParams.get("error")) return back("problem=declined");

  const code = url.searchParams.get("code");
  const app = metaApp();
  if (!code || !app) return back("problem=not-ready");

  try {
    const userToken = await metaExchangeCode(code, callbackUrl(), app);
    const accounts = await metaListAccounts(userToken);
    if (accounts.length === 0) return back("problem=no-pages");

    await offerAccounts(payload, owner, accounts);
    const pages = new Set(accounts.map((account) => account.pageId));
    if (pages.size === 1) {
      await choosePage(payload, owner, state.userId, [...pages][0] ?? "");
      return back("connected=1");
    }
    return back("choose=1");
  } catch (error) {
    payload.logger.warn({
      msg: "social connect failed",
      owner: owner ?? "rynet",
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof SocialApiError ? error.code : null,
    });
    return back("problem=failed");
  }
}
