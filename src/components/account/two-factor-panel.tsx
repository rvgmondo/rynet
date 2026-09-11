"use client";

import { CheckCircle2, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useActionState } from "react";

import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
} from "@/app/actions/two-factor";
import { Field, INPUT_CLASS } from "@/components/forms/multi-step";
import { Button } from "@/components/ui/button";
import type { TwoFactorState, TwoFactorStatus } from "@/lib/two-factor-state";

const idle: TwoFactorState = { status: "idle" };

/** Grouped in fours, because this gets typed into a phone by a person reading a screen. */
function groupKey(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? [secret]).join(" ");
}

function RecoveryCodes({ codes, heading }: { codes: string[]; heading: string }) {
  return (
    <div role="status" className="mt-6 border-t-2 border-warning pt-5">
      <p className="font-display text-sm font-bold text-warning">{heading}</p>
      <p className="mt-2 text-sm text-ink-secondary">
        This is the only time they are shown. They are stored as hashes, so nobody at Rynet can read
        them back to you, and that includes us. Print them or write them down now and keep them away
        from the phone with the app on it.
      </p>
      <ul className="mt-4 grid gap-2 font-mono text-sm tabular sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="rounded-md bg-surface px-3 py-2">
            {code}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Result({ state }: { state: TwoFactorState }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="mt-4 rounded-md bg-danger-subtle p-3 text-sm text-ink">
        {state.message}
      </p>
    );
  }
  if (state.status === "disabled") {
    return (
      <p role="status" className="mt-4 rounded-md bg-surface-sunken p-3 text-sm">
        {state.message}
      </p>
    );
  }
  return null;
}

/**
 * Two-factor enrolment.
 *
 * There is no QR code, and that is a deliberate trade rather than an oversight. Rendering one
 * needs a Reed-Solomon encoder, which means a dependency, which means an `npm install` on a
 * host that cannot build and where dependency changes are a separate manual deploy step. Every
 * authenticator app accepts a typed setup key, this page is used once by a handful of people,
 * and the key is shown in groups of four with the account name beside it. When something else
 * forces a dependency install, a QR is worth adding then.
 */
