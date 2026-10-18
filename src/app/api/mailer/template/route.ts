import { readDraft } from "@/lib/mail/draft-request";
import { staffOnly } from "@/lib/onboarding/staff-request";

/** Saves what is in the Mailer as a template, to start from next time. */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { draft, problems } = readDraft(body);
  const name = String(body.name ?? "").trim();
  if (!name) problems.push("Give the template a name.");
  if (problems.length > 0) return Response.json({ problems }, { status: 400 });

  const saved = await auth.payload.create({
    collection: "email-templates",
    data: {
      name,
      subject: draft.subject,
      body: draft.body,
      buttonLabel: draft.buttonLabel,
      buttonUrl: draft.buttonUrl,
    },
    overrideAccess: true,
  });
  return Response.json({ id: saved.id, name });
}
