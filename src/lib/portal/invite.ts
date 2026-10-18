import { randomBytes } from "node:crypto";

import type { Payload } from "payload";

import { isDealerStaff } from "@/access/roles";
import { INVITE_DAYS } from "@/lib/portal/invite-message";

export { INVITE_DAYS, inviteMessage, setPasswordPath } from "@/lib/portal/invite-message";

/**
 * Giving a dealership its login.
 *
 * Staff never choose anybody's password. They make the account, and the dealership gets a link
 * that lets them choose their own: /portal/set-password?token=... The token is Payload's own
 * password-reset token, written straight onto the account, so the page that redeems it is
 * Payload's resetPassword and nothing home-made checks it.
 *
 * WHY SEVEN DAYS
 *
 * A link sent on WhatsApp gets read in the evening or on Monday, not within Payload's default
 * hour. Seven days is long enough for that and short enough that a link left in an old chat
 * stops working. Sending a fresh link replaces the old one, which then stops working at once.
 *
 * The token is 40 hex characters from the operating system's random source, the same as Payload
 * makes for itself, so a guess is not a plan.
 */

export const inviteToken = (): string => randomBytes(20).toString("hex");

export type InviteInput = {
  dealerId: number;
  name: string;
  email: string;
  phone?: string | null;
};

export type InviteResult =
  | { ok: true; userId: number; token: string; expiresAt: string; fresh: boolean }
  | { ok: false; problem: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function inviteProblems(input: Partial<InviteInput>): string[] {
  const problems: string[] = [];
  if (!input.name?.trim()) problems.push("Their name is missing.");
  if (!input.email?.trim())
    problems.push("Their email address is missing. It is how they sign in.");
  else if (!EMAIL.test(input.email.trim()))
    problems.push("That email address does not look right.");
  return problems;
}

/** Makes the account, or finds the one this person already has at this dealership, and links it. */
export async function inviteDealerUser(
  payload: Payload,
  input: InviteInput,
): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const found = existing.docs[0] as
    | { id: number; dealer?: number | { id: number } | null; role?: string; status?: string }
    | undefined;

  let userId: number;
  let fresh = false;

  if (found) {
    const dealer = typeof found.dealer === "object" ? found.dealer?.id : found.dealer;
    // An email already in use somewhere else is never moved across. Moving a login between
    // dealerships is a decision a person makes on the account itself, with the history to show.
    if (!isDealerStaff({ ...found, collection: "users" }) || Number(dealer) !== input.dealerId) {
      return {
        ok: false,
        problem:
          "That email address already has a Rynet login for somebody else. Use another address, or open the staff accounts list.",
      };
    }
    if (found.status === "suspended") {
      return {
        ok: false,
        problem: "That login is suspended. Switch it back on in staff accounts first.",
      };
    }
    userId = found.id;
  } else {
    const created = await payload.create({
      collection: "users",
      data: {
        name: input.name.trim(),
        email,
        phone: input.phone?.trim() || null,
        role: "dealer_owner",
        dealer: input.dealerId,
        status: "invited",
        // Nobody knows this and nobody needs to: the link replaces it before anyone signs in.
        password: randomBytes(24).toString("base64url"),
      },
      overrideAccess: true,
    });
    userId = created.id as number;
    fresh = true;
  }

  const token = inviteToken();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // Straight to the row: these two fields are Payload's own and have no field-level access to
  // pass through, and no hook has anything to say about them.
  await payload.db.updateOne({
    collection: "users",
    id: userId,
    data: { resetPasswordToken: token, resetPasswordExpiration: expiresAt },
  });

  return { ok: true, userId, token, expiresAt, fresh };
}
