"use client";

import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";
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

/** One white card per job on the page, with its icon beside the heading. */
function Panel({
  icon,
  title,
  tone = "neutral",
  children,
  as: Tag = "div",
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  tone?: "neutral" | "success" | "danger";
  children?: ReactNode;
  as?: "div" | "form";
  action?: (formData: FormData) => void;
}) {
  const iconTone =
    tone === "success"
      ? "bg-success-subtle text-success"
      : tone === "danger"
        ? "bg-danger-subtle text-danger"
        : "bg-subtle text-heading";

  return (
    <Tag action={action} className="rn-card p-6 sm:p-7">
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className={`grid size-10 shrink-0 place-items-center rounded-sm ${iconTone}`}
          >
            {icon}
          </span>
        ) : null}
        <h2 className="min-w-0 break-words text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </Tag>
  );
}

function RecoveryCodes({ codes, heading }: { codes: string[]; heading: string }) {
  return (
    <div role="status" className="mt-6 rounded-md bg-warning-subtle p-5">
      <p className="font-semibold text-heading">{heading}</p>
      <p className="mt-2 text-sm text-body">
        This is the only time they are shown. They are stored as hashes, so nobody at Rynet can read
        them back to you. Print them or write them down now and keep them away from the phone with
        the app on it.
      </p>
      <ul className="mt-4 grid gap-2 font-mono text-sm tabular sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="rounded-sm border border-line bg-card px-3 py-2 text-heading">
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
      <p
        role="alert"
        className="mt-4 flex items-start gap-2 rounded-sm bg-danger-subtle px-3.5 py-3 text-sm text-heading"
      >
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
        {state.message}
      </p>
    );
  }
  if (state.status === "disabled") {
    return (
      <p role="status" className="mt-4 rounded-sm bg-subtle px-3.5 py-3 text-sm text-heading">
        {state.message}
      </p>
    );
  }
  return null;
}

