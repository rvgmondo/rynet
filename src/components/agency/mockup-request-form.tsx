"use client";

import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import * as React from "react";

import { submitMockupRequest } from "@/app/actions/mockup-request";
import { BotTraps, Field, INPUT_CLASS, TEXTAREA_CLASS } from "@/components/forms/multi-step";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { buttonClasses } from "@/components/ui/button-classes";
import { MOCKUP_OFFER } from "@/content/agency/mockup-offer";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";
import { MOCKUP_CONSENT_WORDING, type MockupRequestState } from "@/lib/mockup-request-schema";

/**
 * The free mockup request: who you are, and where we can see your dealership. One screen.
 */

const initial: MockupRequestState = { status: "idle" };

export function MockupRequestForm() {
  const [state, action, pending] = React.useActionState(submitMockupRequest, initial);
  const elapsed = React.useRef<HTMLInputElement>(null);
  const started = React.useRef(Date.now());
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const describe = (name: string) => (errors[name] ? `${name}-error` : undefined);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <span className="grid size-12 place-items-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <h2 className="rn-h3">Your mockup is on its way</h2>
        <p className="text-body">{state.message}</p>
        <p className="text-sm text-muted">
          If there is anything you would like us to see first, a newer logo or your best photos,
          WhatsApp them to us when we send the link.
        </p>
      </div>
    );
  }

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
        <h2 className="rn-h3">Get your free mockup</h2>
        <p className="mt-1 text-sm text-body">
          A private link to your new homepage, within {MOCKUP_OFFER.turnaround}.
        </p>
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

      <Field
        name="website"
        label="Your website"
        optional
        hint="No website? Tell us where your cars are listed instead, in the notes."
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

      <Field name="notes" label="Anything we should know" optional error={errors.notes}>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={TEXTAREA_CLASS}
          placeholder="We are a Toyota and Suzuki dealership, mostly bakkies and family cars."
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
          <span className="text-heading">{MOCKUP_CONSENT_WORDING}</span>
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
        <LegalReviewMarker reviewedAt={LEGAL_REVIEWED_AT.mockupConsent} className="mt-2 ps-8" />
      </div>

      <BotTraps elapsedRef={elapsed} />

      <button
        type="submit"
        className={buttonClasses({ variant: "primary", size: "lg", block: "mobile" })}
        disabled={pending}
      >
        {pending ? "Sending" : "Send me my mockup"}
        <ArrowRight aria-hidden="true" />
      </button>
    </form>
  );
}
