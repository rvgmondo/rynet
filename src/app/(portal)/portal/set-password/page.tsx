import config from "@payload-config";
import type { Metadata } from "next";
import { getPayload } from "payload";

import { PortalDoor } from "@/components/portal/door";
import { SetPasswordForm } from "@/components/portal/set-password-form";
import { COMPANY } from "@/content/company";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose your password",
  // The token is in the address. Never let it travel to another site in a Referer header.
  referrer: "no-referrer",
};

/**
 * Where an invite link lands. The link is checked before the form is shown, so somebody with an
 * old link is told so straight away rather than after typing a password twice. The check reads the
 * row directly: Payload hides the token from every API read, which is right, and also means the
 * only honest way to ask "is this one live?" is to ask the database.
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  let email: string | null = null;
  if (/^[a-f0-9]{40}$/.test(token)) {
    const payload = await getPayload({ config });
    const found = (await payload.db
      .findOne({
        collection: "users",
        where: {
          and: [
            { resetPasswordToken: { equals: token } },
            { resetPasswordExpiration: { greater_than: new Date().toISOString() } },
          ],
        },
      })
      .catch(() => null)) as { email?: string } | null;
    email = found?.email ?? null;
  }

  return (
    <PortalDoor>
      {email ? (
        <SetPasswordForm token={token} email={email} />
      ) : (
        <div>
          <h1 className="rn-portal-door__title">This link has ended</h1>
          <p className="rn-portal-door__lead">
            Links to choose a password work for a week, and only once. Ask us for a fresh one and it
            will be with you in a few minutes.
          </p>
          <p className="rn-portal-door__small">
            Email <a href={`mailto:${COMPANY.infoEmail}`}>{COMPANY.infoEmail}</a>, or reply to us on
            WhatsApp. Already chosen one? <a href="/portal/sign-in">Sign in</a>.
          </p>
        </div>
      )}
    </PortalDoor>
  );
}
