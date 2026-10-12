import { dealerIdFrom, staffOnly } from "@/lib/onboarding/staff-request";
import { readWebsiteNow } from "@/lib/onboarding/stock";

/** Switches a dealership's website feed on and reads it now, in the background. */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { dealerId?: unknown; url?: unknown };
  const dealerId = dealerIdFrom(body.dealerId);
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!dealerId || !url) {
    return Response.json(
      { started: false, message: "Choose a dealership and paste their website." },
      { status: 400 },
    );
  }

  return Response.json(await readWebsiteNow(auth.payload, dealerId, url));
}
