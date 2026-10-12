"use client";

import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import * as React from "react";

import { submitDealerSignup } from "@/app/actions/dealer-signup";
import { BotTraps, Field, INPUT_CLASS, SELECT_CLASS } from "@/components/forms/multi-step";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { buttonClasses } from "@/components/ui/button-classes";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";
import {
  DEALER_SIGNUP_CONSENT_WORDING,
  type DealerSignupState,
  STOCK_SIZES,
} from "@/lib/dealer-signup-schema";

/**
 * The dealership sign-up: five questions on one screen.
 *
 * Deliberately not a multi-step form. A dealer principal who has decided to try Rynet should be
 * done in under a minute, and everything else (the address, the CIPC number, the stock) is
 * collected by us on the phone and on the onboarding desk, not typed in here.
 */

const initial: DealerSignupState = { status: "idle" };

export function DealerSignupForm() {
  const [state, action, pending] = React.useActionState(submitDealerSignup, initial);
  const elapsed = React.useRef<HTMLInputElement>(null);
  const started = React.useRef(Date.now());
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <span className="grid size-12 place-items-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <h2 className="rn-h3">You are on the list</h2>
        <p className="text-body">{state.message}</p>
        <p className="text-sm text-muted">
          Have your website address or a stock list handy. That is all we need from you.
        </p>
      </div>
    );
  }

  const describe = (name: string) =>
    [errors[name] ? `${name}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <form
      action={action}
      noValidate
      className="relative flex flex-col gap-5"
      onSubmit={() => {
        if (elapsed.current) elapsed.current.value = String(Date.now() - started.current);
      }}
    >
      <div>
        <h2 className="rn-h3">Put your cars on Rynet</h2>
        <p className="mt-1 text-sm text-body">Five questions. We call you and do the rest.</p>
      </div>

      {state.status === "error" ? (
        <p className="rn-field__error" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{state.message}</span>
        </p>
      ) : null}

      <Field name="dealership" label="Dealership name" error={errors.dealership}>
        <input
          id="dealership"
          name="dealership"
          className={INPUT_CLASS}
          autoComplete="organization"
          required
          aria-invalid={Boolean(errors.dealership)}
          aria-describedby={describe("dealership")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Your name" error={errors.name}>
          <input
            id="name"
            name="name"
            className={INPUT_CLASS}
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describe("name")}
          />
        </Field>
        <Field name="phone" label="Phone or WhatsApp" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={INPUT_CLASS}
            autoComplete="tel"
            inputMode="tel"
            required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describe("phone")}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="town" label="Town" error={errors.town}>
          <input
            id="town"
            name="town"
            className={INPUT_CLASS}
            autoComplete="address-level2"
            required
            aria-invalid={Boolean(errors.town)}
            aria-describedby={describe("town")}
          />
        </Field>
        <Field name="stock" label="Cars on your floor" error={errors.stock}>
          <select
            id="stock"
            name="stock"
            className={SELECT_CLASS}
            defaultValue=""
            required
            aria-invalid={Boolean(errors.stock)}
            aria-describedby={describe("stock")}
          >
            <option value="" disabled>
              Roughly how many
            </option>
            {STOCK_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        name="website"
        label="Your website"
        optional
        hint="If your cars are on it, we load them from there."
        error={errors.website}
      >
        <input
          id="website"
          name="website"
          className={INPUT_CLASS}
          inputMode="url"
          autoComplete="url"
          placeholder="yourdealership.co.za"
          aria-describedby={["website-hint", describe("website")].filter(Boolean).join(" ")}
        />
      </Field>

      <Field name="email" label="Email" optional error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          className={INPUT_CLASS}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describe("email")}
        />
      </Field>

      <div className="rounded-md border border-line bg-subtle p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            className="rn-check mt-0.5"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "consent-error" : undefined}
          />
          <span className="text-heading">{DEALER_SIGNUP_CONSENT_WORDING}</span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="rn-field__error mt-2 ps-8">
            <AlertCircle aria-hidden="true" />
            <span>{errors.consent}</span>
          </p>
        ) : null}
        <p className="mt-3 ps-8 text-xs text-muted">
          How we look after your details:{" "}
          <a href="/privacy" className="rn-link">
            privacy notice
          </a>
          .
        </p>
        <LegalReviewMarker
          reviewedAt={LEGAL_REVIEWED_AT.dealerSignupConsent}
          className="mt-2 ps-8"
        />
      </div>

      <BotTraps elapsedRef={elapsed} />

      <button
        type="submit"
        className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
        disabled={pending}
      >
        {pending ? "Sending" : "Put my cars on Rynet"}
        <ArrowRight aria-hidden="true" />
      </button>
    </form>
  );
}
