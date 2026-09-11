"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Mail, X } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";

import { submitEnquiry } from "@/app/actions/enquiry";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/forms/multi-step";
import { Button } from "@/components/ui/button";
import type { EnquiryState } from "@/lib/enquiry-schema";

const initial: EnquiryState = { status: "idle" };

/**
 * The enquiry form.
 *
 * Radix Dialog rather than a hand-rolled modal, because the parts that are easy to get
 * wrong are the parts nobody tests: focus moves into the dialog on open and back to the
 * trigger on close, the background is inert, Escape closes it, and the whole thing is
 * announced as a dialog rather than as a div that appeared.
 *
 * Three accessibility details that are deliberate rather than incidental:
 *
 * - Every field has a persistent VISIBLE label. Placeholders are hints, never labels: they
 *   vanish the moment someone types, which is exactly when a person who was interrupted
 *   needs to know what the field was.
 * - Errors are tied to their field with `aria-describedby` and `aria-invalid`, and the
 *   summary is a live region, so a screen reader hears what went wrong rather than
 *   discovering it by tabbing.
 * - The result is announced. On success the form is replaced by a confirmation with
 *   `role="status"`, so it is read out rather than silently swapping.
 *
 * The honeypot is hidden with `sr-only` plus `aria-hidden` and `tabIndex={-1}`, so no
 * person reaches it by any route, including a screen reader.
 */
