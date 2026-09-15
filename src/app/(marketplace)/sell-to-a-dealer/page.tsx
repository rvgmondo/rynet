import config from "@payload-config";
import { Ban, Check, ChevronDown, FileText, HandCoins, Scale } from "lucide-react";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LegalReviewMarker } from "@/components/layout/legal-review-marker";
import type { MakeOption } from "@/components/sell/make-model-fields";
import { type CityOption, type ProvinceOption, SellForm } from "@/components/sell/sell-form";
import { Notice } from "@/components/ui";
import { buttonClasses } from "@/components/ui/button-classes";
import { COMPANY } from "@/content/company";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";
import { MAX_DEALERSHIPS } from "@/lib/sell-to-dealer-schema";
import { faqJsonLd } from "@/lib/structured-data";

/**
 * Rendered on demand. It reads the provinces, towns, makes and models from the database, and
 * prerendering would freeze them at build time and fail the build anywhere there is no database.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell your car to a dealership",
  description:
    "Describe your car once and dealerships in your province that buy that kind of car can contact you with an offer. Free, no obligation, and Rynet never buys or values cars.",
  alternates: { canonical: "/sell-to-a-dealer" },
};

/**
 * Sell to a dealer.
 *
 * This page exists because of the platform's hard rule rather than in spite of it. Only
 * registered dealerships may list on Rynet, so a private individual with a car to sell arrives
 * and has nowhere to go. This is where they go: they do not get a listing, they get offers.
 *
 * Three things had to be true for this page to be honest, and they shaped all of it.
 *
 * **It shows no valuation.** Rynet has no licensed valuation source, so any figure here would
 * be invented, and this is a number somebody makes a financial decision on. No rand figure
 * appears anywhere on the page, and e2e/sell.spec.ts fails the build if one does.
 *
 * **It cannot be misread as a listing.** The route is /sell-to-a-dealer, deliberately not
 * /sell-your-car, which is on a forbidden-href list enforced by an end-to-end test precisely
 * because it implies a private ad.
 *
 * **It says the offer will be lower than a private sale.** That is the one thing a seller
 * discovers later and resents, so the comparison is on the page before they send anything.
 *
 * SHOWROOM. The form is the hero: on a phone the first field sits inside the first screen, and
 * on a desktop the form card stands beside the promise. Everything below it answers a question
 * the form raises, once, instead of repeating the same three facts ten times.
 */

const FAQS = [
  {
    question: "Does Rynet buy my car?",
    answer:
      "No. Rynet is a marketplace, not a buyer. We pass your details to dealerships that buy your kind of car, and they deal with you directly. We take no commission from you and no cut of the sale.",
  },
  {
    question: "What is my car worth?",
    answer:
      "Rynet does not value cars. Dealerships make offers once they have seen the car, which is the only way to price one properly.",
  },
  {
    question: "Can I list my car on Rynet instead?",
    answer:
      "No. Only registered dealerships list on Rynet, so buyers always know who they are dealing with. Selling to a dealership is the route open to you.",
  },
  {
    question: "How many dealerships get my details?",
    answer: `No more than ${MAX_DEALERSHIPS}, all in your province, and only ones that buy the kind of car you are selling. Your details are not sold on, not added to a marketing list and not handed to a lead broker. You can stop it at any time by emailing privacy@rynet.co.za.`,
  },
  {
    question: "What if I still owe money on the car?",
    answer:
      "You can still sell it. While a bank holds the papers you cannot pass ownership yourself, so the dealership gets a settlement figure from your bank, pays that amount to settle the account, and pays you whatever is left. If the car is worth less than the settlement, you pay in the difference. Say on the form that there is finance owing so the dealership plans for it.",
  },
  {
    question: "Will I get less than selling privately?",
    answer:
      "Usually, yes. A dealership has to recondition the car, carry it until it sells and stand behind it afterwards, and its offer reflects that. In exchange you deal with one business, nobody comes to your home for a test drive, and the money comes from a registered company.",
  },
  {
    question: "Do I have to accept an offer?",
    answer:
      "No. There is nothing to sign, nothing to pay, and no obligation at any point. If none of the offers suit you, that is the end of it.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Describe your car",
    body: "Make, model, year, mileage and condition, then where it is. The first step asks nothing personal.",
  },
  {
    title: `Up to ${MAX_DEALERSHIPS} dealerships see it`,
    body: "Only checked dealerships in your province that buy that kind of car, and nobody else.",
  },
  {
    title: "They contact you directly",
    body: "Any offer depends on the dealership seeing the car. If none takes it up, we email you to say so.",
  },
];

