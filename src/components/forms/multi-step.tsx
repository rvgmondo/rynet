"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
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

/*
 * The shared form primitives, in the SHOWROOM style.
 *
 * Other forms import these constants (the enquiry dialog on a listing, the agency qualification
 * form, the two-factor page), so they are the single place a boxed field, a sentence-case label
 * and a choice card are defined for hand-written markup. They resolve to the same component
 * classes as `@/components/ui` (`.rn-input`, `.rn-select`, `.rn-field__label`), so a field built
 * here and a field built with `<Input>` cannot drift apart.
 *
 * A choice is a CARD: a white 44px-plus row with a 3:1 border, and a checked state that draws a
 * 2px navy edge and a tinted ground. `has-[:checked]` keeps that working without JavaScript.
 */
export const LABEL_CLASS = "block text-sm font-semibold leading-snug text-heading";
export const INPUT_CLASS = "rn-input mt-2";
export const SELECT_CLASS = "rn-select mt-2";
export const TEXTAREA_CLASS = "rn-textarea mt-2";
export const CHOICE_CLASS =
  "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-sm border border-line-control bg-card px-4 py-2.5 text-sm text-heading shadow-xs transition-[border-color,background-color,box-shadow] duration-[var(--duration-micro)] hover:border-heading has-[:checked]:border-heading has-[:checked]:bg-subtle has-[:checked]:font-semibold has-[:checked]:shadow-[inset_0_0_0_1px_var(--rn-heading)]";

/** The error line under a control: an icon and the words, in the danger colour. */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="rn-field__error mt-2">
      <AlertCircle aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** A labelled field. Module scope, deliberately. See hazard one above. */
export function Field({
  name,
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  /** Adds a muted "(optional)" after the label. */
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    /*
     * Label, control, then the hint and the error under the control, the same order as the
     * `Field` in components/ui. With the hint below, two fields side by side keep their boxes
     * level whether or not one of them has a hint, which the old ruled layout had to fight for.
     */
    <div className="min-w-0">
      <label htmlFor={name} className={LABEL_CLASS}>
        {label}
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="rn-field__hint mt-1.5">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </div>
  );
}

