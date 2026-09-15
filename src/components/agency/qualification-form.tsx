"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Mail,
  RotateCcw,
} from "lucide-react";
import * as React from "react";
import { useActionState } from "react";

import { submitAgencyEnquiry } from "@/app/actions/agency-enquiry";
import { AGENCY_EMAIL } from "@/components/agency/agency-content";
import { ChoiceGroup, Field, focusFirstInvalid } from "@/components/forms/multi-step";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { Button } from "@/components/ui/button";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";
import {
  AGENCY_CONSENT_WORDING,
  AGENCY_INTERESTS,
  type AgencyEnquiryState,
  agencyEnquirySchema,
  DEALERSHIP_SIZES,
  FIELD_STEP,
  URGENCIES,
} from "@/lib/agency-enquiry-schema";

const initial: AgencyEnquiryState = { status: "idle" };

/*
 * The field and choice primitives are the shared ones from components/forms/multi-step.tsx,
 * imported rather than redeclared. `Field` has to live at module scope: declared inside this
 * component it is a new function identity on every render, React unmounts and remounts the
 * subtree, and every uncontrolled input inside it goes blank. That once looked exactly like a
 * broken draft restore, and it was a component identity bug.
 */

/* Boxed SHOWROOM controls. Written out, so this form does not break if a shared constant moves. */
const INPUT = "rn-input mt-2";
const TEXTAREA = "rn-textarea mt-2";

const STEPS = [
  { title: "Your dealership", label: "Dealership", hint: "Three questions." },
  { title: "What you need", label: "What you need", hint: "Pick anything that applies." },
  { title: "How to reach you", label: "Contact details", hint: "Last step." },
] as const;

const STORAGE_KEY = "rynet-digital-qualification-v1";

/*
 * The consent sentence is the same constant the server action stores as evidence on the consent
 * record, imported from the schema module, so what the person ticks and what is recorded as agreed
 * cannot drift apart.
 */
const CONSENT_TEXT = AGENCY_CONSENT_WORDING;

type Draft = Record<string, string | string[]>;

/**
 * The qualification form behind every "Book a free review" button.
 *
 * Three steps rather than one long form, because a first step that is a wall of fields is the most
 * reliable way to lose a dealer principal who is on a phone between customers. The first step is
 * three questions and none of them is personal.
 *
 * Five things here are load-bearing and easy to break later.
 *
 * **Nothing unmounts.** Every field stays in the DOM and inactive steps carry the `hidden`
 * attribute. Conditionally rendered steps would drop values when moving back and forth, and the
 * final `FormData` would only hold the last step. `hidden` also takes them out of the tab order,
 * so keyboard focus never lands on a field nobody can see.
 *
 * **Progress is announced.** "Step 2 of 3" is the page's only `role="status"`, and focus moves to
 * the new step's heading on every change, so a screen reader user is told where they are rather
 * than silently relocated. The drawn progress bar is hidden from assistive technology.
 *
 * **A half-finished form survives a browser close.** Every change is written to localStorage and
 * restored on mount. It is the person's own answers on their own device, cleared on success and
 * on demand, and it never leaves the browser.
 *
 * **`elapsedMs` is stamped in `onSubmit`, not at render.** Computed at render, every genuine
 * enquiry looked like a bot to the server's timing check, which discarded it and reported success.
 *
 * **Continue and submit have distinct keys.** Without them React reuses one DOM node and flips
 * its `type` to "submit" while the browser is still handling the Continue click, which submits
 * an incomplete form, fails validation and wipes the first two steps.
 *
 * A pricing card can link here with `?interest=feeds` (any AGENCY_INTERESTS value); when there is
 * no restored draft, that interest arrives already ticked.
 */