const REASSURANCES = [
  "Free to use. Rynet takes no commission and no cut of the sale.",
  "No obligation. Say no to any offer, or to all of them.",
  "Still paying it off? You can still sell it.",
  "Your details are never sold on or added to a marketing list.",
];

const COMPARISON = [
  {
    topic: "Price",
    dealer: "Usually lower. The dealership has to recondition, licence and stand behind the car.",
    private: "Usually higher.",
  },
  {
    topic: "Who you deal with",
    dealer: "One registered business at a time.",
    private: "Everyone who answers your advert.",
  },
  {
    topic: "Test drives by strangers",
    dealer: "None.",
    private: "Usually, and often from your home.",
  },
  {
    topic: "Payment",
    dealer: "Paid by a registered business.",
    private: "You make sure the money has cleared before the car goes.",
  },
  {
    topic: "Finance still owing",
    dealer: "The dealership settles it with your bank.",
    private: "You arrange the settlement with the buyer and the bank.",
  },
];

const PAPERS = [
  "Your identity document, and proof of address.",
  "The registration certificate, if the car is paid off. If it is not, the bank holds it.",
  "The service book, if you have one. A full history usually helps an offer.",
  "Both keys, and the spare remote if there is one.",
  "The current licence disc.",
];

/** Taxonomy for the form. Changes about once a year and is dropped through the `taxonomy` tag. */
const readFormOptions = unstable_cache(
  async () => {
    const payload = await getPayload({ config });
    const all = { limit: 2000, depth: 0, pagination: false } as const;

    const [provinces, cities, makes, models] = await Promise.all([
      payload.find({ collection: "provinces", sort: "name", ...all }),
      payload.find({ collection: "cities", sort: "name", ...all }),
      payload.find({ collection: "makes", sort: "name", ...all }),
      payload.find({ collection: "models", sort: "name", ...all }),
    ]);

    const usable = (doc: { isActive?: boolean | null; mergedInto?: unknown }) =>
      doc.isActive !== false && !doc.mergedInto;

    const provinceOptions: ProvinceOption[] = provinces.docs
      .filter(usable)
      .map((province) => ({ slug: province.slug, name: province.name }));

    const provinceSlug = new Map(provinces.docs.map((province) => [province.id, province.slug]));
    const cityOptions: CityOption[] = cities.docs.filter(usable).flatMap((city) => {
      const id = typeof city.province === "object" ? city.province?.id : city.province;
      const slug = id ? provinceSlug.get(id) : undefined;
      return slug ? [{ name: city.name, province: slug }] : [];
    });

    const modelsByMake = new Map<number, string[]>();
    for (const model of models.docs.filter(usable)) {
      const id = typeof model.make === "object" ? model.make?.id : model.make;
      if (!id) continue;
      modelsByMake.set(id, [...(modelsByMake.get(id) ?? []), model.name]);
    }

    const makeOptions: MakeOption[] = makes.docs.filter(usable).map((make) => ({
      name: make.name,
      aliases: (make.aliases ?? []).filter(Boolean),
      models: modelsByMake.get(make.id) ?? [],
    }));

    return { provinces: provinceOptions, cities: cityOptions, makes: makeOptions };
  },
  ["sell-form-options"],
  { revalidate: 3600, tags: ["taxonomy"] },
);