export function TwoFactorPanel({ status }: { status: TwoFactorStatus }) {
  const [beginState, begin, beginning] = useActionState(beginTwoFactorSetup, idle);
  const [confirmState, confirm, confirming] = useActionState(confirmTwoFactorSetup, idle);
  const [regenState, regen, regenerating] = useActionState(regenerateRecoveryCodes, idle);
  const [disableState, disable, disabling] = useActionState(disableTwoFactor, idle);

  /**
   * The codes, shown once, before anything else.
   *
   * This branch is first on purpose. `status` comes from the server and says the account is
   * now enrolled, so every branch below would render the "two-factor is on" screen and the
   * codes in `confirmState` would never appear. Somebody would switch on a second factor and
   * never be shown the way back in if they lost the phone.
   */
  if (confirmState.status === "enabled") {
    return (
      <div className="border-t-2 border-ink pt-6">
        <h2 className="flex items-center gap-2 text-lg">
          <ShieldCheck aria-hidden="true" className="size-5 text-success" />
          Two-factor is on for {status.email}
        </h2>
        <RecoveryCodes codes={confirmState.recoveryCodes} heading={confirmState.message} />
        <p className="mt-5 text-sm text-ink-secondary">
          Once they are written down, reload this page. The codes will not be shown again.
        </p>
      </div>
    );
  }

  if (!status.signedIn) {
    return (
      <div className="border-t-2 border-ink pt-6">
        <h2 className="text-lg">You are not signed in</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Sign in at <a href="/admin">/admin</a> first, then come back to this page. It only ever
          acts on the account you are signed in as.
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------- already on

  if (status.enabled) {
    return (
      <div className="space-y-8">
        <div className="border-t-2 border-ink pt-6">
          <h2 className="flex items-center gap-2 text-lg">
            <ShieldCheck aria-hidden="true" className="size-5 text-success" />
            Two-factor is on
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            {status.email} will be asked for a code from the authenticator app at every sign-in.
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {status.recoveryCodesLeft} recovery {status.recoveryCodesLeft === 1 ? "code" : "codes"}{" "}
            left.
            {status.recoveryCodesLeft <= 2 ? (
              <strong className="text-ink"> That is nearly none. Generate a new set.</strong>
            ) : null}
          </p>
        </div>

        <form action={regen} className="border-t-2 border-ink pt-6">
          <h2 className="text-lg">New recovery codes</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Generating a set invalidates the old one immediately.
          </p>
          <div className="mt-4 max-w-xs">
            <Field name="regen-totp" label="Code from your app" error={undefined}>
              <input
                id="regen-totp"
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary" className="mt-4" disabled={regenerating}>
            <KeyRound aria-hidden="true" />
            {regenerating ? "Working" : "Generate new codes"}
          </Button>
          <Result state={regenState} />
          {regenState.status === "regenerated" ? (
            <RecoveryCodes codes={regenState.recoveryCodes} heading={regenState.message} />
          ) : null}
        </form>

        <form action={disable} className="border-t-2 border-danger pt-6">
          <h2 className="flex items-center gap-2 text-lg">
            <ShieldOff aria-hidden="true" className="size-5 text-ink-muted" />
            Turn two-factor off
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            A code is required, so that somebody who finds this page open on an unattended laptop
            cannot quietly remove it.
          </p>
          {status.required && status.mandatoryNow ? (
            <p className="mt-3 rounded-md bg-surface-sunken p-3 text-sm">
              Two-factor is required for your role, so it cannot be turned off here.
            </p>
          ) : (
            <>
              <div className="mt-4 max-w-xs">
                <Field name="disable-totp" label="Code from your app" error={undefined}>
                  <input
                    id="disable-totp"
                    name="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={7}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
              <Button type="submit" variant="secondary" className="mt-4" disabled={disabling}>
                {disabling ? "Working" : "Turn it off"}
              </Button>
            </>
          )}
          <Result state={disableState} />
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------------- setup in progress

  if (status.pending && status.secret) {
    return (
      <div className="space-y-8">
        <div className="border-t-2 border-ink pt-6">
          <h2 className="text-lg">Add Rynet to your authenticator app</h2>
          <ol className="mt-4 space-y-4 text-sm text-ink-secondary">
            <li>
              <strong className="text-ink">1.</strong> Open your authenticator app and choose to add
              an account by entering a setup key. Google Authenticator, Microsoft Authenticator,
              1Password, Bitwarden and Authy all do this.
            </li>
            <li>
              <strong className="text-ink">2.</strong> Give it the account name{" "}
              <code className="rounded bg-surface-sunken px-1.5 py-0.5">{status.email}</code> and
              this key:
              <span className="mt-2 block break-all rounded-md bg-surface-sunken p-4 font-mono text-base tabular">
                {groupKey(status.secret)}
              </span>
              <span className="mt-1 block text-xs text-ink-muted">
                Time based, six digits, thirty seconds. Those are the defaults, so you will probably
                not be asked.
              </span>
            </li>
            <li>
              <strong className="text-ink">3.</strong> Type the six digit code it shows below. Do
              not close this page until you have, or you will have to start again.
            </li>
          </ol>
        </div>

        <form action={confirm} className="border-t-2 border-ink pt-6">
          <h2 className="text-lg">Confirm the code</h2>
          <div className="mt-4 max-w-xs">
            <Field name="totp" label="Six digit code" error={undefined}>
              <input
                id="totp"
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                // biome-ignore lint/a11y/noAutofocus: this is the only interactive control on a page the person arrived at to do exactly this.
                autoFocus
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <Button type="submit" className="mt-4" disabled={confirming}>
            <CheckCircle2 aria-hidden="true" />
            {confirming ? "Checking" : "Turn on two-factor"}
          </Button>
          {/* Success is handled by the early return at the top, which is the only branch that
              renders the recovery codes. Reaching here means the code was wrong. */}
          <Result state={confirmState} />
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------------------- not started

  return (
    <form action={begin} className="border-t-2 border-ink pt-6">
      <h2 className="flex items-center gap-2 text-lg">
        <ShieldOff aria-hidden="true" className="size-5 text-ink-muted" />
        Two-factor is off
      </h2>
      <p className="mt-2 text-sm text-ink-secondary">
        Signing in to {status.email} needs only a password. Anyone who has that password has your
        account, and on this platform that means every lead and every price your dealership holds.
      </p>
      {status.required ? (
        <p className="mt-3 rounded-md bg-warning-subtle p-3 text-sm">
          Your role will require two-factor. Set it up now, before that is switched on.
        </p>
      ) : null}
      <Button type="submit" className="mt-5" disabled={beginning}>
        <ShieldCheck aria-hidden="true" />
        {beginning ? "Working" : "Set up two-factor"}
      </Button>
      <Result state={beginState} />
    </form>
  );
}
