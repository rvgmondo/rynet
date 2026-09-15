"use client";

import { ChevronDown, LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import type { ModelOption, PriceOption, StockOption } from "@/components/home/home-stock";
import { buttonClasses } from "@/components/ui/button-classes";
import { Field, Input, Select } from "@/components/ui/field";

/**
 * The home page search panel: a keyword, make, model, maximum price and province.
 *
 * It is a plain GET form to /cars first. With scripting off, or before hydration, the browser
 * submits it as it is and the buyer lands on an ordinary faceted URL, the same one the filter
 * rail produces. The names are the ones /cars reads: q, make, model, maxPrice, province.
 *
 * Hydrated, it does two small things and nothing else:
 *
 * 1. The model list narrows to the chosen make, and picking a model with no make chosen fills
 *    the make in. Without scripting the models are grouped by make instead.
 * 2. It drops empty fields before navigating. /cars reads `make ?? parsed.make`, so a submitted
 *    `make=` (an empty string, not a missing value) would stop "toyota" typed into the keyword
 *    from becoming a make filter.
 *
 * Every control has a visible label. The example query lives in the hint under the keyword, tied
 * to it with aria-describedby, because a placeholder is not a label and on a phone the old
 * example was clipped mid-word.
 *
 * LAYOUT. From 1280px it is one row: keyword, make, model, price, province and the button. On a
 * phone it is the keyword and a full-width Search button, with make, model, price and province
 * behind "More options", so the button is inside the first screen. The toggle is a native
 * checkbox with no name (it is never submitted) and the fields stay in the form while folded, so
 * it opens and the form submits with scripting off. The keyword already understands "toyota
 * hilux gauteng under 300", which is what most phone searches are.
 */
export function HeroSearch({
  makes,
  models,
  provinces,
  prices,
  submitLabel,
  className = "",
}: {
  makes: StockOption[];
  models: ModelOption[];
  provinces: StockOption[];
  prices: PriceOption[];
  /** "Search 311 cars", with any caveat the count needs already in it. */
  submitLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const modelsForMake = make ? models.filter((option) => option.makeSlug === make) : [];

  function chooseMake(next: string) {
    setMake(next);
    if (model && !models.some((option) => option.slug === model && option.makeSlug === next)) {
      setModel("");
    }
  }

  function chooseModel(next: string) {
    setModel(next);
    const owner = models.find((option) => option.slug === next)?.makeSlug;
    if (next && owner && !make) setMake(owner);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `/cars?${query}` : "/cars"));
  }

  return (
    <search aria-labelledby="hero-search-heading" className={className}>
      <h2 id="hero-search-heading" className="sr-only">
        Search cars for sale
      </h2>
      <form
        method="get"
        action="/cars"
        onSubmit={submit}
        className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-4 lg:gap-x-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto] xl:items-start"
      >
        <Field
          id="hero-q"
          label="Keyword"
          hint={<>Try &ldquo;bakkie under 300 gauteng&rdquo;</>}
          className="sm:col-span-2 lg:col-span-4 xl:col-span-1"
        >
          <Input
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Make, model or town"
            className="min-h-12"
          />
        </Field>

        <input id="hero-more" type="checkbox" className="peer sr-only sm:hidden" />
        <label
          htmlFor="hero-more"
          className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-1.5 rounded-sm text-sm font-semibold text-heading peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus sm:hidden [&_svg]:transition-transform peer-checked:[&_svg]:rotate-180"
        >
          More options: make, model, price, province
          <ChevronDown aria-hidden="true" className="size-4" />
        </label>

        <div className="grid grid-cols-2 gap-3 max-sm:hidden max-sm:peer-checked:grid sm:contents">
          <Field id="hero-make" label="Make">
            <Select
              name="make"
              value={make}
              onChange={(event) => chooseMake(event.target.value)}
              className="min-h-12"
            >
              <option value="">Any make</option>
              {makes.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} ({option.count})
                </option>
              ))}
            </Select>
          </Field>

          <Field id="hero-model" label="Model">
            <Select
              name="model"
              value={model}
              onChange={(event) => chooseModel(event.target.value)}
              className="min-h-12"
            >
              <option value="">Any model</option>
              {make
                ? modelsForMake.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name} ({option.count})
                    </option>
                  ))
                : makes.map((group) => {
                    const inGroup = models.filter((option) => option.makeSlug === group.slug);
                    if (inGroup.length === 0) return null;
                    return (
                      <optgroup key={group.slug} label={group.name}>
                        {inGroup.map((option) => (
                          <option key={option.slug} value={option.slug}>
                            {option.name} ({option.count})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
            </Select>
          </Field>

          <Field id="hero-price" label="Max price">
            <Select name="maxPrice" defaultValue="" className="min-h-12">
              <option value="">No limit</option>
              {prices.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field id="hero-province" label="Province">
            <Select name="province" defaultValue="" className="min-h-12">
              <option value="">Any province</option>
              {provinces.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} ({option.count})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <button
          type="submit"
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: "primary",
            size: "lg",
            block: true,
            className:
              "sm:col-span-2 sm:mt-1 sm:w-auto sm:justify-self-end sm:min-w-[16rem] lg:col-span-4 xl:col-span-1 xl:mt-[1.5625rem] xl:min-h-12 xl:min-w-0",
          })}
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
          ) : (
            <Search aria-hidden="true" />
          )}
          {submitLabel}
        </button>
      </form>
    </search>
  );
}
