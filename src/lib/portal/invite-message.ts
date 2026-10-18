import { firstNameOf } from "@/lib/onboarding/whatsapp";

/**
 * The parts of a dealership's invite that the browser needs too: how long the link lasts, its
 * path, and the message that carries it. Kept apart from invite.ts, which makes accounts and is
 * server only.
 */

export const INVITE_DAYS = 7;

export const setPasswordPath = (token: string): string =>
  `/portal/set-password?token=${encodeURIComponent(token)}`;

/** The WhatsApp or email text that carries the link. */
export function inviteMessage(options: {
  name: string;
  tradingName: string;
  link: string;
}): string {
  const first = firstNameOf(options.name);
  return [
    `Hi${first ? ` ${first}` : ""}, here is your login for ${options.tradingName} on Rynet.`,
    "",
    `Choose a password here: ${options.link}`,
    "",
    `The link works for ${INVITE_DAYS} days. After that you sign in at the same address without the long code on the end, and see your cars, your enquiries and your ads.`,
  ].join("\n");
}
