import { readDraft, sampleDealer } from "@/lib/mail/draft-request";
import { sendTest } from "@/lib/mail/mailer";
import { staffOnly } from "@/lib/onboarding/staff-request";

/** A test copy, personalised for one dealership, to the member of staff who asked. */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { draft, problems } = readDraft(body);
  if (problems.length > 0) return Response.json({ problems }, { status: 400 });
  const to = auth.user.email;
  if (!to)
    return Response.json({ problems: ["Your account has no email address."] }, { status: 400 });

  const result = await sendTest(
    auth.payload,
    draft,
    await sampleDealer(auth.payload, body.dealerId),
    to,
  );
  if (result === "no-mail-server") {
    return Response.json(
      {
        problems: [
          "There is no mail server on this host yet, so nothing can be sent. Set SMTP_HOST in cPanel (docs/PRODUCTION-READINESS.md, section 1).",
        ],
      },
      { status: 409 },
    );
  }
  return Response.json({ sentTo: to });
}
