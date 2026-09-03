"use client";

import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * The multi-step form machinery, extracted so it exists once.
 *
 * Two React hazards cost real debugging time on the agency form, and both produced the same
 * symptom: everything the person had typed silently disappeared while the screen looked
 * completely normal. Neither is obvious from reading the component that has them. So the
 * machinery lives here, with the fixes baked in, and a second form cannot reintroduce them.
 *
 * **Hazard one: a component defined inside a component.** `Field` below is at module scope
 * and must stay there. Declared inside the form, it is a new function identity on every
 * render, so React sees a different component type, unmounts the subtree and mounts a fresh
 * one. Every uncontrolled input inside it goes blank. It looks exactly like a broken
 * persistence layer.
 *
 * **Hazard two: two buttons reconciled as one.** `StepNav` gives the Continue button and the
 * submit button distinct keys. Without them React reuses a single DOM node and only changes
 * `type` from "button" to "submit". Setting state in the click handler flips that attribute
 * while the browser is still processing the click, so it performs the default action and
 * submits the form. On the agency form that submitted an incomplete body, the action failed
 * validation, React reset the form, and the first two steps were wiped on the way to the
 * third.
 *
 * Everything else here is the accessibility and anti-spam behaviour the brief requires:
 * announced progress, focus moving to the new step's heading, steps hidden rather than
 * unmounted so nothing is lost and nothing hidden is reachable by keyboard, a draft that
 * survives a browser close, and a timing stamp taken on submit rather than at render.
 */

export const LABEL_CLASS = "block text-sm font-semibold";
export const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-md border border-line-interactive bg-surface px-3 text-sm";
export const CHOICE_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-sunken has-[:checked]:border-accent has-[:checked]:bg-accent-subtle";