function CodeField({
  id,
  label,
  autoFocus = false,
}: {
  id: string;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="mt-5 max-w-xs">
      <Field name={id} label={label}>
        <input
          id={id}
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          // biome-ignore lint/a11y/noAutofocus: only set on the confirm step, the one control on a page the person arrived at to do exactly this.
          autoFocus={autoFocus}
          className={`${INPUT_CLASS} tabular`}
        />
      </Field>
    </div>
  );
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
 *
 * e2e/two-factor.spec.ts reads the key from the first `.font-mono` in main and the recovery codes
 * from the `li` items of a `.font-mono` list, so those two classes are load-bearing.
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
      <Panel
        tone="success"
        icon={<ShieldCheck className="size-5" />}
        title={`Two-factor is on for ${status.email}`}
      >
        <RecoveryCodes codes={confirmState.recoveryCodes} heading={confirmState.message} />
        <p className="mt-5 text-sm text-body">
          Once they are written down, reload this page. The codes will not be shown again.
        </p>
      </Panel>
    );
  }

  if (!status.signedIn) {
    return (
      <Panel icon={<KeyRound className="size-5" />} title="You are not signed in">
        <p className="mt-3 text-sm text-body">
          Sign in at <a href="/admin">/admin</a> first, then come back to this page. It only ever
          acts on the account you are signed in as.
        </p>
      </Panel>
    );
  }

  // --------------------------------------------------------------------------- already on

  if (status.enabled) {
    return (
      <div className="space-y-5">
        <Panel tone="success" icon={<ShieldCheck className="size-5" />} title="Two-factor is on">
          <p className="mt-3 text-sm text-body">
            {status.email} will be asked for a code from the authenticator app at every sign-in.
          </p>
          <p className="mt-2 text-sm text-body">
            {status.recoveryCodesLeft} recovery {status.recoveryCodesLeft === 1 ? "code" : "codes"}{" "}
            left.
            {status.recoveryCodesLeft <= 2 ? (
              <strong className="text-heading"> That is nearly none. Generate a new set.</strong>
            ) : null}
          </p>
        </Panel>

        <Panel
          as="form"
          action={regen}
          icon={<KeyRound className="size-5" />}
          title="New recovery codes"
        >
          <p className="mt-3 text-sm text-body">
            Generating a set invalidates the old one immediately.
          </p>
          <CodeField id="regen-totp" label="Code from your app" />
          <Button
            type="submit"
            variant="outline"
            className="mt-4 self-start"
            disabled={regenerating}
          >
            <KeyRound aria-hidden="true" />
            {regenerating ? "Working" : "Generate new codes"}
          </Button>
          <Result state={regenState} />
          {regenState.status === "regenerated" ? (
            <RecoveryCodes codes={regenState.recoveryCodes} heading={regenState.message} />
          ) : null}
        </Panel>

        <Panel
          as="form"
          action={disable}
          tone="danger"
          icon={<ShieldOff className="size-5" />}
          title="Turn two-factor off"
        >
          <p className="mt-3 text-sm text-body">
            A code is required, so that somebody who finds this page open on an unattended laptop
            cannot quietly remove it.
          </p>
          {status.required && status.mandatoryNow ? (
            <p className="mt-4 rounded-sm bg-subtle px-3.5 py-3 text-sm text-heading">
              Two-factor is required for your role, so it cannot be turned off here.
            </p>
          ) : (
            <>
              <CodeField id="disable-totp" label="Code from your app" />
              <Button
                type="submit"
                variant="outline"
                className="mt-4 self-start"
                disabled={disabling}
              >
                {disabling ? "Working" : "Turn it off"}
              </Button>
            </>
          )}
          <Result state={disableState} />
        </Panel>
      </div>
    );
  }

  // ------------------------------------------------------------------- setup in progress

  if (status.pending && status.secret) {
    return (
      <div className="space-y-5">
        <Panel icon={<KeyRound className="size-5" />} title="Add Rynet to your authenticator app">
          <ol className="mt-5 space-y-5 text-sm text-body">
            <li className="flex gap-3">
              <StepNumber n={1} />
              <span className="min-w-0 pt-0.5">
                Open your authenticator app and choose to add an account by entering a setup key.
                Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden and Authy all do
                this.
              </span>
            </li>
            <li className="flex gap-3">
              <StepNumber n={2} />
              <div className="min-w-0 flex-1 pt-0.5">
                Give it the account name{" "}
                <code className="rounded-xs bg-subtle px-1.5 py-0.5 break-all text-heading">
                  {status.email}
                </code>{" "}
                and this key:
                <span className="mt-3 block break-all rounded-md border border-line bg-subtle p-4 font-mono text-base tracking-wide text-heading tabular">
                  {groupKey(status.secret)}
                </span>
                <span className="mt-2 block text-xs text-muted">
                  Time based, six digits, thirty seconds. Those are the defaults, so you will
                  probably not be asked.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <StepNumber n={3} />
              <span className="min-w-0 pt-0.5">
                Type the six digit code it shows below. Do not close this page until you have, or
                you will have to start again.
              </span>
            </li>
          </ol>
        </Panel>

        <Panel
          as="form"
          action={confirm}
          icon={<CheckCircle2 className="size-5" />}
          title="Confirm the code"
        >
          <CodeField id="totp" label="Six digit code" autoFocus />
          <Button type="submit" size="lg" className="mt-4 self-start" disabled={confirming}>
            <CheckCircle2 aria-hidden="true" />
            {confirming ? "Checking" : "Turn on two-factor"}
          </Button>
          {/* Success is handled by the early return at the top, which is the only branch that
              renders the recovery codes. Reaching here means the code was wrong. */}
          <Result state={confirmState} />
        </Panel>
      </div>
    );
  }

  // ------------------------------------------------------------------------- not started

  return (
    <Panel
      as="form"
      action={begin}
      icon={<ShieldOff className="size-5" />}
      title="Two-factor is off"
    >
      <p className="mt-3 text-sm text-body">
        Signing in to {status.email} needs only a password. Anyone who has that password has your
        account, and on this platform that means every lead and every price your dealership holds.
      </p>
      {status.required ? (
        <p className="mt-4 rounded-sm bg-warning-subtle px-3.5 py-3 text-sm text-heading">
          Your role will require two-factor. Set it up now, before that is switched on.
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-5 self-start" disabled={beginning}>
        <ShieldCheck aria-hidden="true" />
        {beginning ? "Working" : "Set up two-factor"}
      </Button>
      <Result state={beginState} />
    </Panel>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-on-secondary tabular"
    >
      {n}
    </span>
  );
}
