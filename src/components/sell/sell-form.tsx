"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";

import { submitSellToDealer } from "@/app/actions/sell-to-dealer";
import {
  BotTraps,
  ChoiceGroup,
  Field,
  INPUT_CLASS,
  RestoredNotice,
  StepNav,
  StepProgress,
  useMultiStepForm,
} from "@/components/forms/multi-step";
import {
  CONDITIONS,
  CURRENT_YEAR,
  FIELD_STEP,
  FINANCE_STATES,
  MAX_DEALERSHIPS,
  OLDEST_YEAR,
  SERVICE_HISTORIES,
  type SellToDealerState,
  sellToDealerSchema,
  TRANSMISSIONS,
} from "@/lib/sell-to-dealer-schema";

const initial: SellToDealerState = { status: "idle" };

const STEPS = [
  { title: "Your car", hint: "Four questions, nothing personal." },
  { title: "Condition and papers", hint: "Be honest, it saves you a wasted trip." },
  { title: "Where it is and who you are", hint: "Last step." },
] as const;

/**
 * The sell-to-a-dealer form.
 *
 * Step one asks nothing personal: make, model, year, mileage. Somebody weighing up whether to
 * bother can answer all four without giving up a phone number, and a first step that opens
 * with "your name and email" is a first step people close.
 *
 * All the multi-step machinery, and the two React hazards it exists to prevent, live in
 * components/forms/multi-step.tsx. Read the note at the top of that file before changing
 * anything here about steps or buttons.
 */
