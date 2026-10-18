"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";

import { choosePassword, type FormState } from "@/app/actions/portal";
import { MIN_PASSWORD } from "@/lib/portal/password";

export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(choosePassword, {});

  return (
    <form action={action} noValidate>
      <h1 className="rn-portal-door__title">Choose your password</h1>
      <p className="rn-portal-door__lead">
        For <strong className="text-heading">{email}</strong>. Nobody at Rynet will ever know it.
      </p>
      <input type="hidden" name="token" value={token} />
      {/* For password managers, so they save the password against the right login. */}
      <input type="hidden" name="username" autoComplete="username" value={email} />
      <div className="rn-portal-door__fields">
        <div className="rn-field">
          <label htmlFor="new-password" className="rn-field__label">
            New password
          </label>
          <input
            id="new-password"
            name="password"
            className="rn-input"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
            aria-describedby="new-password-hint"
          />
          <p id="new-password-hint" className="rn-field__hint">
            At least {MIN_PASSWORD} characters. A short sentence is easy to remember and hard to
            guess.
          </p>
        </div>
        <div className="rn-field">
          <label htmlFor="again-password" className="rn-field__label">
            The same again
          </label>
          <input
            id="again-password"
            name="again"
            className="rn-input"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        {state.problem ? (
          <p className="rn-portal-problem" role="alert">
            {state.problem}
          </p>
        ) : null}
        <button type="submit" className="rn-btn rn-btn--primary rn-btn--lg" disabled={pending}>
          <KeyRound aria-hidden="true" /> {pending ? "Saving" : "Save and sign in"}
        </button>
      </div>
    </form>
  );
}
