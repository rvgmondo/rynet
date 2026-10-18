import { inviteEmail } from "@/lib/mail/invite-email";
import { mailServerReady } from "@/lib/mail/mailer";
import { dealerIdFrom, staffOnly } from "@/lib/onboarding/staff-request";

/**
 * Emails the set-password link staff have just made on the desk. It only sends a link that is
 * the current one on that person's account at that dealership, so this cannot be used to email
 * anybody an arbitrary address.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const auth = await staffOnly(request);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const dealerId = dealerIdFrom(body.dealerId);
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const token = String(body.path ?? "").match(/token=([a-f0-9]{40})$/)?.[1];
  if (!dealerId || !email || !token) {
    return Response.json({ problems: ["Make the link first."] }, { status: 400 });
  }
  if (!mailServerReady()) {
    return Response.json(
      { problems: ["There is no mail server on this host yet. Send it on WhatsApp instead."] },
      { status: 409 },
    );
  }

  const user = (await auth.payload.db.findOne({
    collection: "users",
    where: {
      and: [
        { email: { equals: email } },
        { dealer: { equals: dealerId } },
        { resetPasswordToken: { equals: token } },
      ],
    },
  })) as { name?: string } | null;
  if (!user)
    return Response.json(
      { problems: ["That link is no longer the current one. Make a fresh one."] },
      { status: 409 },
    );

  const dealer = await auth.payload.findByID({
    collection: "dealers",
    id: dealerId,
    depth: 0,
    overrideAccess: true,
  });
  const origin = new URL(request.url).origin;
  const site = (auth.payload.config.serverURL || origin).replace(/\/$/, "");
  const message = inviteEmail({
    name: user.name ?? "",
    tradingName: String(dealer.tradingName ?? ""),
    link: `${site}/portal/set-password?token=${token}`,
  });
  await auth.payload.sendEmail({ to: email, ...message });
  return Response.json({ sentTo: email });
}
