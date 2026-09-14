import { AlertCircle } from "lucide-react";
import {
  Children,
  cloneElement,
  type InputHTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/**
 * Form controls.
 *
 *   <Field id="email" label="Email address" hint="We only use it to reply" error={errors.email}>
 *     <Input type="email" name="email" autoComplete="email" />
 *   </Field>
 *
 * Field owns the wiring a control needs and nobody remembers: the label's `for`, the control's
 * `id`, `aria-describedby` pointing at the hint and the error, and `aria-invalid` while there is
 * an error. It clones them onto its single child, so the child can be a native element, one of
 * the controls below, or a third-party input that forwards props.
 *
 * Every control is 44px tall, sets 16px text (so iOS does not zoom on focus), draws its border in
 * --rn-line-control (3:1 on every ground, SC 1.4.11) and carries the product focus ring. None of
 * them are client components; React 19 passes `ref` as an ordinary prop.
 */

export function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  hideLabel = false,
  className = "",
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Adds a muted "(optional)" after the label. Required is the default and is not announced. */
  optional?: boolean;
  /** Keeps the label for assistive technology only. Use sparingly: a visible label helps everyone. */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const only = Children.only(children);
  const control = isValidElement(only)
    ? cloneElement(only as ReactElement<Record<string, unknown>>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : only;

  return (
    <div className={`rn-field ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "rn-field__label"}>
        {label}
        {optional ? <span className="rn-field__optional"> (optional)</span> : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="rn-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="rn-field__error">
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  size = "md",
  className = "",
  ref,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "md" | "lg";
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={ref}
      className={`rn-input ${size === "lg" ? "rn-input--lg" : ""} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={`rn-textarea ${className}`} {...props} />;
}

export function Select({
  className = "",
  ref,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} className={`rn-select ${className}`} {...props}>
      {children}
    </select>
  );
}

/**
 * A checkbox or radio with its label, as one 44px row. The input stays native, so it works in a
 * GET form with no JavaScript, which the search filters depend on.
 */
export function Choice({
  type = "checkbox",
  label,
  trailing,
  className = "",
  ref,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "checkbox" | "radio";
  label: ReactNode;
  /** Right-aligned extra, such as a result count. */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <label className={`rn-choice ${className}`}>
      <input
        ref={ref}
        type={type}
        className={type === "radio" ? "rn-radio" : "rn-check"}
        {...props}
      />
      <span className="min-w-0 flex-1">{label}</span>
      {trailing ? <span className="shrink-0 text-xs text-muted tabular">{trailing}</span> : null}
    </label>
  );
}

export function Checkbox(props: Omit<Parameters<typeof Choice>[0], "type">) {
  return <Choice type="checkbox" {...props} />;
}

export function Radio(props: Omit<Parameters<typeof Choice>[0], "type">) {
  return <Choice type="radio" {...props} />;
}
