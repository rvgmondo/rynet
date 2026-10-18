"use client";

import { LogIn } from "lucide-react";
import { type FormEvent, useState } from "react";

/**
 * Signing in to the portal, through Payload's own login endpoint, so the password check, the
 * lockout after eight tries, a suspended account and the second factor are all exactly what the
 * rest of Rynet enforces. This form only collects the answers.
 *
 * The code box appears when the account turns out to need one, rather than sitting there
 * confusing everyone who has not set two-factor up.
 */

const TWO_FACTOR = /two-factor/i;

export function PortalSignInForm({ notice }: { notice?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    const trimmed = code.replace(/\s/g, "");
    const response = await fetch("/api/users/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        ...(trimmed
          ? /^\d{6}$/.test(trimmed)
            ? { totp: trimmed }
            : { recoveryCode: trimmed }
          : {}),
      }),
    }).catch(() => null);

    if (response?.ok) {
      window.location.assign("/portal");
      return;
    }
    setBusy(false);
    const body = (await response?.json().catch(() => null)) as {
      errors?: { message?: string }[];
    } | null;
    const message = body?.errors?.[0]?.message ?? "";
    if (TWO_FACTOR.test(message)) {
      setNeedsCode(true);
      setProblem(
        needsCode ? message : "This account has two-factor sign-in. Enter the code from your app.",
      );
      return;
    }
    setProblem(message || "That did not work. Check your connection and try again.");
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="rn-portal-door__title">Sign in</h1>
      <p className="rn-portal-door__lead">Your dealership on Rynet.</p>
      {notice ? (
        <p className="rn-portal-problem mt-6" role="status">
          {notice}
        </p>
      ) : null}
      <div className="rn-portal-door__fields">
        <div className="rn-field">
          <label htmlFor="portal-email" className="rn-field__label">
            Email
          </label>
          <input
            id="portal-email"
            className="rn-input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="rn-field">
          <label htmlFor="portal-password" className="rn-field__label">
            Password
          </label>
          <input
            id="portal-password"
            className="rn-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {needsCode ? (
          <div className="rn-field">
            <label htmlFor="portal-code" className="rn-field__label">
              Code from your app
            </label>
            <input
              id="portal-code"
              className="rn-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <p className="rn-field__hint">Or one of your recovery codes.</p>
          </div>
        ) : null}
        {problem ? (
          <p className="rn-portal-problem" role="alert">
            {problem}
          </p>
        ) : null}
        <button type="submit" className="rn-btn rn-btn--primary rn-btn--lg" disabled={busy}>
          <LogIn aria-hidden="true" /> {busy ? "Signing in" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
