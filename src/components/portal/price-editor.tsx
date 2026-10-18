"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { changeCarPrice, type FormState } from "@/app/actions/portal";

/** Change a car's price in place. Only for cars Rynet is not reading from a website. */
export function PriceEditor({
  id,
  price,
  label,
}: {
  id: number;
  price: number | null;
  label: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeCarPrice, {});
  const field = `price-${id}`;
  return (
    <form action={action} className="rn-portal-price">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={field} className="sr-only">
        Price of {label}, in rand
      </label>
      <input
        id={field}
        name="price"
        className="rn-input"
        inputMode="numeric"
        defaultValue={price ?? ""}
        aria-invalid={state.problem ? true : undefined}
        aria-describedby={state.problem ? `${field}-problem` : undefined}
      />
      <button type="submit" className="rn-btn rn-btn--sm rn-btn--outline" disabled={pending}>
        {pending ? "Saving" : "Save price"}
        <span className="sr-only">: {label}</span>
      </button>
      {state.ok ? (
        <span className="rn-portal-saved" role="status">
          <Check aria-hidden="true" /> {state.message}
        </span>
      ) : null}
      {state.problem ? (
        <span id={`${field}-problem`} className="rn-field__error" role="alert">
          {state.problem}
        </span>
      ) : null}
    </form>
  );
}
