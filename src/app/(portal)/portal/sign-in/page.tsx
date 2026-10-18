import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isDealerStaff, isPlatformStaff } from "@/access/roles";
import { PortalDoor } from "@/components/portal/door";
import { PortalSignInForm } from "@/components/portal/sign-in-form";
import { COMPANY } from "@/content/company";
import { currentPortalUser } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  "not-a-dealer": "That account is not a dealership login.",
  "no-dealer": "That login is not linked to a dealership yet. Ask Rynet to sort it out.",
  "password-set": "Your password is set. Sign in with it now.",
  "signed-out": "You are signed out.",
};

export default async function PortalSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  // Somebody already signed in goes straight through, unless the portal has just sent them back
  // here with a reason, which would otherwise bounce them between the two for ever.
  if (!reason) {
    const user = await currentPortalUser();
    if (isDealerStaff(user)) redirect("/portal");
    if (isPlatformStaff(user)) redirect("/admin");
  }

  return (
    <PortalDoor>
      <PortalSignInForm notice={reason ? (NOTICES[reason] ?? null) : null} />
      <p className="rn-portal-door__small">
        No login yet, or forgotten your password? Email{" "}
        <a href={`mailto:${COMPANY.infoEmail}`}>{COMPANY.infoEmail}</a> or reply to us on WhatsApp
        and we will send you a link to choose a new one.
      </p>
    </PortalDoor>
  );
}
