"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";

import { submitAgencyEnquiry } from "@/app/actions/agency-enquiry";
import { Button } from "@/components/ui/button";
import {
  AGENCY_INTERESTS,
  type AgencyEnquiryState,
  agencyEnquirySchema,
  DEALERSHIP_SIZES,
  FIELD_STEP,
  URGENCIES,
} from "@/lib/agency-enquiry-schema";

const initial: AgencyEnquiryState = { status: "idle" };

const LABEL_CLASS = "block text-sm font-semibold";

/**
 * A labelled field.
 *
 * At module scope, and it has to stay there. Defined inside the form component it is a new
 * function identity on every render, so React sees a different component type, unmounts the
 * subtree and mounts a fresh one. Every uncontrolled input inside it is then blank again.
 *
 * The symptom was that restoring a saved draft filled the inputs and then immediately
 * cleared them, because `setRestored(true)` re-rendered and remounted the lot. The same
 * thing happened on every step change and every validation error, quietly discarding what
 * the person had typed. It looked like a persistence bug and it was a component identity
 * bug.
 */
function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={LABEL_CLASS}>
        {label}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className="mt-0.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const STEPS = [
  { title: "Your dealership", hint: "Three questions." },
  { title: "What you need", hint: "Pick anything that applies." },
  { title: "How to reach you", hint: "Last step." },
] as const;

const STORAGE_KEY = "rynet-digital-qualification-v1";

type Draft = Record<string, string | string[]>;

