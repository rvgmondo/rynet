import { dealerIdFrom, staffOnly } from "@/lib/onboarding/staff-request";
import { inviteDealerUser, inviteProblems, setPasswordPath } from "@/lib/portal/invite";

/**
 * Staff give a dealership its login: the account, and a link that lets them choose a password.
 * Asking again for the same person sends a fresh link and the old one stops working.
 *
 * Returns the path, not a whole address: the desk puts it on the address it is open on, the same
 * as a mockup link, so it is right on the live site, on staging and on a laptop.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const dealerId = dealerIdFrom(body.dealerId);
  if (!dealerId) return Response.json({ problems: ["Which dealership?"] }, { status: 400 });

  const input = {
    dealerId,
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone: typeof body.phone === "string" ? body.phone : null,
  };
  const problems = inviteProblems(input);
  if (problems.length > 0) return Response.json({ problems }, { status: 400 });

  const dealer = await auth.payload
    .findByID({ collection: "dealers", id: dealerId, depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!dealer)
    return Response.json({ problems: ["That dealership is not on Rynet."] }, { status: 404 });

  const result = await inviteDealerUser(auth.payload, input);
  if (!result.ok) return Response.json({ problems: [result.problem] }, { status: 409 });

  return Response.json({
    path: setPasswordPath(result.token),
    expiresAt: result.expiresAt,
    fresh: result.fresh,
    tradingName: dealer.tradingName,
  });
}
