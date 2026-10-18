import { readDraft } from "@/lib/mail/draft-request";
import { mailServerReady, startMailing } from "@/lib/mail/mailer";
import { staffOnly } from "@/lib/onboarding/staff-request";

/**
 * Send: records the mailing and one delivery per dealership picked, then the sender works
 * through them at its pace. Without a mail server they wait, and the screen says so.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { draft, problems } = readDraft(body);
  const dealerIds = (Array.isArray(body.dealerIds) ? body.dealerIds : [])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  if (dealerIds.length === 0) problems.push("Choose at least one dealership.");
  if (problems.length > 0) return Response.json({ problems }, { status: 400 });

  const result = await startMailing(auth.payload, {
    ...draft,
    dealerIds,
    audience: String(body.audience ?? `${dealerIds.length} dealerships`).slice(0, 200),
    userId: Number((auth.user as { id?: unknown }).id),
  });
  return Response.json({ ...result, mailServer: mailServerReady() });
}
