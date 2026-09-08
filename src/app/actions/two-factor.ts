"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { requiresTwoFactor, twoFactorIsMandatory } from "@/access/two-factor";
import {
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUrl,
  verifyTotp,
} from "@/lib/totp";
import type { TwoFactorState, TwoFactorStatus } from "@/lib/two-factor-state";

/**
 * Enrolling in, and turning off, two-factor authentication.
 *
 * Every function here resolves the caller from the Payload session cookie and acts on THAT
 * user and no other. There is no user id parameter anywhere in this file, deliberately: an
 * endpoint that takes an id is an endpoint that has to get the authorisation check right, and
 * the check that is never written cannot be got wrong.
 *
 * The secret is written with `overrideAccess`, because the field's access rules deny reads and
 * writes to everybody including a platform admin. That is the point of them. An admin who can
 * read a colleague's secret can produce that colleague's codes, and then the second factor
 * says nothing about who is at the keyboard.
 *
 * NOTE: this module may export NOTHING but async functions. The types live in
 * src/lib/two-factor-state.ts for that reason.
 */

const PEPPER = () => process.env.PAYLOAD_SECRET ?? "rynet";

async function currentUser() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });

  if (user?.collection !== "users") return { payload, user: null as null };

  // Read again with the hidden fields, because the document `auth` returns has been through
  // field access control and the secret is denied to everyone.
  const full = await payload.findByID({
    collection: "users",
    id: user.id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  });

  return { payload, user: full };
}

/** What the page renders from. Read only, and safe to call on every request. */
export async function readTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { user } = await currentUser();

  if (!user) {
    return {
      signedIn: false,
      enabled: false,
      pending: false,
      recoveryCodesLeft: 0,
      required: false,
      mandatoryNow: twoFactorIsMandatory(),
    };
  }

  const enabled = Boolean(user.twoFactorEnabled && user.twoFactorSecret);
  const pending = Boolean(!user.twoFactorEnabled && user.twoFactorSecret);

  return {
    signedIn: true,
    email: user.email,
    role: user.role,
    enabled,
    pending,
    // The key is only handed back while a setup is in progress. Once it is confirmed there is
    // no route that reads it out again, which is what makes "we cannot recover it for you"
    // true rather than a policy.
    secret: pending ? (user.twoFactorSecret ?? undefined) : undefined,
    otpauth: pending
      ? otpauthUrl({ secret: user.twoFactorSecret ?? "", account: user.email })
      : undefined,
    recoveryCodesLeft: (user.twoFactorRecoveryCodes ?? []).length,
    confirmedAt: user.twoFactorConfirmedAt,
    required: requiresTwoFactor({ ...user, collection: "users" }),
    mandatoryNow: twoFactorIsMandatory(),
  };
}

/**
 * Starts a setup by issuing a secret.
 *
 * `twoFactorEnabled` stays false until a code proves the app has the same secret, so a setup
 * abandoned halfway cannot lock anybody out: the sign-in gate only enforces when the flag and
 * the secret are both present.
 */
export async function beginTwoFactorSetup(
  _previous: TwoFactorState,
  _formData: FormData,
): Promise<TwoFactorState> {
  const { payload, user } = await currentUser();
  if (!user) return { status: "error", message: "Sign in at /admin first." };

  if (user.twoFactorEnabled) {
    return {
      status: "error",
      message: "Two-factor is already on for this account. Turn it off first to set it up again.",
    };
  }

  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: true,
    data: { twoFactorSecret: generateSecret() },
  });

  revalidatePath("/account/two-factor");
  return { status: "idle" };
}

/** Confirms the app and the server agree, turns it on, and issues the recovery codes. */
export async function confirmTwoFactorSetup(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const { payload, user } = await currentUser();
  if (!user) return { status: "error", message: "Sign in at /admin first." };

  if (!user.twoFactorSecret) {
    return { status: "error", message: "Start the setup again: there is no key on this account." };
  }
  if (user.twoFactorEnabled) {
    return { status: "error", message: "Two-factor is already on for this account." };
  }

  const code = String(formData.get("totp") ?? "");
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return {
      status: "error",
      message:
        "That code is not right. Check that the app shows Rynet and your email address, and that your phone's clock is set automatically.",
    };
  }

  const codes = generateRecoveryCodes();

  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: true,
    data: {
      twoFactorEnabled: true,
      twoFactorConfirmedAt: new Date().toISOString(),
      twoFactorRecoveryCodes: codes.map((plain) => ({ hash: hashRecoveryCode(plain, PEPPER()) })),
    },
  });

  // Deliberately no revalidatePath. The codes are in the return value, and revalidating here
  // re-renders the page into its "two-factor is on" branch, which does not render them. The
  // person would enable a second factor and never be shown the way back in.
  return {
    status: "enabled",
    message: "Two-factor is on. Write these recovery codes down now.",
    // The only time the plain codes exist anywhere. Only the hashes are stored.
    recoveryCodes: codes,
  };
}

/** Issues a fresh set and invalidates the old ones. Requires a current code. */
export async function regenerateRecoveryCodes(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const { payload, user } = await currentUser();
  if (!user) return { status: "error", message: "Sign in at /admin first." };

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return { status: "error", message: "Two-factor is not on for this account." };
  }

  const code = String(formData.get("totp") ?? "");
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return { status: "error", message: "That code is not right." };
  }

  const codes = generateRecoveryCodes();

  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: true,
    data: {
      twoFactorRecoveryCodes: codes.map((plain) => ({ hash: hashRecoveryCode(plain, PEPPER()) })),
    },
  });

  // Same reason as above: the codes are the point of the call, so nothing re-renders over them.
  return {
    status: "regenerated",
    message: "New codes. The old ones no longer work.",
    recoveryCodes: codes,
  };
}

/**
 * Turns it off.
 *
 * Requires a current code, so somebody who walks up to an unlocked laptop cannot quietly
 * remove the second factor and come back later. Everything is cleared rather than left
 * dormant: a stale secret sitting on the record is a credential nobody is watching.
 */
export async function disableTwoFactor(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const { payload, user } = await currentUser();
  if (!user) return { status: "error", message: "Sign in at /admin first." };

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return { status: "error", message: "Two-factor is not on for this account." };
  }

  if (twoFactorIsMandatory() && requiresTwoFactor({ ...user, collection: "users" })) {
    return {
      status: "error",
      message:
        "Two-factor is required for this role, so it cannot be turned off. A platform admin can move the account to another role first.",
    };
  }

  const code = String(formData.get("totp") ?? "");
  if (!verifyTotp(user.twoFactorSecret, code)) {
    return { status: "error", message: "That code is not right." };
  }

  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: true,
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorConfirmedAt: null,
      twoFactorRecoveryCodes: [],
    },
  });

  revalidatePath("/account/two-factor");
  return { status: "disabled", message: "Two-factor is off for this account." };
}