/** A labelled field. Module scope, deliberately. See hazard one above. */
export function Field({
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

/** A group of radios or checkboxes with its own legend, error and 44px targets. */
export function ChoiceGroup({
  name,
  legend,
  hint,
  type,
  options,
  error,
  columns = 2,
}: {
  name: string;
  legend: string;
  hint?: string;
  type: "radio" | "checkbox";
  options: readonly { value: string; label: string }[];
  error?: string;
  columns?: 1 | 2;
}) {
  return (
    <fieldset>
      <legend className={LABEL_CLASS}>{legend}</legend>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      <div className={`mt-2 grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((option) => (
          <label key={option.value} className={CHOICE_CLASS}>
            <input
              type={type}
              name={name}
              value={option.value}
              className="size-4 accent-[var(--rn-accent-solid)]"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </fieldset>
  );
}

/**
 * Progress. A live region rather than a decorative bar, so the change is announced. The bar
 * itself is aria-hidden because the sentence already says it.
 */
export function StepProgress({
  step,
  steps,
}: {
  step: number;
  steps: readonly { title: string; hint: string }[];
}) {
  const current = steps[step] ?? steps[0];
  if (!current) return null;

  return (
    <div className="mb-6">
      <p role="status" aria-live="polite" className="text-sm font-semibold">
        Step {step + 1} of {steps.length}: {current.title}
        <span className="ml-2 font-normal text-ink-muted">{current.hint}</span>
      </p>
      <ol aria-hidden="true" className="mt-3 flex gap-2">
        {steps.map((item, index) => (
          <li
            key={item.title}
            className={`h-1.5 flex-1 rounded-full ${
              index <= step ? "bg-accent-solid" : "bg-surface-sunken"
            }`}
          />
        ))}
      </ol>
    </div>
  );
}

/** Back, Continue and submit. The keys are the fix for hazard two and must not be removed. */
export function StepNav({
  step,
  stepCount,
  pending,
  submitLabel,
  pendingLabel = "Sending",
  onBack,
  onNext,
  note,
}: {
  step: number;
  stepCount: number;
  pending: boolean;
  submitLabel: string;
  pendingLabel?: string;
  onBack: () => void;
  onNext: () => void;
  note?: string;
}) {
  const last = step >= stepCount - 1;

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      {step > 0 ? (
        <Button key="nav-back" type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
      ) : null}

      {last ? (
        <Button key="nav-submit" type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
          {pending ? null : <ArrowRight aria-hidden="true" />}
        </Button>
      ) : (
        <Button key="nav-continue" type="button" onClick={onNext}>
          Continue
          <ArrowRight aria-hidden="true" />
        </Button>
      )}

      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
    </div>
  );
}

/**
 * The honeypot and the timing stamp.
 *
 * Off screen rather than `sr-only`: an sr-only element is one pixel and still technically in
 * the viewport, so some password managers fill it and turn a real person into a discarded
 * submission.
 */
export function BotTraps({ elapsedRef }: { elapsedRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <>
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="hp">Leave this empty</label>
        <input id="hp" name="hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={elapsedRef} type="hidden" name="elapsedMs" defaultValue="0" />
    </>
  );
}

type Draft = Record<string, string | string[]>;

type ActionState = { status: string; fieldErrors?: Record<string, string> };

export type MultiStepOptions = {
  /** localStorage key. Version it, so a changed field set does not restore into nothing. */
  storageKey: string;
  steps: readonly { title: string; hint: string }[];
  /** Which step each field belongs to, so a server error returns to the right screen. */
  fieldStep: Record<string, number>;
  /** The server action state, watched for field errors. */
  state: ActionState;
  /** Names that appear more than once, such as a checkbox group. */
  arrayFields?: readonly string[];
};

/**
 * Owns step state, draft persistence, focus management and the timing stamp.
 *
 * Validation stays with the caller, because the schema is form-specific: pass a validator to
 * `next()` that returns the errors for the step it was given.
 */
export function useMultiStepForm({
  storageKey,
  steps,
  fieldStep,
  state,
  arrayFields = [],
}: MultiStepOptions) {
  const [step, setStep] = React.useState(0);
  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});
  const [restored, setRestored] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const elapsedField = React.useRef<HTMLInputElement>(null);
  const renderedAt = React.useRef<number>(Date.now());
  const shouldFocus = React.useRef(false);

  const arrays = React.useMemo(() => new Set(arrayFields), [arrayFields]);

  // ---------------------------------------------------------------- draft persistence

  // biome-ignore lint/correctness/useExhaustiveDependencies: restores once, on mount, from the key this form was created with.
  React.useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    try {
      const saved = window.localStorage.getItem(storageKey);
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
        } else if (
          fields instanceof HTMLInputElement ||
          fields instanceof HTMLTextAreaElement ||
          fields instanceof HTMLSelectElement
        ) {
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
        // Never persist the honeypot or the timing stamp: one would give a returning visitor
        // a filled trap, the other would make a resumed form look instant to the server.
        if (name === "hp" || name === "elapsedMs") continue;

        if (arrays.has(name)) {
          draft[name] = [...((draft[name] as string[]) ?? []), value];
        } else {
          draft[name] = value;
        }
      }

      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Storage full or unavailable. Losing the draft is a better outcome than the form
      // failing, so it is not worth surfacing.
    }
  }, [arrays, storageKey]);

  const clearDraft = React.useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to do about it.
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (state.status === "success") clearDraft();
  }, [state.status, clearDraft]);

  // --------------------------------------------------------------------- navigation

  const goTo = React.useCallback(
    (index: number) => {
      shouldFocus.current = true;
      setStep(Math.max(0, Math.min(index, steps.length - 1)));
    },
    [steps.length],
  );

  // A server error can belong to an earlier step. Send the person to the first one that has a
  // problem, or they are told something is wrong on a screen that looks fine.
  React.useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const indexes = Object.keys(state.fieldErrors).map((field) => fieldStep[field] ?? 0);
    if (indexes.length === 0) return;
    goTo(Math.min(...indexes));
  }, [state, fieldStep, goTo]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus follows a step change, which is what `step` tracks.
  React.useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    headingRef.current?.focus();
  }, [step]);

  const next = React.useCallback(
    (validate: (index: number, data: FormData) => Record<string, string>) => {
      const form = formRef.current;
      if (!form) return;

      const errors = validate(step, new FormData(form));
      setClientErrors(errors);
      if (Object.keys(errors).length === 0) goTo(step + 1);
    },
    [step, goTo],
  );

  const startAgain = React.useCallback(() => {
    formRef.current?.reset();
    clearDraft();
    setRestored(false);
    setClientErrors({});
    goTo(0);
  }, [clearDraft, goTo]);

  const errorFor = React.useCallback(
    (name: string) => clientErrors[name] ?? state.fieldErrors?.[name],
    [clientErrors, state],
  );

  const formProps = {
    ref: formRef,
    onChange: saveDraft,
    onSubmit: () => {
      // Fires before the action, so the value the server reads is the real elapsed time
      // rather than zero. Computing this during render made every genuine enquiry on the
      // marketplace look like a bot, and the form reported success while writing nothing.
      if (elapsedField.current) {
        elapsedField.current.value = String(Date.now() - renderedAt.current);
      }
    },
  };

  return {
    step,
    steps,
    goTo,
    next,
    back: () => goTo(step - 1),
    restored,
    startAgain,
    errorFor,
    formRef,
    headingRef,
    elapsedField,
    formProps,
  };
}

/** The "we brought your answers back" banner, shown when a draft was restored. */
export function RestoredNotice({ onStartAgain }: { onStartAgain: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-sunken p-4">
      <p className="text-sm text-ink-secondary">We brought back what you had already filled in.</p>
      <button
        type="button"
        onClick={onStartAgain}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-surface-raised"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Start again
      </button>
    </div>
  );
}
