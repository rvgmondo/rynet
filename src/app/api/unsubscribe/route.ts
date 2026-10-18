import config from "@payload-config";
import { getPayload } from "payload";

import { checkUnsubscribe, optOut } from "@/lib/mail/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058), pressed by the reader's mail app. A GET, which is a person
 * following the link by hand, goes to the page that asks them to confirm, because link scanners
 * in company mail systems open every link in a message and must not opt anybody out.
 */
export const dynamic = "force-dynamic";

const parse = (request: Request) => {
  const url = new URL(request.url);
  return { dealerId: Number(url.searchParams.get("d")), code: url.searchParams.get("t") ?? "" };
};

export async function POST(request: Request): Promise<Response> {
  const { dealerId, code } = parse(request);
  if (!checkUnsubscribe(dealerId, code)) return new Response("Not found.", { status: 404 });
  await optOut(await getPayload({ config }), dealerId);
  return new Response("You will not get these emails again.", { status: 200 });
}

export async function GET(request: Request): Promise<Response> {
  const { dealerId, code } = parse(request);
  return new Response(null, {
    status: 303,
    headers: { location: `/unsubscribe?d=${dealerId}&t=${encodeURIComponent(code)}` },
  });
}