const CHOICE_COLUMNS = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
} as const;

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
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={LABEL_CLASS}>{legend}</legend>
      {hint ? <p className="rn-field__hint mt-1">{hint}</p> : null}
      <div className={`mt-3 grid gap-2 ${CHOICE_COLUMNS[columns]}`}>
        {options.map((option) => (
          <label key={option.value} className={CHOICE_CLASS}>
            <input
              type={type}
              name={name}
              value={option.value}
              /*
               * The description goes on every control in the group, not on the fieldset.
               * A description on a fieldset is not reliably read when a radio inside it
               * takes focus, and focus landing on the control is how the person is told
               * what went wrong.
               */
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${name}-error` : undefined}
              className={type === "radio" ? "rn-radio" : "rn-check"}
            />
            <span className="min-w-0 flex-1">{option.label}</span>
          </label>
        ))}
      </div>
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </fieldset>
  );
}

/**
 * Put focus on the first control that failed, and report whether it found one.
 *
 * Validation was silent. Pressing Continue on an unanswered step redrew the same screen
 * with red text somewhere on it, focus still sitting on the Continue button, and nothing
 * announced. A screen reader user got no indication at all that anything had happened,
 * which is SC 4.1.3, and a sighted keyboard user had to hunt for the message.
 *
 * Focus is the fix rather than a live region, and deliberately so. Every control on these
 * forms already carries `aria-invalid` and an `aria-describedby` pointing at its own error
 * text, so landing on the control reads the label, the state and the reason in one go, and
 * leaves the caret in the field that needs typing. Announcing the same string a second time
 * through `role="alert"` would only make the reader say it twice.
 *
 * DOM order, not the order the validator happened to return, so the person is sent to the
 * first problem down the page. Inactive steps stay mounted with the `hidden` attribute so
 * that nothing typed is lost, which means their controls are still queryable and must be
 * skipped.
 */
export function focusFirstInvalid(
  form: HTMLFormElement | null,
  errors: Record<string, string>,
): boolean {
  if (!form) return false;

  const names = new Set(Object.keys(errors));
  if (names.size === 0) return false;

  for (const control of form.querySelectorAll<HTMLElement>("input, select, textarea")) {
    const { name } = control as HTMLInputElement;
    if (!name || !names.has(name)) continue;
    if (control.closest("[hidden]")) continue;
    if ((control as HTMLInputElement).type === "hidden") continue;

    control.focus();
    return true;
  }

  return false;
}

/** Written out in full so Tailwind can see every class it has to generate. */
const PROGRESS_COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

type StepDefinition = {
  title: string;
  hint: string;
  /** A short name for the progress indicator. Falls back to the title. */
  label?: string;
};

/**
 * Progress. The sentence is a live region, so the change is announced. The segmented bar and
 * its labels are aria-hidden because the sentence and the step heading already say it.
 *
 * The sentence is only "Step 2 of 3". It used to carry the step title and hint as well, which
 * put the title on screen twice (here and in the heading under it) and orphaned a word on a
 * phone.
 */
export function StepProgress({ step, steps }: { step: number; steps: readonly StepDefinition[] }) {
  const current = steps[step] ?? steps[0];
  if (!current) return null;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p role="status" aria-live="polite" className="text-sm font-semibold text-heading">
          Step {step + 1} of {steps.length}
        </p>
        <p className="text-sm text-muted">{current.hint}</p>
      </div>
      <ol aria-hidden="true" className={`mt-3 grid gap-2 ${PROGRESS_COLUMNS[steps.length] ?? ""}`}>
        {steps.map((item, index) => {
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
                <span className="min-w-0 break-words">{item.label ?? item.title}</span>
              </span>
            </li>
          );
        })}
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
    /*
     * On a phone the forward action fills the row beside Back, so the thumb target is the full
     * width that is left; from 640px both sit at their natural width. Back comes first in the
     * DOM and on screen, so the tab order and the visual order agree at every width.
     */
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      {step > 0 ? (
        <Button key="nav-back" type="button" variant="outline" size="lg" onClick={onBack}>
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
          {pending ? pendingLabel : submitLabel}
          {pending ? null : <ArrowRight aria-hidden="true" />}
        </Button>
      ) : (
        <Button
          key="nav-continue"
          type="button"
          size="lg"
          onClick={onNext}
          className="min-w-0 flex-1 sm:flex-none"
        >
          Continue
          <ArrowRight aria-hidden="true" />
        </Button>
      )}

      {note ? <p className="basis-full text-sm text-muted sm:basis-auto">{note}</p> : null}
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

type Validator = (index: number, data: FormData) => Record<string, string>;

/** Fired on the form element after a saved draft has been written back into its controls. */
export const DRAFT_RESTORED_EVENT = "rn:draft-restored";

export type MultiStepOptions = {
  /** localStorage key. Version it, so a changed field set does not restore into nothing. */
  storageKey: string;
  steps: readonly StepDefinition[];
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
  // Set when a render is about to paint validation errors, read once by the focus effect.
  const invalid = React.useRef<Record<string, string> | null>(null);

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

      if (any) {
        setRestored(true);
        // Writing `.value` fires no change event, so a control that derives what it offers
        // from another control's value (model suggestions that depend on the make) has no
        // other way to learn that the values under it just changed.
        form.dispatchEvent(new CustomEvent(DRAFT_RESTORED_EVENT));
      }
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
    invalid.current = state.fieldErrors;
    goTo(Math.min(...indexes));
  }, [state, fieldStep, goTo]);

  /*
   * One effect for both kinds of focus move, because they compete for the same commit and
   * only one of them can win. A step the person completed sends focus to the new heading. A
   * step that failed sends it to the control that failed, which outranks the heading: being
   * told where you are is worth less than being told what is wrong.
   *
   * No dependency array on purpose. Both triggers are refs, so there is nothing for React to
   * compare, and the body costs two null checks on the renders where neither is set.
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

  const next = React.useCallback(
    (validate: Validator) => {
      const form = formRef.current;
      if (!form) return;

      const errors = validate(step, new FormData(form));
      setClientErrors(errors);

      if (Object.keys(errors).length === 0) {
        goTo(step + 1);
        return;
      }

      invalid.current = errors;
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

  /** Stamps the elapsed time. Fires before the action, which is what makes the stamp real. */
  const stampElapsed = React.useCallback(() => {
    // Computing this during render made every genuine enquiry on the marketplace look like a
    // bot, and the form reported success while writing nothing.
    if (elapsedField.current) {
      elapsedField.current.value = String(Date.now() - renderedAt.current);
    }
  }, []);

  /**
   * Checks every step once more on submit, and stops the submit if anything fails.
   *
   * The last step used to go straight to the server. A value the browser accepts and the schema
   * does not (a phone number with letters in it) came back as a field error AFTER React had reset
   * the form, which wiped the first two steps as well. Calling `preventDefault` in this handler
   * stops React dispatching the action at all, so nothing is sent and nothing is reset.
   */
  const guardSubmit = React.useCallback(
    (validate: Validator, event: React.FormEvent<HTMLFormElement>): boolean => {
      stampElapsed();
      const data = new FormData(event.currentTarget);

      const errors: Record<string, string> = {};
      let firstFailing = -1;
      for (let index = 0; index < steps.length; index += 1) {
        const found = validate(index, data);
        if (Object.keys(found).length > 0 && firstFailing === -1) firstFailing = index;
        Object.assign(errors, found);
      }

      if (firstFailing === -1) return true;

      event.preventDefault();
      setClientErrors(errors);
      invalid.current = errors;
      if (firstFailing !== step) goTo(firstFailing);
      return false;
    },
    [goTo, stampElapsed, step, steps.length],
  );

  const formProps = {
    ref: formRef,
    onChange: saveDraft,
    onSubmit: stampElapsed,
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
    guardSubmit,
  };
}

/** The "we brought your answers back" banner, shown when a draft was restored. */
export function RestoredNotice({ onStartAgain }: { onStartAgain: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-subtle py-1.5 ps-4 pe-1.5">
      <p className="py-1.5 text-sm text-body">We brought back what you had already filled in.</p>
      <Button type="button" variant="ghost" size="sm" onClick={onStartAgain}>
        <RotateCcw aria-hidden="true" />
        Start again
      </Button>
    </div>
  );
}
