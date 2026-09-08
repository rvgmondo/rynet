import { APIError, type PayloadRequest } from "payload";

import { hasRole, type Role } from "@/access/roles";
import { matchRecoveryCode, verifyTotp } from "@/lib/totp";

/**
 * The second factor, enforced at sign-in.
 *
 * `beforeLogin` runs after Payload has verified the password and before it signs the token, so
 * throwing here refuses the session without one ever being issued. That is the only place this
 * can live: an afterLogin check would be handing out a token and then asking a question.
 *
 * ROLLOUT IS DELIBERATELY IN TWO STAGES, and the reason is that getting this wrong locks the
 * founder out of his own live site.
 *
 *   Stage one, now:  anyone who has enrolled must present a code. Nobody is forced to enrol.
 *   Stage two, once Ruben has enrolled: set RYNET_REQUIRE_2FA=true and the privileged roles
 *                    below cannot sign in without it.
 *
 * The flag is read at call time rather than at module load, so switching it on is an
 * environment change and a restart rather than a deploy.
 */

/** Roles that stage two will require a second factor from. */
const PRIVILEGED: readonly Role[] = ["platform_admin", "platform_editor", "dealer_owner"];

export const requiresTwoFactor = (user: unknown): boolean => hasRole(user, ...PRIVILEGED);

export const twoFactorIsMandatory = (): boolean => process.env.RYNET_REQUIRE_2FA === "true";

type StoredUser = {
  id: number | string;
  role?: string | null;
  collection?: string;
  twoFactorEnabled?: boolean | null;
  twoFactorSecret?: string | null;
  twoFactorRecoveryCodes?: { hash?: string | null }[] | null;
};

/**
 * Where the code comes in.
 *
 * `req.data` is the parsed login body, which is what our own sign-in form posts. The header is
 * the fallback for anything that cannot easily add a field to the body, and for the Payload
 * admin login form, which is Payload's own component and does not know about this.
 *
 * Both are read because which one is populated depends on the caller, and a second factor that
 * only works from one client is a second factor that gets switched off.
 */
export function readSecondFactor(req: PayloadRequest): { totp?: string; recoveryCode?: string } {
  const body = (req.data ?? {}) as Record<string, unknown>;

  const fromBody = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string) : undefined;
  const fromHeader = (key: string) => req.headers?.get(key) ?? undefined;

  return {
    totp: fromBody("totp") ?? fromHeader("x-rynet-totp") ?? undefined,
    recoveryCode: fromBody("recoveryCode") ?? fromHeader("x-rynet-recovery-code") ?? undefined,
  };
}

/**
 * Refuses a login that has no valid second factor.
 *
 * Reads the user again with `overrideAccess` and `showHiddenFields`, because the document
 * Payload hands the hook has been through field access control and the secret is hidden from
 * everybody, which is the point of hiding it. Checking a secret you were only allowed to see
 * is not a check.
 */
export async function enforceSecondFactor({
  req,
  user,
}: {
  req: PayloadRequest;
  user: { id: number | string };
}): Promise<void> {
  const stored = (await req.payload.findByID({
    collection: "users",
    id: user.id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })) as StoredUser | null;

  if (!stored) return;

  if (!stored.twoFactorEnabled || !stored.twoFactorSecret) {
    // Not enrolled. Stage two turns this into a refusal for the privileged roles; stage one
    // lets them through so that enrolling is possible in the first place.
    if (twoFactorIsMandatory() && requiresTwoFactor({ ...stored, collection: "users" })) {
      throw new APIError(
        "This account must have two-factor authentication set up before it can sign in. Ask a platform admin to send you an enrolment link.",
        401,
      );
    }
    return;
  }

  const { totp, recoveryCode } = readSecondFactor(req);

  if (totp && verifyTotp(stored.twoFactorSecret, totp)) return;

  if (recoveryCode) {
    const hashes = (stored.twoFactorRecoveryCodes ?? [])
      .map((entry) => entry?.hash)
      .filter((hash): hash is string => typeof hash === "string");

    const used = matchRecoveryCode(recoveryCode, hashes, process.env.PAYLOAD_SECRET ?? "rynet");

    if (used) {
      // A recovery code is single use. Burning it is the whole reason it is safe to write one
      // on paper, so it happens here rather than being left to whoever calls this next.
      await req.payload.update({
        collection: "users",
        id: user.id,
        overrideAccess: true,
        data: {
          twoFactorRecoveryCodes: hashes.filter((hash) => hash !== used).map((hash) => ({ hash })),
        },
      });
      return;
    }
  }

  // One message for a missing code and a wrong code. Distinguishing them tells whoever is
  // trying which half of the credentials they have already got right.
  throw new APIError("That two-factor code is not right. Check the app and try again.", 401);
}
