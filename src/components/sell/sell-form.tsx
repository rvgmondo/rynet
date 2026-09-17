"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { submitSellToDealer } from "@/app/actions/sell-to-dealer";
import {
  BotTraps,
  ChoiceGroup,
  DRAFT_RESTORED_EVENT,
  Field,
  INPUT_CLASS,
  RestoredNotice,
  SELECT_CLASS,
  StepNav,
  StepProgress,
  TEXTAREA_CLASS,
  useMultiStepForm,
} from "@/components/forms/multi-step";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import { buttonClasses } from "@/components/ui/button-classes";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";
import {
  CONDITIONS,
  FIELD_STEP,
  FINANCE_STATES,
  SELL_CONSENT_WORDING,
  SERVICE_HISTORIES,
  type SellToDealerState,
  sellToDealerSchema,
  TRANSMISSIONS,
} from "@/lib/sell-to-dealer-schema";

import { MakeModelFields, type MakeOption } from "./make-model-fields";

const initial: SellToDealerState = { status: "idle" };

const STEPS = [
  { title: "Your car", label: "Your car", hint: "Four quick questions. Nothing personal yet." },
  {
    title: "Condition and papers",
    label: "Condition",
    hint: "Pick the closest match for each.",
  },
  {
    title: "Where it is and how to reach you",
    label: "Your details",
    hint: "Last step.",
  },
] as const;

export type ProvinceOption = { slug: string; name: string };
export type CityOption = { name: string; province: string };

/** What the seller sent, kept for the confirmation screen after the form has reset. */
type Sent = {
  car: string;
  mileage: string;
  where: string;
};

/**
 * Mileage is typed the way it is written in South Africa, "128 000", and the schema wants
 * digits. Spaces and commas are taken out of the field itself, so what is checked, what is
 * saved as a draft and what is sent are the same string.
 */
function normaliseMileage(form: HTMLFormElement | null): void {
  const field = form?.elements.namedItem("mileageKm");
  if (field instanceof HTMLInputElement) field.value = field.value.replace(/[\s,]/g, "");
}

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/**
 * The sell-to-a-dealer form.
 *
 * Step one asks nothing personal: make, model, year, mileage. Somebody weighing up whether to
 * bother can answer all four without giving up a phone number, and a first step that opens
 * with "your name and email" is a first step people close.
 *
 * All the multi-step machinery, and the two React hazards it exists to prevent, live in
 * components/forms/multi-step.tsx. Read the note at the top of that file before changing
 * anything here about steps or buttons. Every sub-component below is at module scope for the
 * same reason.
 */
