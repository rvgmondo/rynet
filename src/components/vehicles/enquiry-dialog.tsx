"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, CircleCheck, Mail, X } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";

import { submitEnquiry } from "@/app/actions/enquiry";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";
import type { EnquiryState } from "@/lib/enquiry-schema";

const initial: EnquiryState = { status: "idle" };

/**
 * The enquiry form: the one form on the platform that exists to sell a car.
 *
 * Radix Dialog rather than a hand-rolled modal, because the parts that are easy to get wrong are
 * the parts nobody tests: focus moves into the dialog on open and back to the trigger on close,
 * the page behind is inert, Escape closes it, and it is announced as a dialog. On a phone it rises
 * as a sheet from the bottom edge, where a thumb already is; from 640px it is a centred panel.
 *
 * Built on the shared Field and control components, so the label, hint, error, `aria-describedby`
 * and `aria-invalid` wiring is the same as every other form on the site:
 *
 * - Every field has a persistent visible label. Placeholders vanish the moment someone types,
 *   which is exactly when a person who was interrupted needs to know what the field was.
 * - Errors are tied to their field, and the summary is an alert, so a screen reader hears what
 *   went wrong rather than discovering it by tabbing.
 * - Success replaces the form with a `role="status"` confirmation, so it is read out.
 *
 * The consent sentence is the exact wording the server action stores on the consent record
 * (CONSENT_WORDING in src/app/actions/enquiry.ts). Change one and the other must change with it.
 * It has not been reviewed by an attorney, so it carries the site's one review marker.
 *
 * The honeypot is off screen, out of the tab order and hidden from assistive technology, so no
 * person reaches it by any route. `elapsedMs` is stamped at submit, not at render: a value fixed
 * at render made every genuine enquiry look instant, fail the timing check, and vanish silently.
 */
export function EnquiryDialog({
  vehicleRef,
  vehicleTitle,
  dealerName,
  isDemonstration = false,
  compact = false,
  className = "",
}: {
  vehicleRef: string;
  vehicleTitle: string;
  dealerName: string;
  /** Repeats the listing's demonstration disclosure inside the dialog, where it is opened from the
   *  phone bar long after the page's notice has scrolled away. */
  isDemonstration?: boolean;
  /** The short trigger for the phone action bar. */
  compact?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initial);
  const [open, setOpen] = React.useState(false);
  const renderedAt = React.useRef<number>(Date.now());
  const elapsedField = React.useRef<HTMLInputElement>(null);

  // Restart the timing check each time the dialog opens, or a visitor who left the page open for
  // an hour and then enquired would look instant to it.
  React.useEffect(() => {
    if (open) renderedAt.current = Date.now();
  }, [open]);

  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {/*
          "Enquire" is what shows; "Enquire about this vehicle" is the accessible name, which still
          starts with the visible word (SC 2.5.3). The short face never wraps into two lines in a
          narrow card, and it is the name e2e/enquiry.spec.ts presses.
        */}
        <Button size={compact ? "sm" : "lg"} block={!compact} className={className}>
          <Mail aria-hidden="true" />
          Enquire
          <span className="sr-only"> about this vehicle</span>
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* A solid scrim, never a backdrop blur: a blur is a full-viewport readback on every
            frame on a mid-range Android. */}
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--rn-scrim)] motion-safe:animate-[rn-fade-in_var(--duration-element)_var(--rn-ease-out)]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[var(--z-modal)] max-h-[calc(100svh-1.5rem)] overflow-y-auto overscroll-contain rounded-t-lg bg-card px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-body shadow-overlay motion-safe:animate-[rn-fade-in_var(--duration-element)_var(--rn-ease-out)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100svh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-bold text-heading">
                Enquire about this vehicle
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {vehicleTitle}, at {dealerName}.
                {isDemonstration
                  ? " This is a demonstration listing and the car is not for sale."
                  : null}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className={buttonClasses({
                  variant: "ghost",
                  size: "icon",
                  className: "-me-2 -mt-1.5 shrink-0",
                })}
              >
                <X aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {state.status === "success" ? (
            <div role="status" className="mt-6 rounded-md bg-success-subtle p-5">
              <p className="flex items-start gap-2.5 text-base font-semibold text-heading">
                <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                {state.message}
              </p>
              <Dialog.Close asChild>
                <Button variant="outline" className="mt-5 ms-7.5">
                  Close
                </Button>
              </Dialog.Close>
            </div>
          ) : (
            <form
              action={formAction}
              onSubmit={() => {
                // Fires before the action, so the value the action reads is the real one.
                if (elapsedField.current) {
                  elapsedField.current.value = String(Date.now() - renderedAt.current);
                }
              }}
              className="mt-6 grid gap-5"
            >
              <input type="hidden" name="vehicleRef" value={vehicleRef} />
              <input type="hidden" name="elapsedMs" ref={elapsedField} defaultValue="0" />

              {/* Honeypot. Hidden from sight, from the tab order and from assistive tech. */}
              <div
                className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden"
                aria-hidden="true"
              >
                <label htmlFor="website">Leave this empty</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              {state.status === "error" ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-danger-subtle p-3 text-sm font-medium text-danger"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {state.message}
                </p>
              ) : null}

              <Field id="enq-name" label="Your name" error={fieldError("name")}>
                <Input name="name" type="text" required autoComplete="name" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="enq-email" label="Email" error={fieldError("email")}>
                  <Input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                  />
                </Field>
                <Field
                  id="enq-phone"
                  label="Phone"
                  hint={fieldError("phone") ? undefined : "So the dealership can call you back."}
                  error={fieldError("phone")}
                >
                  <Input name="phone" type="tel" required autoComplete="tel" inputMode="tel" />
                </Field>
              </div>

              <Field id="enq-type" label="What would you like">
                <Select name="type" defaultValue="enquiry">
                  <option value="enquiry">More information</option>
                  <option value="test_drive">To book a test drive</option>
                  <option value="finance">To talk about finance</option>
                  <option value="callback">A call back</option>
                </Select>
              </Field>

              <Field id="enq-message" label="Anything to add" optional>
                <Textarea name="message" rows={3} className="min-h-24" />
              </Field>

              <div>
                <label htmlFor="enq-consent" className="flex cursor-pointer items-start gap-3">
                  <input
                    id="enq-consent"
                    name="consent"
                    type="checkbox"
                    required
                    aria-invalid={fieldError("consent") ? true : undefined}
                    aria-describedby={fieldError("consent") ? "enq-consent-error" : undefined}
                    className="rn-check mt-0.5"
                  />
                  <span className="text-sm text-body">
                    I agree that Rynet may pass the details I have given to the selling dealership
                    so they can respond to this enquiry, and may contact me about it. See our{" "}
                    <a href="/privacy" className="text-accent underline underline-offset-3">
                      privacy notice
                    </a>
                    .
                  </span>
                </label>
                {fieldError("consent") ? (
                  <p id="enq-consent-error" className="rn-field__error mt-1.5 ps-8">
                    <AlertCircle aria-hidden="true" />
                    <span>{fieldError("consent")}</span>
                  </p>
                ) : null}
                <LegalReviewMarker
                  reviewedAt={LEGAL_REVIEWED_AT.enquiryConsent}
                  className="mt-2 ps-8"
                />
              </div>

              <Button type="submit" size="lg" block isLoading={pending} loadingLabel="Sending">
                Send enquiry
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
