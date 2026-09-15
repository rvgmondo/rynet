"use client";

import * as React from "react";

import { DRAFT_RESTORED_EVENT, Field, INPUT_CLASS } from "@/components/forms/multi-step";

export type MakeOption = {
  name: string;
  /** Other names people type for this make, such as "VW". */
  aliases: readonly string[];
  /** Model names under this make, A to Z. May be empty. */
  models: readonly string[];
};

/** Case, spacing and punctuation forgiven, the same way the dealership matching forgives them. */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Make and model, typed, with suggestions from the taxonomy.
 *
 * WHY THESE ARE TEXT FIELDS WITH SUGGESTIONS AND NOT LISTS
 *
 * A seller can own a car the taxonomy has never heard of, and the server action and the
 * dealership matching both take the make and model as free text for exactly that reason. A
 * native `<datalist>` gives the shortlist a list would, in the browser's own picker, without
 * refusing an answer it does not know and without a second "not listed" field to fall back to.
 * It needs no JavaScript to offer the makes; the script only narrows the model suggestions to
 * the make that was typed.
 *
 * Nothing moves focus and nothing is filled in on anyone's behalf. Suggestions are offered, the
 * person picks one or keeps typing.
 */
export function MakeModelFields({
  makes,
  makeError,
  modelError,
}: {
  makes: readonly MakeOption[];
  makeError?: string;
  modelError?: string;
}) {
  const [make, setMake] = React.useState("");
  const makeInput = React.useRef<HTMLInputElement>(null);

  const byName = React.useMemo(() => {
    const index = new Map<string, MakeOption>();
    for (const option of makes) {
      index.set(normalise(option.name), option);
      for (const alias of option.aliases) index.set(normalise(alias), option);
    }
    return index;
  }, [makes]);

  const models = byName.get(normalise(make))?.models ?? [];

  // A restored draft and "Start again" both change the make without a change event.
  React.useEffect(() => {
    const form = makeInput.current?.form;
    if (!form) return;

    const onRestored = () => setMake(makeInput.current?.value ?? "");
    const onReset = () => setMake("");

    form.addEventListener(DRAFT_RESTORED_EVENT, onRestored);
    form.addEventListener("reset", onReset);
    return () => {
      form.removeEventListener(DRAFT_RESTORED_EVENT, onRestored);
      form.removeEventListener("reset", onReset);
    };
  }, []);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field name="make" label="Make" hint="Start typing, or pick from the list." error={makeError}>
        <input
          ref={makeInput}
          id="make"
          name="make"
          type="text"
          list="sell-makes"
          autoComplete="off"
          maxLength={60}
          onInput={(event) => setMake(event.currentTarget.value)}
          aria-invalid={makeError ? true : undefined}
          aria-describedby={makeError ? "make-hint make-error" : "make-hint"}
          className={INPUT_CLASS}
        />
      </Field>
      <datalist id="sell-makes">
        {makes.map((option) => (
          <option key={option.name} value={option.name} />
        ))}
      </datalist>

      <Field
        name="model"
        label="Model"
        hint={
          models.length > 0
            ? `Suggestions for ${byName.get(normalise(make))?.name ?? make}.`
            : "Type it as it appears on the car."
        }
        error={modelError}
      >
        <input
          id="model"
          name="model"
          type="text"
          list="sell-models"
          autoComplete="off"
          maxLength={80}
          aria-invalid={modelError ? true : undefined}
          aria-describedby={modelError ? "model-hint model-error" : "model-hint"}
          className={INPUT_CLASS}
        />
      </Field>
      <datalist id="sell-models">
        {models.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