export default async function SellToADealerPage() {
  const options = await readFormOptions();

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <Breadcrumbs trail={[{ href: "/sell-to-a-dealer", label: "Sell to a dealership" }]} />

      {/*
        The hero IS the form. DOM order is promise, form, explanation, so a phone reads the
        headline, one sentence, then the first field; from 1024px the grid puts the explanation
        under the promise and the form card beside both.
      */}
      <section
        aria-labelledby="sell-heading"
        data-sell-page=""
        className="border-b border-line bg-[linear-gradient(180deg,var(--rn-card)_0%,var(--rn-page)_22rem)]"
      >
        <div className="container-page grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,35rem)] lg:gap-x-16 lg:gap-y-10 lg:py-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="rn-eyebrow">Sell to a dealership</p>
            <h1 id="sell-heading" className="rn-h1 mt-3 max-w-[16ch]">
              Sell your car to a dealership
            </h1>
            <p className="rn-lead mt-4 max-w-xl">
              Describe your car once, and dealerships in your province that buy that kind of car can
              contact you with an offer. It is free, and you never have to accept.
            </p>
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="rn-panel p-5 sm:p-8">
              <SellForm
                provinces={options.provinces}
                cities={options.cities}
                makes={options.makes}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="how-heading">
              <h2 id="how-heading" className="text-lg font-semibold">
                How it works
              </h2>
              <ol className="mt-4 space-y-5">
                {HOW_IT_WORKS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-on-secondary tabular"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-1">
                      <h3 className="text-base font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm text-body">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <ul className="grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
              {REASSURANCES.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-body">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-subtle text-success"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Notice title="We are new, so read this first">
              Rynet is signing dealerships now, and there may not yet be one in your province that
              buys your kind of car. If we cannot place it, we will email you and tell you rather
              than sit on your details.
            </Notice>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ three things */}
      <section aria-labelledby="know-heading" className="container-page py-[var(--section-base)]">
        <div className="max-w-2xl">
          <p className="rn-eyebrow">Before you start</p>
          <h2 id="know-heading" className="rn-h2 mt-2">
            Three things Rynet does not do
          </h2>
        </div>
        {/*
          Three statements, not three things to click, so no card chrome at any width: a divided
          list on a phone, and from 768px three columns under one rule with hairlines between.
        */}
        <ul className="mt-6 grid border-t border-line md:mt-10 md:grid-cols-3 md:divide-x md:divide-line">
          {[
            {
              icon: Ban,
              title: "We do not list your car on Rynet",
              body: "Only registered dealerships list here, so a buyer on Rynet always knows who they are dealing with. Selling to a dealership is the route open to you.",
            },
            {
              icon: Scale,
              title: "We do not value your car",
              body: "You will not see an estimate on this page. Dealerships make offers once they have seen the car, which is the only way to price one properly.",
            },
            {
              icon: HandCoins,
              title: "We do not buy it, and we take no cut",
              body: "Rynet is not a party to the sale. Nothing here costs you anything, and nothing comes out of what you are paid.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex gap-4 border-b border-line py-5 md:block md:border-b-0 md:px-8 md:pt-8 md:pb-2 md:first:ps-0 md:last:pe-0"
            >
              <span aria-hidden="true" className="rn-icon-tile">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="rn-h3 md:mt-5">{title}</h3>
                <p className="mt-1 text-body md:mt-2">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------------- comparison */}
      <section aria-labelledby="compare-heading" className="border-y border-line bg-card">
        <div className="container-page py-[var(--section-base)]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="rn-eyebrow">The trade-off</p>
              <h2 id="compare-heading" className="rn-h2 mt-2">
                A dealership or a private sale?
              </h2>
              <p className="mt-4 text-body">
                A dealership will usually offer you less than a private buyer would pay. This is
                what you get for the difference.
              </p>
              <p className="mt-4 font-semibold text-heading">
                If the money matters more than the hassle, sell privately. We would rather say so
                now.
              </p>
            </div>

            <div className="min-w-0">
              {/* A table from 640px. On a phone the same rows stack, so nothing scrolls sideways. */}
              <div className="hidden overflow-hidden rounded-md border border-line sm:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Selling to a dealership compared with selling privately
                  </caption>
                  <thead className="bg-subtle">
                    <tr>
                      <th scope="col" className="w-[28%] px-5 py-3.5 font-semibold text-muted">
                        <span className="sr-only">Topic</span>
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold text-heading">
                        Selling to a dealership
                      </th>
                      <th scope="col" className="px-5 py-3.5 font-semibold text-heading">
                        Selling privately
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {COMPARISON.map((row) => (
                      <tr key={row.topic} className="align-top">
                        <th scope="row" className="px-5 py-4 font-semibold text-heading">
                          {row.topic}
                        </th>
                        <td className="px-5 py-4 text-body">{row.dealer}</td>
                        <td className="px-5 py-4 text-body">{row.private}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-3 sm:hidden">
                {COMPARISON.map((row) => (
                  <li key={row.topic} className="rounded-md border border-line p-4">
                    <p className="font-semibold text-heading">{row.topic}</p>
                    <dl className="mt-2 space-y-2 text-sm">
                      <div>
                        <dt className="text-muted">Selling to a dealership</dt>
                        <dd className="text-body">{row.dealer}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Selling privately</dt>
                        <dd className="text-body">{row.private}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ questions and papers */}
      <section className="container-page py-[var(--section-base)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
          <div className="min-w-0">
            <h2 id="faq-heading" className="rn-h2">
              Common questions
            </h2>
            <div className="mt-6 divide-y divide-line rounded-md border border-line bg-card shadow-card">
              {FAQS.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-heading [&::-webkit-details-marker]:hidden">
                    <h3 className="text-base font-semibold">{faq.question}</h3>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted transition-transform duration-[var(--duration-micro)] group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="px-5 pb-5 text-body">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <section aria-labelledby="papers-heading" className="min-w-0">
            <div className="rn-card p-6">
              <h2 id="papers-heading" className="rn-h3">
                What to have ready
              </h2>
              <ul className="mt-4 space-y-3">
                {PAPERS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-body">
                    <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
                Not legal advice. What a vehicle transfer needs is set by your provincial licensing
                authority, not by Rynet.
              </p>
            </div>
          </section>
        </div>
      </section>

      {/*
        POPIA section 18 requires the data subject to be told these things BEFORE the information
        is collected, not afterwards and not only behind a link. The consent box carries a short
        version and a link here; this is the whole notice, always open. The two easiest items to
        miss are both here: s18(1)(b) asks for an ADDRESS, not only an email, and s18(1)(h)(v)
        wants the Regulator's own contact details rather than a statement that a right exists.
      */}
      <section
        id="popia"
        aria-labelledby="popia-heading"
        className="container-page pb-[var(--section-base)]"
      >
        <div className="rn-panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="rn-eyebrow">POPIA section 18</p>
            <h2 id="popia-heading" className="rn-h3 mt-2">
              What happens to your details
            </h2>
            <p className="mt-3 text-sm text-body">
              The Protection of Personal Information Act says you must be told this before you give
              us anything. This is the whole notice.
            </p>
            <LegalReviewMarker reviewedAt={LEGAL_REVIEWED_AT.sellNotice} className="mt-4" />
            <p className="mt-4 text-sm text-body">
              More on how we handle personal information is in our{" "}
              <Link href="/privacy">privacy notice</Link>.
            </p>
          </div>

          <dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
            {[
              {
                term: "Who is asking",
                /*
                 * Section 18(1)(b) asks for the responsible party's ADDRESS, so this is a gap the
                 * law requires us to admit rather than a note to delete. It becomes the real
                 * address the day COMPANY.streetAddress is set, and not before.
                 */
                detail: COMPANY.streetAddress
                  ? `${COMPANY.legalName ?? COMPANY.tradingName}, ${COMPANY.streetAddress}${COMPANY.postalAddress ? `, postal address ${COMPANY.postalAddress}` : ""}. Contact privacy@rynet.co.za.`
                  : `${COMPANY.tradingName}, of ${COMPANY.town}. Postal and physical address to be confirmed before launch. Contact privacy@rynet.co.za.`,
              },
              {
                term: "What we collect",
                detail:
                  "Your name, email address and phone number, and the details of the car: make, model, year, mileage, transmission, condition, service history, whether finance is owing, and the province and town it is in.",
              },
              {
                term: "Why",
                detail: `To send it to no more than ${MAX_DEALERSHIPS} verified dealerships so they can offer to buy your car. That is the only purpose, and it is the purpose we collect it for rather than something we decide later.`,
              },
              {
                term: "Do you have to give it",
                detail:
                  "No. It is entirely voluntary. If you do not, we simply cannot pass your car to anyone, which is the only consequence.",
              },
              {
                term: "Who receives it",
                detail:
                  "Verified, registered dealerships in your province that trade in your kind of vehicle. Once a dealership has your details it decides for itself what it does with them, so it answers for its own use of them and we cannot delete what it holds.",
              },
              {
                term: "Where it is kept",
                detail: "On servers in South Africa. We do not transfer it out of the country.",
              },
              {
                term: "Your rights",
                detail:
                  "You can ask what we hold and get a copy, have anything wrong corrected, have it deleted, object to the processing, and withdraw your consent at any time. Email privacy@rynet.co.za.",
              },
              {
                term: "If we get it wrong",
                detail:
                  "You can complain to the Information Regulator (South Africa), JD House, 27 Stiemens Street, Braamfontein, Johannesburg, or enquiries@inforegulator.org.za. You do not have to come to us first.",
              },
            ].map((item) => (
              <div key={item.term} className="min-w-0 border-t border-line pt-4">
                <dt className="font-semibold text-heading">{item.term}</dt>
                <dd className="mt-1 break-words text-body">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------- buying band */}
      {/*
        A rounded navy panel on the page ground, the same shape as the dealer band on /dealers, so
        it never runs into the navy footer as one block.
      */}
      <section aria-labelledby="buying-heading" className="container-page pb-[var(--section-base)]">
        <div className="on-navy flex flex-col gap-6 rounded-lg px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">
          <div className="max-w-xl">
            <h2 id="buying-heading" className="rn-h2">
              Buying rather than selling?
            </h2>
            <p className="mt-3">
              Every dealership is checked before it can list on Rynet, and there are no private
              sellers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/cars" className={buttonClasses({ size: "lg", block: "mobile" })}>
              Browse cars for sale
            </Link>
            <Link
              href="/how-verification-works"
              className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
            >
              How we verify dealerships
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
