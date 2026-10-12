import { staffOnly } from "@/lib/onboarding/staff-request";
import { probeWebsite } from "@/lib/stock-import/probe";

/** "Can Rynet read this website?", before anyone tells the dealership it can. */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url)
    return Response.json({ error: "Paste the dealership's website address." }, { status: 400 });

  return Response.json(await probeWebsite(url));
}