/**
 * The qualification form.
 *
 * Three steps rather than one long form, because step one being a wall of fields is the
 * single most reliable way to lose a dealer principal who is on a phone between customers.
 * The first step is three questions and none of them is personal.
 *
 * Four things here are load-bearing and easy to break later.
 *
 * **Nothing unmounts.** Every field stays in the DOM and inactive steps carry the `hidden`
 * attribute. If steps were conditionally rendered, moving back and forth would drop values,
 * and worse, the final `FormData` would only contain the last step. `hidden` also removes
 * them from the tab order for free, so keyboard focus never lands on a field nobody can see.
 *
 * **Progress is announced.** The step line is `role="status"` with `aria-live="polite"`, and
 * focus moves to the new step's heading on every change, so a screen reader user is told
 * where they are rather than being silently relocated.
 *
 * **A half-finished form survives a browser close.** Every change is written to
 * localStorage and restored on mount, which is the brief's requirement. Nothing sensitive
 * is stored: it is the person's own answers on their own device, cleared on success and on
 * demand, and it never leaves the browser.
 *
 * **`elapsedMs` is stamped in `onSubmit`, not at render.** Computing it during render made
 * every genuine enquiry on the marketplace look like a bot to the server's timing check,
 * which silently discarded it and reported success. That bug is not being repeated here.
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

  // ------------------------------------------------------------------ draft persistence

  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const draft = JSON.parse(saved) as Draft;
      let any = false;

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
    } catch {
      // A private window, cleared site data, or storage disabled entirely. The form works
      // without it, so there is nothing to report and nothing to recover.
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
        // Never persist the honeypot or the timing stamp: one would give a returning
        // visitor a filled trap, the other would make a resumed form look instant.
        if (name === "hp" || name === "elapsedMs") continue;

        if (name === "interests") {
          draft.interests = [...((draft.interests as string[]) ?? []), value];
        } else {
          draft[name] = value;
        }
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or unavailable. Losing the draft is a worse outcome than the form not
      // working, so it is not worth surfacing.
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

  // A server error can belong to an earlier step. Send the person to the first one that has
  // a problem, or they are told something is wrong on a screen that looks fine.
  React.useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const steps = Object.keys(state.fieldErrors).map((field) => FIELD_STEP[field] ?? 2);
    const earliest = Math.min(...steps);
    if (Number.isFinite(earliest)) {
      shouldFocus.current = true;
      setStep(earliest);
    }
  }, [state]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus follows a step change, which is what `step` tracks.
  React.useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    headingRef.current?.focus();
  }, [step]);

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
    return Object.keys(onThisStep).length === 0;
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

  // `noUncheckedIndexedAccess` types a bare STEPS[step] as possibly undefined, and it never
  // is: `step` only ever moves through clamped setters. Resolved once rather than asserted
  // at each use.
  const current = STEPS[step] ?? STEPS[0];

  const inputClass =
    "mt-1 min-h-11 w-full rounded-md border border-line-interactive bg-surface px-3 text-sm";
  const labelClass = LABEL_CLASS;

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-lg bg-success-subtle p-8 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-9 text-success" />
        <p className="mt-4 font-display text-lg font-bold">{state.message}</p>
        <p className="measure mx-auto mt-3 text-sm text-ink-secondary">
          You will get the written review whether or not anything comes of it. If it is urgent,
          email <a href="mailto:digital@rynet.co.za">digital@rynet.co.za</a> and say so.
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
        // Fires before the action, so the value the server reads is the real elapsed time
        // rather than zero. This exact line is the difference between a form that works and
        // one that reports success while discarding everything.
        if (elapsedField.current) {
          elapsedField.current.value = String(Date.now() - renderedAt.current);
        }
      }}
      className="rounded-lg border border-line p-6 sm:p-8"
    >
      {restored ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-sunken p-4">
          <p className="text-sm text-ink-secondary">
            We brought back what you had already filled in.
          </p>
          <button
            type="button"
            onClick={() => {
              formRef.current?.reset();
              clearDraft();
              setRestored(false);
              setClientErrors({});
              goTo(0);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-surface-raised"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Start again
          </button>
        </div>
      ) : null}

      {/*
        Progress. A live region rather than a decorative bar, so the change is announced.
        The bar itself is aria-hidden because the sentence already says it.
      */}
      <div className="mb-6">
        <p role="status" aria-live="polite" className="text-sm font-semibold">
          Step {step + 1} of {STEPS.length}: {current.title}
          <span className="ml-2 font-normal text-ink-muted">{current.hint}</span>
        </p>
        <ol aria-hidden="true" className="mt-3 flex gap-2">
          {STEPS.map((item, index) => (
            <li
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${
                index <= step ? "bg-accent-solid" : "bg-surface-sunken"
              }`}
            />
          ))}
        </ol>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mb-6 rounded-md bg-danger-subtle p-4 text-sm text-ink">
          {state.message}
        </p>
      ) : null}

      {/* ------------------------------------------------------------------ step one */}
      <fieldset hidden={step !== 0} className="space-y-5">
        <legend className="sr-only">Your dealership</legend>
        <h2 ref={step === 0 ? headingRef : null} tabIndex={-1} className="text-xl">
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
            className={inputClass}
          />
        </Field>

        {/*
          "Website address" rather than "Website", because step two has an interest called
          "Website" and two controls with the same accessible name in one form is genuinely
          ambiguous for anyone navigating by label rather than by sight.
        */}
        <Field
          name="website"
          label="Website address"
          hint="Leave blank if you do not have one yet."
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
            className={inputClass}
          />
        </Field>

        <fieldset>
          <legend className={labelClass}>How many branches?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DEALERSHIP_SIZES.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-sunken has-[:checked]:border-accent has-[:checked]:bg-accent-subtle"
              >
                <input
                  type="radio"
                  name="size"
                  value={option.value}
                  className="size-4 accent-[var(--rn-accent-solid)]"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errorFor("size") ? (
            <p className="mt-1 text-xs font-medium text-danger">{errorFor("size")}</p>
          ) : null}
        </fieldset>
      </fieldset>

      {/* ------------------------------------------------------------------ step two */}
      <fieldset hidden={step !== 1} className="space-y-5">
        <legend className="sr-only">What you need</legend>
        <h2 ref={step === 1 ? headingRef : null} tabIndex={-1} className="text-xl">
          What you need
        </h2>

        <fieldset>
          <legend className={labelClass}>What are you thinking about?</legend>
          <p className="mt-0.5 text-xs text-ink-muted">Pick anything that applies.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {AGENCY_INTERESTS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-sunken has-[:checked]:border-accent has-[:checked]:bg-accent-subtle"
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={option.value}
                  className="size-4 accent-[var(--rn-accent-solid)]"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errorFor("interests") ? (
            <p className="mt-1 text-xs font-medium text-danger">{errorFor("interests")}</p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className={labelClass}>When would you want to start?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {URGENCIES.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-sunken has-[:checked]:border-accent has-[:checked]:bg-accent-subtle"
              >
                <input
                  type="radio"
                  name="urgency"
                  value={option.value}
                  className="size-4 accent-[var(--rn-accent-solid)]"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errorFor("urgency") ? (
            <p className="mt-1 text-xs font-medium text-danger">{errorFor("urgency")}</p>
          ) : null}
        </fieldset>

        <Field
          name="context"
          label="Anything else worth knowing?"
          hint="What is not working, what you have tried, who you are using now. Optional."
          error={errorFor("context")}
        >
          <textarea
            id="context"
            name="context"
            rows={4}
            aria-describedby="context-hint"
            className="mt-1 w-full rounded-md border border-line-interactive bg-surface p-3 text-sm"
          />
        </Field>
      </fieldset>

      {/* ---------------------------------------------------------------- step three */}
      <fieldset hidden={step !== 2} className="space-y-5">
        <legend className="sr-only">How to reach you</legend>
        <h2 ref={step === 2 ? headingRef : null} tabIndex={-1} className="text-xl">
          How to reach you
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label="Your name" error={errorFor("name")}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errorFor("name"))}
              aria-describedby={errorFor("name") ? "name-error" : undefined}
              className={inputClass}
            />
          </Field>

          <Field name="role" label="Your role" hint="Optional." error={errorFor("role")}>
            <input
              id="role"
              name="role"
              type="text"
              autoComplete="organization-title"
              aria-describedby="role-hint"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="email" label="Email" error={errorFor("email")}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errorFor("email"))}
              aria-describedby={errorFor("email") ? "email-error" : undefined}
              className={inputClass}
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
              className={inputClass}
            />
          </Field>
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consent"
              className="mt-0.5 size-4 shrink-0 accent-[var(--rn-accent-solid)]"
              aria-invalid={Boolean(errorFor("consent"))}
              aria-describedby={errorFor("consent") ? "consent-error" : undefined}
            />
            <span className="text-ink-secondary">
              I agree that Rynet may use these details to reply to this enquiry about Rynet
              Digital&apos;s services, and to contact me about it.
            </span>
          </label>
          {errorFor("consent") ? (
            <p id="consent-error" className="mt-1 text-xs font-medium text-danger">
              {errorFor("consent")}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/*
        The honeypot. Positioned off screen rather than `sr-only`: an sr-only element is one
        pixel and still technically in the viewport, so some password managers fill it and
        turn a real person into a discarded submission.
      */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="hp">Leave this empty</label>
        <input id="hp" name="hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={elapsedField} type="hidden" name="elapsedMs" defaultValue="0" />

      {/*
        The keys are load-bearing. Without them React reconciles Continue and Send it as the
        same element in the same position, reuses the DOM node, and only changes `type` from
        "button" to "submit". Clicking Continue on the second to last step then set state,
        React flipped the type during that update, and the browser performed the default
        action for the click it was still processing: the form submitted.
        
        The action failed validation and React reset the form, so every answer from the
        first two steps was silently wiped on the way to the last one. The screen looked
        completely normal. Distinct keys force two separate nodes and the problem cannot
        recur.
      */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {step > 0 ? (
          <Button key="nav-back" type="button" variant="secondary" onClick={() => goTo(step - 1)}>
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        ) : null}

        {step < STEPS.length - 1 ? (
          <Button key="nav-continue" type="button" onClick={next}>
            Continue
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button key="nav-submit" type="submit" disabled={pending}>
            {pending ? "Sending" : "Send it"}
            {pending ? null : <ArrowRight aria-hidden="true" />}
          </Button>
        )}

        <p className="text-xs text-ink-muted">
          {step < STEPS.length - 1
            ? "Nothing is sent until the last step."
            : "We reply within one working day."}
        </p>
      </div>
    </form>
  );
}