export function SellForm({
  provinces,
  cities,
  makes,
}: {
  provinces: readonly ProvinceOption[];
  cities: readonly CityOption[];
  makes: readonly MakeOption[];
}) {
  const [state, formAction, pending] = React.useActionState(submitSellToDealer, initial);
  const [province, setProvince] = React.useState("");
  const [sent, setSent] = React.useState<Sent | null>(null);

  const form = useMultiStepForm({
    storageKey: "rynet-sell-to-a-dealer-v1",
    steps: STEPS,
    fieldStep: FIELD_STEP,
    state,
  });

  const { formRef } = form;

  // The town suggestions follow the province, and a restored draft sets the province without
  // a change event.
  React.useEffect(() => {
    const element = formRef.current;
    if (!element) return;
    const read = () => {
      const field = element.elements.namedItem("province");
      setProvince(field instanceof HTMLSelectElement ? field.value : "");
    };
    const clear = () => setProvince("");
    // The hook restores the draft in an effect that runs before this one, so the province may
    // already be back by now; the event covers every later restore.
    read();
    element.addEventListener(DRAFT_RESTORED_EVENT, read);
    element.addEventListener("reset", clear);
    return () => {
      element.removeEventListener(DRAFT_RESTORED_EVENT, read);
      element.removeEventListener("reset", clear);
    };
  }, [formRef]);

  const validate = (index: number, data: FormData): Record<string, string> => {
    const parsed = sellToDealerSchema.safeParse({
      make: data.get("make"),
      model: data.get("model"),
      modelYear: data.get("modelYear"),
      mileageKm: String(data.get("mileageKm") ?? "").replace(/[\s,]/g, ""),
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

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    normaliseMileage(event.currentTarget);
    if (!form.guardSubmit(validate, event)) return;

    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const provinceName = provinces.find((option) => option.slug === text("province"))?.name;
    setSent({
      car: [text("modelYear"), text("make"), text("model")].filter(Boolean).join(" "),
      mileage: text("mileageKm") ? `${groupThousands(text("mileageKm"))} km` : "",
      where: [text("city"), provinceName].filter(Boolean).join(", "),
    });
  };

  if (state.status === "success") {
    return <SellSuccess message={state.message} sent={sent} />;
  }

  const towns = province ? cities.filter((city) => city.province === province) : cities;

  return (
    <form {...form.formProps} onSubmit={onSubmit} action={formAction}>
      {form.restored ? <RestoredNotice onStartAgain={form.startAgain} /> : null}

      <StepProgress step={form.step} steps={STEPS} />

      {state.status === "error" ? (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-sm bg-danger-subtle px-3.5 py-3 text-sm text-heading"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{state.message}</span>
        </p>
      ) : null}

      {/* ------------------------------------------------------------------- step one */}
      <fieldset hidden={form.step !== 0} className="min-w-0 space-y-5">
        <legend className="sr-only">Your car</legend>
        <h2 ref={form.step === 0 ? form.headingRef : null} tabIndex={-1} className="rn-h3">
          Your car
        </h2>

        <MakeModelFields
          makes={makes}
          makeError={form.errorFor("make")}
          modelError={form.errorFor("model")}
        />

        {/*
          Year and mileage share a row at every width: a four-digit year never needs a full phone
          width, and the pair reads as one line of the car's papers. Mileage carries its unit
          inside the box, so the hint no longer has to explain kilometres.
        */}
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-5">
          <Field name="modelYear" label="Year" error={form.errorFor("modelYear")}>
            <input
              id="modelYear"
              name="modelYear"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              aria-invalid={form.errorFor("modelYear") ? true : undefined}
              aria-describedby={form.errorFor("modelYear") ? "modelYear-error" : undefined}
              className={`${INPUT_CLASS} tabular`}
            />
          </Field>

          <Field
            name="mileageKm"
            label="Mileage"
            hint="As close as you can."
            error={form.errorFor("mileageKm")}
          >
            <div className="relative">
              <input
                id="mileageKm"
                name="mileageKm"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                aria-invalid={form.errorFor("mileageKm") ? true : undefined}
                aria-describedby={
                  form.errorFor("mileageKm") ? "mileageKm-hint mileageKm-error" : "mileageKm-hint"
                }
                className={`${INPUT_CLASS} pe-12 tabular`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 end-0 mt-2 flex items-center pe-4 text-sm font-medium text-muted"
              >
                km
              </span>
            </div>
          </Field>
        </div>
      </fieldset>

      {/* ------------------------------------------------------------------- step two */}
      <fieldset hidden={form.step !== 1} className="min-w-0 space-y-6">
        <legend className="sr-only">Condition and papers</legend>
        <h2 ref={form.step === 1 ? form.headingRef : null} tabIndex={-1} className="rn-h3">
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
          legend="Condition"
          hint="Pick the closest match. The dealership confirms it when they see the car."
          type="radio"
          options={CONDITIONS}
          error={form.errorFor("condition")}
        />

        <ChoiceGroup
          name="serviceHistory"
          legend="Service history"
          type="radio"
          columns={3}
          options={SERVICE_HISTORIES}
          error={form.errorFor("serviceHistory")}
        />

        <ChoiceGroup
          name="finance"
          legend="Is there finance still owing on it?"
          hint="You can still sell a car the bank holds the papers for. The dealership settles it with your bank."
          type="radio"
          columns={3}
          options={FINANCE_STATES}
          error={form.errorFor("finance")}
        />

        <Field
          name="notes"
          label="Anything a dealership should know?"
          optional
          hint="Accident history, a warning light, a missing spare key."
          error={form.errorFor("notes")}
        >
          <textarea
            id="notes"
            name="notes"
            rows={3}
            aria-describedby="notes-hint"
            className={TEXTAREA_CLASS}
          />
        </Field>
      </fieldset>

      {/* ----------------------------------------------------------------- step three */}
      <fieldset hidden={form.step !== 2} className="min-w-0 space-y-5">
        <legend className="sr-only">Where it is and how to reach you</legend>
        <h2 ref={form.step === 2 ? form.headingRef : null} tabIndex={-1} className="rn-h3">
          Where it is and how to reach you
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="province" label="Province" error={form.errorFor("province")}>
            <select
              id="province"
              name="province"
              defaultValue=""
              onChange={(event) => setProvince(event.currentTarget.value)}
              aria-invalid={form.errorFor("province") ? true : undefined}
              aria-describedby={form.errorFor("province") ? "province-error" : undefined}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Choose a province
              </option>
              {provinces.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>

          <Field name="city" label="Town or city" error={form.errorFor("city")}>
            <input
              id="city"
              name="city"
              type="text"
              list="sell-towns"
              autoComplete="address-level2"
              maxLength={120}
              aria-invalid={form.errorFor("city") ? true : undefined}
              aria-describedby={form.errorFor("city") ? "city-error" : undefined}
              className={INPUT_CLASS}
            />
          </Field>
          <datalist id="sell-towns">
            {towns.map((town) => (
              <option key={`${town.province}-${town.name}`} value={town.name} />
            ))}
          </datalist>
        </div>

        <Field name="name" label="Your name" error={form.errorFor("name")}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            aria-invalid={form.errorFor("name") ? true : undefined}
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
              maxLength={200}
              aria-invalid={form.errorFor("email") ? true : undefined}
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
              maxLength={20}
              aria-invalid={form.errorFor("phone") ? true : undefined}
              aria-describedby={form.errorFor("phone") ? "phone-error" : undefined}
              className={`${INPUT_CLASS} tabular`}
            />
          </Field>
        </div>

        <ConsentBlock error={form.errorFor("consent")} />

        <p className="flex items-start gap-2 text-sm text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            We are still signing dealerships. If none near you buys this kind of car, we email you
            to say so.
          </span>
        </p>
      </fieldset>

      <BotTraps elapsedRef={form.elapsedField} />

      <StepNav
        step={form.step}
        stepCount={STEPS.length}
        pending={pending}
        submitLabel="Send it to dealerships"
        onBack={form.back}
        onNext={() => {
          normaliseMileage(formRef.current);
          form.next(validate);
        }}
        note={
          form.step < STEPS.length - 1
            ? "Nothing is sent until the last step."
            : "Free, and you never have to accept an offer."
        }
      />
    </form>
  );
}

/**
 * The consent, with the short version of the section 18 notice directly above it.
 *
 * The label's text is SELL_CONSENT_WORDING, the same constant the server action stores verbatim
 * on the consent record, and e2e/sell.spec.ts compares the two. One constant rather than two
 * copies of a sentence: the record is evidence of what was on screen, and evidence that does not
 * match the screen is worse than none. That is also why the review marker and the summary sit
 * outside the label.
 *
 * No number of dealerships appears here or anywhere else a seller reads. The ceiling is still in
 * the code; see MAX_DEALERSHIPS.
 */
function ConsentBlock({ error }: { error?: string }) {
  return (
    <div className="rounded-md border border-line bg-subtle p-4 sm:p-5">
      <p className="text-sm text-body">
        Your details go only to a shortlist of verified dealerships in your province that buy this
        kind of car, so they can contact you with an offer. Giving them is voluntary, you can ask us
        which dealerships received them, and you can withdraw at any time.{" "}
        <a href="#popia-heading" className="rn-link">
          Read the full notice
        </a>
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-line pt-4 text-sm">
        <input
          type="checkbox"
          name="consent"
          className="rn-check mt-0.5"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "consent-error" : undefined}
        />
        <span className="text-heading">{SELL_CONSENT_WORDING}</span>
      </label>

      {error ? (
        <p id="consent-error" className="rn-field__error mt-2 ps-8">
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <LegalReviewMarker reviewedAt={LEGAL_REVIEWED_AT.sellConsent} className="mt-3 ps-8" />
    </div>
  );
}

/**
 * After sending. Left-aligned, with what was sent and what happens next, and no promise of a
 * time: nobody has committed to one, so none is printed.
 */
function SellSuccess({ message, sent }: { message: string; sent: Sent | null }) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const rows = sent
    ? [
        { label: "Car", value: sent.car },
        { label: "Mileage", value: sent.mileage },
        { label: "Where", value: sent.where },
      ].filter((row) => row.value)
    : [];

  return (
    <div>
      <div role="status" className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className="rn-h3">
            Your car is on its way to dealerships
          </h2>
          <p className="mt-1 text-body">{message}</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <dl className="mt-6 divide-y divide-line rounded-md border border-line">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-x-4 px-4 py-3">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="text-sm font-semibold text-heading tabular">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <h3 className="mt-8 text-base font-semibold">What happens next</h3>
      <ol className="mt-3 space-y-3">
        {[
          "We match your car with dealerships in your province that buy that kind of car.",
          "A dealership that is interested contacts you directly, on the number and email you gave.",
          "If none takes it up, we email you to say so.",
        ].map((item, index) => (
          <li key={item} className="flex gap-3 text-sm text-body">
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-on-secondary tabular"
            >
              {index + 1}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <Link href="/cars" className={buttonClasses({ variant: "outline", block: "mobile" })}>
          Browse cars while you wait
          <ArrowRight aria-hidden="true" />
        </Link>
        <p className="text-sm text-muted">
          Changed your mind? Email{" "}
          <a href="mailto:privacy@rynet.co.za" className="rn-link">
            privacy@rynet.co.za
          </a>{" "}
          and we stop passing it on.
        </p>
      </div>
    </div>
  );
}