export function SellForm({ provinces }: { provinces: readonly { slug: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(submitSellToDealer, initial);

  const form = useMultiStepForm({
    storageKey: "rynet-sell-to-a-dealer-v1",
    steps: STEPS,
    fieldStep: FIELD_STEP,
    state,
  });

  const validate = (index: number, data: FormData): Record<string, string> => {
    const parsed = sellToDealerSchema.safeParse({
      make: data.get("make"),
      model: data.get("model"),
      modelYear: data.get("modelYear"),
      mileageKm: data.get("mileageKm"),
      transmission: data.get("transmission"),
      condition: data.get("condition"),
      serviceHistory: data.get("serviceHistory"),
      finance: data.get("finance"),
      notes: data.get("notes") || undefined,
      province: data.get("province"),
      city: data.get("city"),
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      consent: data.get("consent") === "on",
    });
    if (parsed.success) return {};

    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if ((FIELD_STEP[field] ?? -1) === index && !errors[field]) errors[field] = issue.message;
    }
    return errors;
  };

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-lg bg-success-subtle p-8 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-9 text-success" />
        <p className="mt-4 font-display text-lg font-bold">{state.message}</p>
        <p className="measure mx-auto mt-3 text-sm text-ink-secondary">
          Your details go to no more than {MAX_DEALERSHIPS} verified dealerships in your province
          that buy this kind of car. They contact you directly, and any offer is between you and
          them. Rynet does not buy cars and takes no cut.
        </p>
        <p className="measure mx-auto mt-3 text-sm text-ink-secondary">
          We are new and still signing dealerships, so there may not be one near you yet. If we
          cannot place your car we will email you and say so.
        </p>
        <p className="measure mx-auto mt-3 text-sm text-ink-muted">
          Changed your mind? Email privacy@rynet.co.za and we will stop passing it on.
        </p>
      </div>
    );
  }

  return (
    <form
      {...form.formProps}
      action={formAction}
      className="rounded-lg border border-line p-6 sm:p-8"
    >
      {form.restored ? <RestoredNotice onStartAgain={form.startAgain} /> : null}

      <StepProgress step={form.step} steps={STEPS} />

      {state.status === "error" ? (
        <p role="alert" className="mb-6 rounded-md bg-danger-subtle p-4 text-sm text-ink">
          {state.message}
        </p>
      ) : null}

      {/* ------------------------------------------------------------------- step one */}
      <fieldset hidden={form.step !== 0} className="space-y-5">
        <legend className="sr-only">Your car</legend>
        <h2 ref={form.step === 0 ? form.headingRef : null} tabIndex={-1} className="text-xl">
          Your car
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="make"
            label="Make"
            hint="Toyota, Volkswagen, Ford."
            error={form.errorFor("make")}
          >
            <input
              id="make"
              name="make"
              type="text"
              autoComplete="off"
              aria-invalid={Boolean(form.errorFor("make"))}
              aria-describedby={form.errorFor("make") ? "make-error" : "make-hint"}
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            name="model"
            label="Model"
            hint="Hilux, Polo, Ranger."
            error={form.errorFor("model")}
          >
            <input
              id="model"
              name="model"
              type="text"
              autoComplete="off"
              aria-invalid={Boolean(form.errorFor("model"))}
              aria-describedby={form.errorFor("model") ? "model-error" : "model-hint"}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="modelYear" label="Year" error={form.errorFor("modelYear")}>
            <input
              id="modelYear"
              name="modelYear"
              type="number"
              inputMode="numeric"
              min={OLDEST_YEAR}
              max={CURRENT_YEAR + 1}
              placeholder={String(CURRENT_YEAR - 6)}
              aria-invalid={Boolean(form.errorFor("modelYear"))}
              aria-describedby={form.errorFor("modelYear") ? "modelYear-error" : undefined}
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            name="mileageKm"
            label="Mileage"
            hint="In kilometres, as close as you can."
            error={form.errorFor("mileageKm")}
          >
            <input
              id="mileageKm"
              name="mileageKm"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="128000"
              aria-invalid={Boolean(form.errorFor("mileageKm"))}
              aria-describedby={form.errorFor("mileageKm") ? "mileageKm-error" : "mileageKm-hint"}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </fieldset>

      {/* ------------------------------------------------------------------- step two */}
      <fieldset hidden={form.step !== 1} className="space-y-5">
        <legend className="sr-only">Condition and papers</legend>
        <h2 ref={form.step === 1 ? form.headingRef : null} tabIndex={-1} className="text-xl">
          Condition and papers
        </h2>

        <ChoiceGroup
          name="transmission"
          legend="Transmission"
          type="radio"
          options={TRANSMISSIONS}
          error={form.errorFor("transmission")}
        />

        <ChoiceGroup
          name="condition"
          legend="Honest condition"
          hint="A dealer sees the car eventually. Overstating it only wastes your morning."
          type="radio"
          options={CONDITIONS}
          error={form.errorFor("condition")}
        />

        <ChoiceGroup
          name="serviceHistory"
          legend="Service history"
          type="radio"
          options={SERVICE_HISTORIES}
          error={form.errorFor("serviceHistory")}
        />

        <ChoiceGroup
          name="finance"
          legend="Is there finance still owing on it?"
          hint="If a bank still holds the papers you can still sell, it just changes how the money moves. Say so and the dealership will handle the settlement."
          type="radio"
          options={FINANCE_STATES}
          error={form.errorFor("finance")}
        />

        <Field
          name="notes"
          label="Anything a dealer should know?"
          hint="Accident history, a warning light, a spare key that went missing. Optional."
          error={form.errorFor("notes")}
        >
          <textarea
            id="notes"
            name="notes"
            rows={3}
            aria-describedby="notes-hint"
            className="mt-1 w-full rounded-md border border-line-interactive bg-surface p-3 text-sm"
          />
        </Field>
      </fieldset>

      {/* ----------------------------------------------------------------- step three */}
      <fieldset hidden={form.step !== 2} className="space-y-5">
        <legend className="sr-only">Where it is and who you are</legend>
        <h2 ref={form.step === 2 ? form.headingRef : null} tabIndex={-1} className="text-xl">
          Where it is and who you are
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="province" label="Province" error={form.errorFor("province")}>
            <select
              id="province"
              name="province"
              defaultValue=""
              aria-invalid={Boolean(form.errorFor("province"))}
              aria-describedby={form.errorFor("province") ? "province-error" : undefined}
              className={INPUT_CLASS}
            >
              <option value="" disabled>
                Choose a province
              </option>
              {provinces.map((province) => (
                <option key={province.slug} value={province.slug}>
                  {province.name}
                </option>
              ))}
            </select>
          </Field>

          <Field name="city" label="Town or city" error={form.errorFor("city")}>
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              aria-invalid={Boolean(form.errorFor("city"))}
              aria-describedby={form.errorFor("city") ? "city-error" : undefined}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <Field name="name" label="Your name" error={form.errorFor("name")}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(form.errorFor("name"))}
            aria-describedby={form.errorFor("name") ? "name-error" : undefined}
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="email" label="Email" error={form.errorFor("email")}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(form.errorFor("email"))}
              aria-describedby={form.errorFor("email") ? "email-error" : undefined}
              className={INPUT_CLASS}
            />
          </Field>

          <Field name="phone" label="Phone" error={form.errorFor("phone")}>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(form.errorFor("phone"))}
              aria-describedby={form.errorFor("phone") ? "phone-error" : undefined}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {/*
          The consent wording is the same sentence stored verbatim on the consent record by
          the server action. If you change one, change both: the record is evidence of what
          was on screen, and evidence that does not match the screen is worse than none.
        */}
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consent"
              className="mt-0.5 size-4 shrink-0 accent-[var(--rn-accent-solid)]"
              aria-invalid={Boolean(form.errorFor("consent"))}
              aria-describedby={form.errorFor("consent") ? "consent-error" : undefined}
            />
            <span className="text-ink-secondary">
              I agree that Rynet may pass my name, my contact details and the details of my car to
              verified dealerships in my province that buy this kind of vehicle, so that they can
              contact me with an offer. Rynet will send it to no more than {MAX_DEALERSHIPS}{" "}
              dealerships. Each dealership decides for itself what it does with my details once it
              has them. I can withdraw this at any time by emailing privacy@rynet.co.za.
            </span>
          </label>
          {form.errorFor("consent") ? (
            <p id="consent-error" className="mt-1 text-xs font-medium text-danger">
              {form.errorFor("consent")}
            </p>
          ) : null}
          {/*
            POPIA section 18 wants the data subject told what happens to their information
            before they hand it over, not after. The consent sentence above carries the
            specifics; this points at the full notice, which is the rest of the answer.
          */}
          <p className="mt-2 text-xs text-ink-muted">
            What we do with this, how long we keep it and how to get it back is in our{" "}
            <a href="/privacy">privacy notice</a>.
          </p>
        </div>
      </fieldset>

      <BotTraps elapsedRef={form.elapsedField} />

      <StepNav
        step={form.step}
        stepCount={STEPS.length}
        pending={pending}
        submitLabel="Send it to dealerships"
        onBack={form.back}
        onNext={() => form.next(validate)}
        note={
          form.step < STEPS.length - 1
            ? "Nothing is sent until the last step."
            : `No more than ${MAX_DEALERSHIPS} dealerships.`
        }
      />
    </form>
  );
}
