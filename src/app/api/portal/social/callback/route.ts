import { portalApiSession } from "@/lib/portal/api-session";
import { choosePage, offerAccounts } from "@/lib/social/accounts";
import { SocialApiError } from "@/lib/social/http";
import { metaApp, metaExchangeCode, metaListAccounts } from "@/lib/social/meta";
import { verifyState } from "@/lib/social/secrets";
import { callbackUrl, seeOther } from "@/lib/social/site";

/**
 * Where Facebook sends the dealership back to. Two checks before anything is believed: the signed
 * state, and that the person signed in is the person the state names (the session cookie is Lax,
 * so it arrives on this top-level redirect). Then the code is swapped for a long-lived token, and
 * the Pages it can post to are offered, or connected straight away when there is only one.
 */
export const dynamic = "force-dynamic";

const back = (query: string) => seeOther(`/portal/social?${query}`);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = verifyState(url.searchParams.get("state") ?? "");
  if (!state) return back("problem=expired");

  const auth = await portalApiSession(request, { manager: true });
  if (!auth.ok || auth.dealerId !== state.dealerId || Number(auth.user.id) !== state.userId) {
    return back("problem=expired");
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

    await offerAccounts(auth.payload, auth.dealerId, accounts);
    const pages = new Set(accounts.map((account) => account.pageId));
    if (pages.size === 1) {
      await choosePage(auth.payload, auth.dealerId, state.userId, [...pages][0] ?? "");
      return back("connected=1");
    }
    return back("choose=1");
  } catch (error) {
    auth.payload.logger.warn({
      msg: "social connect failed",
      dealer: auth.dealerId,
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof SocialApiError ? error.code : null,
    });
    return back("problem=failed");
  }
}