export function EnquiryDialog({
  vehicleRef,
  vehicleTitle,
  dealerName,
  compact = false,
}: {
  vehicleRef: string;
  vehicleTitle: string;
  dealerName: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initial);
  const [open, setOpen] = React.useState(false);
  const renderedAt = React.useRef<number>(Date.now());
  const elapsedField = React.useRef<HTMLInputElement>(null);

  // Restart the timing check each time the dialog opens, or a visitor who left the page
  // open for an hour and then enquired would look instant to the check.
  React.useEffect(() => {
    if (open) renderedAt.current = Date.now();
  }, [open]);

  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  /*
   * The shared primitive, not a fifth copy of the old one.
   *
   * This dialog kept its own boxed input while both multi-step forms were rebuilt on ruled
   * lines, so the one form a buyer fills in to actually buy a car was the last boxed form on
   * the site. Same class of drift as the three copies of `toCard` and the agency form's own
   * `Field`, and the same fix.
   */
  const inputClass = INPUT_CLASS;
  const labelClass = LABEL_CLASS;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size={compact ? "md" : "lg"} className={compact ? "" : "w-full"}>
          <Mail aria-hidden="true" />
          {compact ? "Enquire" : "Enquire about this vehicle"}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/*
          A flat scrim and a sheet opened by a rule, not a bordered card floating on a smear.
          ---------------------------------------------------------------------------------
          The panel was `rounded-lg border border-line ... shadow-(--rn-shadow-4)` over a
          `backdrop-blur-sm` scrim: a container drawn around content, hovering over a page that
          had been smeared. Every part of that is the pre-redraw site, and it is the surface a
          buyer completes a purchase enquiry on.

          The blur also costs a full-viewport readback on every frame, which is exactly what the
          mobile action bar on the same page refuses for the same reason.

          The opening edge is INK, not red. Send Enquiry is the one red object in this viewport,
          and a red edge four pixels thick at the top of the sheet competes with the thing it is
          meant to be leading the eye to.
        */}
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-t-4 border-ink bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-extrabold leading-tight [font-variation-settings:'wdth'_112]">
                Enquire about this vehicle
              </Dialog.Title>
              <Dialog.Description className="rn-label rn-label--light mt-2 text-ink-muted">
                {vehicleTitle}, at {dealerName}.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-11 shrink-0 items-center justify-center transition-colors duration-[var(--duration-micro)] hover:bg-ink hover:text-ink-inverse"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          {state.status === "success" ? (
            /* Ranged left, on a rule, with no tick. A centred green glyph is the generic
               thank-you every form builder emits, and green is a colour this palette does not
               otherwise use. */
            <div role="status" className="mt-8 border-t-2 border-ink pt-6">
              <p className="font-display text-xl font-extrabold leading-tight [font-variation-settings:'wdth'_112]">
                {state.message}
              </p>
              <p className="mt-3 text-sm text-ink-secondary">
                Most dealerships come back within a working day. If it is urgent, the phone number
                is on the listing.
              </p>
              <Dialog.Close asChild>
                <Button variant="secondary" className="mt-5">
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
              className="mt-6 space-y-4"
            >
              <input type="hidden" name="vehicleRef" value={vehicleRef} />
              {/*
                Stamped at SUBMIT, not at render.
                
                This was a value prop computed during render, so it was fixed at roughly
                zero for the life of the dialog. Every genuine submission therefore failed
                the two-second timing check and was silently treated as a bot: the form
                reported success, and no lead was ever written. A failure that looks exactly
                like it worked.
              */}
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
                <p role="alert" className="border-t-2 border-danger pt-3 text-sm text-danger">
                  {state.message}
                </p>
              ) : null}

              <div>
                <label htmlFor="enq-name" className={labelClass}>
                  Your name
                </label>
                <input
                  id="enq-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  aria-invalid={Boolean(fieldError("name"))}
                  aria-describedby={fieldError("name") ? "enq-name-error" : undefined}
                  className={inputClass}
                />
                {fieldError("name") ? (
                  <p id="enq-name-error" className="mt-1 text-xs text-danger">
                    {fieldError("name")}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="enq-email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="enq-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={Boolean(fieldError("email"))}
                    aria-describedby={fieldError("email") ? "enq-email-error" : undefined}
                    className={inputClass}
                  />
                  {fieldError("email") ? (
                    <p id="enq-email-error" className="mt-1 text-xs text-danger">
                      {fieldError("email")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="enq-phone" className={labelClass}>
                    Phone
                  </label>
                  <input
                    id="enq-phone"
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    aria-invalid={Boolean(fieldError("phone"))}
                    aria-describedby={fieldError("phone") ? "enq-phone-error" : "enq-phone-hint"}
                    className={inputClass}
                  />
                  {fieldError("phone") ? (
                    <p id="enq-phone-error" className="mt-1 text-xs text-danger">
                      {fieldError("phone")}
                    </p>
                  ) : (
                    <p id="enq-phone-hint" className="mt-1 text-xs text-ink-muted">
                      Most dealerships phone back first.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="enq-type" className={labelClass}>
                  What would you like
                </label>
                <select id="enq-type" name="type" defaultValue="enquiry" className={inputClass}>
                  <option value="enquiry">More information</option>
                  <option value="test_drive">To book a test drive</option>
                  <option value="finance">To talk about finance</option>
                  <option value="callback">A call back</option>
                </select>
              </div>

              <div>
                <label htmlFor="enq-message" className={labelClass}>
                  Anything to add <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <textarea
                  id="enq-message"
                  name="message"
                  rows={3}
                  className={`${inputClass} min-h-24 resize-y py-3`}
                />
              </div>

              <div>
                <label htmlFor="enq-consent" className="flex items-start gap-2.5 text-xs">
                  <input
                    id="enq-consent"
                    name="consent"
                    type="checkbox"
                    required
                    aria-invalid={Boolean(fieldError("consent"))}
                    aria-describedby={fieldError("consent") ? "enq-consent-error" : undefined}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--rn-accent-solid)]"
                  />
                  <span className="text-ink-secondary">
                    I agree that Rynet may pass the details I have given to the selling dealership
                    so they can respond to this enquiry, and may contact me about it. See our{" "}
                    <a href="/privacy" className="text-accent hover:underline">
                      privacy notice
                    </a>
                    .
                  </span>
                </label>
                {fieldError("consent") ? (
                  <p id="enq-consent-error" className="mt-1 text-xs text-danger">
                    {fieldError("consent")}
                  </p>
                ) : null}
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
