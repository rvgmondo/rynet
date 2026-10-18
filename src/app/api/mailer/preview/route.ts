import { readDraft, sampleDealer } from "@/lib/mail/draft-request";
import { renderFor, siteUrlOf } from "@/lib/mail/mailer";
import { staffOnly } from "@/lib/onboarding/staff-request";

/** The email exactly as one dealership would get it, for the Mailer's preview. Staff only. */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { draft, problems } = readDraft(body);
  const dealer = await sampleDealer(auth.payload, body.dealerId);
  const email = renderFor(
    { ...draft, subject: draft.subject || "(No subject yet)", body: draft.body || " " },
    dealer,
    siteUrlOf(auth.payload),
  );
  return Response.json({
    subject: email.subject,
    html: email.html,
    problems,
    dealer: dealer.tradingName,
  });
}
