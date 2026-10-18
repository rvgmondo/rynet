"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { type FormState, saveDetails } from "@/app/actions/portal";

export type DetailsValues = {
  whatsappNumber: string;
  principalName: string;
  principalEmail: string;
  principalPhone: string;
  rynetEmails: boolean;
};

/** How buyers reach the dealership. The principal and managers can change it. */
export function DetailsForm({ values, canEdit }: { values: DetailsValues; canEdit: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDetails, {});

  const field = (
    name: Exclude<keyof DetailsValues, "rynetEmails">,
    label: string,
    hint: string,
    type: "text" | "email" | "tel" = "text",
  ) => (
    <div className="rn-field">
      <label htmlFor={`details-${name}`} className="rn-field__label">
        {label}
      </label>
      <input
        id={`details-${name}`}
        name={name}
        type={type}
        className="rn-input"
        defaultValue={values[name]}
        disabled={!canEdit}
        aria-describedby={`details-${name}-hint`}
      />
      <p id={`details-${name}-hint`} className="rn-field__hint">
        {hint}
      </p>
    </div>
  );

  return (
    <form action={action} className="rn-portal-form">
      {field(
        "whatsappNumber",
        "WhatsApp number",
        "Buyers message this number from your cars and your showroom. For example 082 123 4567.",
        "tel",
      )}
      {field("principalName", "Dealer principal", "Who Rynet talks to about your account.")}
      {field(
        "principalEmail",
        "Their email",
        "Enquiries are emailed here when no other address is set.",
        "email",
      )}
      {field("principalPhone", "Their phone", "For Rynet only. Never shown on the site.", "tel")}
      <label className="flex min-h-11 items-start gap-3 text-sm text-heading">
        <input
          type="checkbox"
          name="rynetEmails"
          defaultChecked={values.rynetEmails}
          disabled={!canEdit}
          className="mt-0.5 size-5 accent-[var(--rn-primary)]"
        />
        <span>
          News and reminders from Rynet by email
          <span className="block text-xs text-muted">
            Enquiries from buyers always reach you, whatever this says.
          </span>
        </span>
      </label>
      {state.problem ? (
        <p className="rn-portal-problem" role="alert">
          {state.problem}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rn-portal-saved" role="status">
          <Check aria-hidden="true" /> {state.message}
        </p>
      ) : null}
      {canEdit ? (
        <div>
          <button type="submit" className="rn-btn rn-btn--primary" disabled={pending}>
            {pending ? "Saving" : "Save"}
          </button>
        </div>
      ) : (
        <p className="rn-field__hint">Only the dealer principal or a manager can change these.</p>
      )}
    </form>
  );
}
