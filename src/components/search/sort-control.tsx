"use client";

import { type FormEvent, type KeyboardEvent, useRef } from "react";

import { buttonClasses } from "@/components/ui/button-classes";

import { SORT_OPTIONS } from "./params";

/**
 * The sort order: a native select in its own GET form.
 *
 * WITHOUT JAVASCRIPT it is a select and a Sort button, and the form carries every other parameter
 * the buyer arrived with as hidden inputs. A GET form submits only its own controls, and the sort
 * control once posted `sort` alone and threw away every filter on the page.
 *
 * WITH JAVASCRIPT it applies as soon as a choice is made, and the button is not drawn (it lives in
 * a `<noscript>`, so there is no flash of it either). A choice made with the pointer or a phone's
 * picker applies at once. Arrowing through a closed select fires a change on every step in most
 * desktop browsers, and reloading the page on each one would throw a keyboard user out of the
 * control (SC 3.2.2), so a keyboard choice applies on Enter or when focus leaves the select. The
 * behaviour is stated in the control's description.
 */
export function SortControl({
  action,
  sort,
  carried,
  id = "sort",
  className = "",
}: {
  action: string;
  sort: string;
  carried: [string, string][];
  id?: string;
  className?: string;
}) {
  const keyed = useRef(false);
  const pending = useRef(false);

  const submit = (form: HTMLFormElement | null) => {
    if (!form) return;
    pending.current = false;
    form.requestSubmit();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pairs: [string, string][] = [];
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || key === "page" || (key === "sort" && trimmed === "newest")) continue;
      pairs.push([key, trimmed]);
    }
    const query = new URLSearchParams(pairs).toString();
    window.location.assign(query ? `${action}?${query}` : action);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSelectElement>) => {
    if (event.key === "Enter" && pending.current) {
      event.preventDefault();
      submit(event.currentTarget.form);
      return;
    }
    keyed.current = ["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(
      event.key,
    );
  };

  return (
    <form
      method="get"
      action={action}
      onSubmit={onSubmit}
      className={`flex items-center gap-2 ${className}`}
    >
      {carried.map(([key, value], index) => (
        <input key={`${key}:${value}:${index}`} type="hidden" name={key} value={value} />
      ))}
      <label htmlFor={id} className="shrink-0 text-sm font-medium text-body max-md:sr-only">
        Sort by
      </label>
      <select
        id={id}
        name="sort"
        defaultValue={sort}
        aria-describedby={`${id}-hint`}
        onKeyDown={onKeyDown}
        onPointerDown={() => {
          keyed.current = false;
        }}
        onChange={(event) => {
          if (keyed.current) {
            pending.current = true;
            return;
          }
          submit(event.currentTarget.form);
        }}
        onBlur={(event) => {
          if (pending.current) submit(event.currentTarget.form);
        }}
        className="rn-select min-w-0 flex-1 md:w-auto md:flex-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span id={`${id}-hint`} className="sr-only">
        Results reorder when you choose.
      </span>
      <noscript>
        <button type="submit" className={buttonClasses({ variant: "outline", size: "sm" })}>
          Sort
        </button>
      </noscript>
    </form>
  );
}