export function QualificationForm() {
  const [state, formAction, pending] = useActionState(submitAgencyEnquiry, initial);
  const [step, setStep] = React.useState(0);
  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});
  const [restored, setRestored] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const renderedAt = React.useRef<number>(Date.now());
  const elapsedField = React.useRef<HTMLInputElement>(null);
  const shouldFocus = React.useRef(false);
  // Set when a render is about to paint validation errors, read once by the focus effect.
  const invalid = React.useRef<Record<string, string> | null>(null);

  // ------------------------------------------------------------------ draft persistence

  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    let any = false;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as Draft;

        for (const [name, value] of Object.entries(draft)) {
          const fields = form.elements.namedItem(name);
          if (!fields) continue;

          if (Array.isArray(value)) {
            for (const input of form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`)) {
              input.checked = value.includes(input.value);
            }
            any = any || value.length > 0;
            continue;
          }

          if (fields instanceof RadioNodeList) {
            for (const input of form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`)) {
              input.checked = input.value === value;
            }
          } else if (fields instanceof HTMLInputElement || fields instanceof HTMLTextAreaElement) {
            fields.value = value;
          }
          any = any || value.length > 0;
        }

        if (any) setRestored(true);
      }
    } catch {
      // A private window, cleared site data, or storage disabled. The form works without it.
    }

    // A pricing card's "Ask for a quote" link names the interest. A restored draft wins.
    if (!any) {
      const wanted = new URLSearchParams(window.location.search).get("interest");
      if (wanted && AGENCY_INTERESTS.some((option) => option.value === wanted)) {
        for (const input of form.querySelectorAll<HTMLInputElement>('input[name="interests"]')) {
          if (input.value === wanted) input.checked = true;
        }
      }
    }
  }, []);

  const saveDraft = React.useCallback(() => {
    const form = formRef.current;
    if (!form) return;

    try {
      const data = new FormData(form);
      const draft: Draft = {};

      for (const [name, value] of data.entries()) {
        if (typeof value !== "string") continue;
        // Never persist the honeypot or the timing stamp: one would give a returning visitor a
        // filled trap, the other would make a resumed form look instant.
        if (name === "hp" || name === "elapsedMs") continue;

        if (name === "interests") {
          draft.interests = [...((draft.interests as string[]) ?? []), value];
        } else {
          draft[name] = value;
        }
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or unavailable. Not worth surfacing.
    }
  }, []);

  const clearDraft = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do about it.
    }
  }, []);

  React.useEffect(() => {
    if (state.status === "success") clearDraft();
  }, [state.status, clearDraft]);

  // ------------------------------------------------------------------------- navigation

  // A server error can belong to an earlier step. Send the person to the first step with a
  // problem, or they are told something is wrong on a screen that looks fine.
  React.useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const steps = Object.keys(state.fieldErrors).map((field) => FIELD_STEP[field] ?? 2);
    const earliest = Math.min(...steps);
    if (Number.isFinite(earliest)) {
      invalid.current = state.fieldErrors;
      shouldFocus.current = true;
      setStep(earliest);
    }
  }, [state]);

  /*
   * A failed step outranks a completed one when both want focus in the same commit. See
   * focusFirstInvalid in components/forms/multi-step.tsx for why this is focus rather than a live
   * region. No dependency array: both triggers are refs, so there is nothing to compare.
   */
  React.useEffect(() => {
    const errors = invalid.current;
    if (errors) {
      invalid.current = null;
      shouldFocus.current = false;
      if (focusFirstInvalid(formRef.current, errors)) return;
    }

    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    headingRef.current?.focus();
  });

  const validateStep = (index: number): boolean => {
    const form = formRef.current;
    if (!form) return true;

    const data = new FormData(form);
    const parsed = agencyEnquirySchema.safeParse({
      dealership: data.get("dealership"),
      website: data.get("website") || undefined,
      size: data.get("size"),
      interests: data.getAll("interests"),
      urgency: data.get("urgency"),
      context: data.get("context") || undefined,
      name: data.get("name"),
      role: data.get("role") || undefined,
      email: data.get("email"),
      phone: data.get("phone"),
      consent: data.get("consent") === "on",
    });

    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const onThisStep: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if ((FIELD_STEP[field] ?? -1) === index && !onThisStep[field]) {
        onThisStep[field] = issue.message;
      }
    }

    setClientErrors(onThisStep);

    if (Object.keys(onThisStep).length > 0) {
      invalid.current = onThisStep;
      return false;
    }

    return true;
  };

  const goTo = (index: number) => {
    shouldFocus.current = true;
    setStep(index);
  };

  const next = () => {
    if (validateStep(step)) goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const errorFor = (name: string) =>
    clientErrors[name] ?? (state.status === "error" ? state.fieldErrors?.[name] : undefined);

  // ----------------------------------------------------------------------------- markup

  // `noUncheckedIndexedAccess` types STEPS[step] as possibly undefined, and it never is.
  const current = STEPS[step] ?? STEPS[0];
  const last = step >= STEPS.length - 1;

  if (state.status === "success") {
    return (
      <div role="status" className="py-6 text-center sm:py-10">
        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-subtle text-success"
        >
          <CheckCircle2 className="size-7" />
        </span>
        <p className="rn-h3 mt-5">{state.message}</p>
        <p className="mx-auto mt-3 max-w-md text-body">
          You get the written review whether or not anything comes of it. If it is urgent, email{" "}
          <a href={`mailto:${AGENCY_EMAIL}`} className="rn-link">
            {AGENCY_EMAIL}
          </a>{" "}
          and say so.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={saveDraft}
      onSubmit={() => {
        // Fires before the action, so the server reads the real elapsed time rather than zero.
        if (elapsedField.current) {
          elapsedField.current.value = String(Date.now() - renderedAt.current);
        }
      }}
    >
      {restored ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-subtle py-1.5 ps-4 pe-1.5">
          <p className="py-1.5 text-sm text-body">
            We brought back what you had already filled in.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              formRef.current?.reset();
              clearDraft();
              setRestored(false);
              setClientErrors({});
              goTo(0);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Start again
          </Button>
        </div>
      ) : null}

      {/*
        Progress. The sentence is the live region; the segmented bar and its labels say the same
        thing visually and are hidden from assistive technology.
      */}
      <div className="mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p role="status" aria-live="polite" className="text-sm font-semibold text-heading">
            Step {step + 1} of {STEPS.length}
          </p>
          <p className="text-sm text-muted">{current.hint}</p>
        </div>
        <ol aria-hidden="true" className="mt-3 grid grid-cols-3 gap-2">
          {STEPS.map((item, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li key={item.title} className="min-w-0">
                <span
                  className={`block h-1.5 rounded-full transition-colors duration-[var(--duration-element)] ${done || active ? "bg-heading" : "bg-line-strong"}`}
                />
                <span
                  className={`mt-2 flex min-w-0 items-start gap-1 text-xs leading-tight ${active ? "font-semibold text-heading" : done ? "text-body" : "text-muted"}`}
                >
                  {done ? <Check className="size-3.5 shrink-0" /> : null}
                  <span className="min-w-0 break-words">{item.label}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {state.status === "error" ? (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-md bg-danger-subtle px-4 py-3 text-sm text-heading"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <p>{state.message}</p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ step one */}
      <fieldset hidden={step !== 0} className="space-y-6">
        <legend className="sr-only">Your dealership</legend>
        <h2 ref={step === 0 ? headingRef : null} tabIndex={-1} className="rn-h3">
          Your dealership
        </h2>

        <Field name="dealership" label="Dealership name" error={errorFor("dealership")}>
          <input
            id="dealership"
            name="dealership"
            type="text"
            autoComplete="organization"
            aria-invalid={Boolean(errorFor("dealership"))}
            aria-describedby={errorFor("dealership") ? "dealership-error" : undefined}
            className={INPUT}
          />
        </Field>

        {/*
          "Website address" rather than "Website", because step two has an interest called
          "Website", and two controls with one accessible name in a form is ambiguous for anyone
          navigating by label.
        */}
        <Field
          name="website"
          label="Website address"
          hint="Optional. Leave blank if you do not have one yet."
          error={errorFor("website")}
        >
          <input
            id="website"
            name="website"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="yourdealership.co.za"
            aria-invalid={Boolean(errorFor("website"))}
            aria-describedby={
              [errorFor("website") ? "website-error" : null, "website-hint"]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={INPUT}
          />
        </Field>

        <ChoiceGroup
          name="size"
          legend="How many branches?"
          type="radio"
          options={DEALERSHIP_SIZES}
          error={errorFor("size")}
        />
      </fieldset>

      {/* ------------------------------------------------------------------ step two */}
      <fieldset hidden={step !== 1} className="space-y-6">
        <legend className="sr-only">What you need</legend>
        <h2 ref={step === 1 ? headingRef : null} tabIndex={-1} className="rn-h3">
          What you need
        </h2>

        <ChoiceGroup
          name="interests"
          legend="What are you thinking about?"
          hint="Pick anything that applies."
          type="checkbox"
          options={AGENCY_INTERESTS}
          error={errorFor("interests")}
        />

        <ChoiceGroup
          name="urgency"
          legend="When would you want to start?"
          type="radio"
          options={URGENCIES}
          error={errorFor("urgency")}
        />

        <Field
          name="context"
          label="Anything else worth knowing?"
          hint="Optional. What is not working, what you have tried, who you use now."
          error={errorFor("context")}
        >
          <textarea
            id="context"
            name="context"
            rows={4}
            aria-describedby="context-hint"
            className={TEXTAREA}
          />
        </Field>
      </fieldset>

      {/* ---------------------------------------------------------------- step three */}
      <fieldset hidden={step !== 2} className="space-y-6">
        <legend className="sr-only">How to reach you</legend>
        <h2 ref={step === 2 ? headingRef : null} tabIndex={-1} className="rn-h3">
          How to reach you
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="name" label="Your name" error={errorFor("name")}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errorFor("name"))}
              aria-describedby={errorFor("name") ? "name-error" : undefined}
              className={INPUT}
            />
          </Field>

          <Field name="role" label="Your role" hint="Optional." error={errorFor("role")}>
            <input
              id="role"
              name="role"
              type="text"
              autoComplete="organization-title"
              aria-describedby={errorFor("role") ? "role-hint role-error" : "role-hint"}
              className={INPUT}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="email" label="Email" error={errorFor("email")}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errorFor("email"))}
              aria-describedby={errorFor("email") ? "email-error" : undefined}
              className={INPUT}
            />
          </Field>

          <Field name="phone" label="Phone" error={errorFor("phone")}>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errorFor("phone"))}
              aria-describedby={errorFor("phone") ? "phone-error" : undefined}
              className={INPUT}
            />
          </Field>
        </div>

        <div className="rounded-md border border-line bg-subtle p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-body">
            <input
              type="checkbox"
              name="consent"
              className="rn-check mt-0.5 shrink-0"
              aria-invalid={Boolean(errorFor("consent"))}
              aria-describedby={errorFor("consent") ? "consent-error" : undefined}
            />
            <span>{CONSENT_TEXT}</span>
          </label>
          {errorFor("consent") ? (
            <p id="consent-error" className="rn-field__error mt-2 ps-8">
              <AlertCircle aria-hidden="true" />
              <span>{errorFor("consent")}</span>
            </p>
          ) : null}
          <LegalReviewMarker reviewedAt={LEGAL_REVIEWED_AT.agencyConsent} className="mt-3 ps-8" />
        </div>
      </fieldset>

      {/*
        The honeypot. Off screen rather than `sr-only`: an sr-only element is one pixel and still
        in the viewport, so some password managers fill it and turn a real person into a
        discarded submission.
      */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="hp">Leave this empty</label>
        <input id="hp" name="hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={elapsedField} type="hidden" name="elapsedMs" defaultValue="0" />

      {/* The keys are load-bearing. See the fifth point in the comment above the component. */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {step > 0 ? (
          <Button
            key="nav-back"
            type="button"
            variant="outline"
            size="lg"
            onClick={() => goTo(step - 1)}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        ) : null}

        {last ? (
          <Button
            key="nav-submit"
            type="submit"
            size="lg"
            disabled={pending}
            className="min-w-0 flex-1 sm:flex-none"
          >
            {pending ? "Sending" : "Send it for review"}
            {pending ? null : <ArrowRight aria-hidden="true" />}
          </Button>
        ) : (
          <Button
            key="nav-continue"
            type="button"
            size="lg"
            onClick={next}
            className="min-w-0 flex-1 sm:flex-none"
          >
            Continue
            <ArrowRight aria-hidden="true" />
          </Button>
        )}

        <p className="flex basis-full items-center gap-2 text-sm text-muted sm:basis-auto">
          {last ? <Mail aria-hidden="true" className="size-4 shrink-0" /> : null}
          {last ? "We reply by email." : "Nothing is sent until the last step."}
        </p>
      </div>
    </form>
  );
}
