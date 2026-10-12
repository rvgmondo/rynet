import { dealerIdFrom, staffOnly } from "@/lib/onboarding/staff-request";
import { stockStatus } from "@/lib/onboarding/stock";

/** How a dealership's cars are coming along, for the onboarding screen to ask every few seconds. */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const dealerId = dealerIdFrom(new URL(request.url).searchParams.get("dealerId"));
  if (!dealerId) return Response.json({ error: "Which dealership?" }, { status: 400 });

  return Response.json(await stockStatus(auth.payload, dealerId));
}
