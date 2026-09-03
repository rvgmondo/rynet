import config from "@payload-config";
import { BadgeCheck, Ban, FileText, ShieldCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SellForm } from "@/components/sell/sell-form";
import { MAX_DEALERSHIPS } from "@/lib/sell-to-dealer-schema";
import { faqJsonLd } from "@/lib/structured-data";

/**
 * Rendered on demand. It reads the province list from the database, and prerendering would
 * freeze it at build time and fail the build anywhere there is no database.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell your car to a verified dealership",
  description:
    "Tell us about your car and verified South African dealerships come back to you with offers. Rynet does not buy cars, does not value cars, and takes no cut.",
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
 * be invented, and this is a number somebody makes a financial decision on. The page says so
 * outright rather than quietly omitting it.
 *
 * **It cannot be misread as a listing.** The route is /sell-to-a-dealer, deliberately not
 * /sell-your-car, which is on a forbidden-href list enforced by an end-to-end test precisely
 * because it implies a private ad. There is a section on this page whose entire job is to say
 * that a private individual cannot list here and never will be able to.
 *
 * **It says the offer will be lower than a private sale.** That is the one thing a seller
 * discovers later and resents, so it is on the page before they fill anything in, with what
 * they get in exchange. No percentage is given, because no citable South African figure was
 * found and inventing one is exactly what the brief forbids.
 */
const FAQS = [
  {
    question: "Does Rynet buy my car?",
    answer:
      "No. Rynet is a marketplace, not a buyer. We pass your details to verified dealerships and they deal with you directly. We take no commission from you and no cut of the sale.",
  },
  {
    question: "What is my car worth?",
    answer:
      "We do not know, and we will not guess. Rynet has no vehicle valuation licence, so any number we showed you would be made up, and you would plan around it. The dealerships make the offers, and they make them on the actual car.",
  },
  {
    question: "Can I list my car on Rynet instead?",
    answer:
      "No. Only registered, verified dealerships list on Rynet, and there is no way for a private individual to. That rule is the whole reason buyers trust the site, so it is not something we make exceptions to. Selling to a dealership is the route that is open to you.",
  },
  {
    question: "How many dealerships get my details?",
    answer: `No more than ${MAX_DEALERSHIPS}, all of them verified, all of them in your province, and only ones that buy the kind of car you are selling. You can stop it at any time by emailing privacy@rynet.co.za.`,
  },
  {
    question: "What if I still owe money on the car?",
    answer:
      "You can still sell it. While a bank holds the papers you cannot pass ownership yourself, so the dealership gets a settlement figure from your bank, pays that amount to settle the account, and pays you whatever is left. If the car is worth less than the settlement, you pay in the difference. Say on the form that there is finance owing so the dealership plans for it.",
  },
  {
    question: "Will I get less than selling privately?",
    answer:
      "Almost certainly, yes. A dealership has to recondition the car, carry it on the floor until it sells, and stand behind it afterwards, and the offer reflects that. What you get in exchange is one conversation instead of twenty, no strangers at your house, and money that clears.",
  },
  {
    question: "Do I have to accept an offer?",
    answer:
      "No. There is nothing to sign, nothing to pay, and no obligation at any point. If none of the offers suit you, that is the end of it.",
  },
];

export default async function SellToADealerPage() {
  const payload = await getPayload({ config });
  const provinces = await payload.find({
    collection: "provinces",
    sort: "name",
    limit: 20,
    depth: 0,
  });

  const options = provinces.docs.map((province) => ({
    slug: province.slug,
    name: province.name,
  }));

  return (
    <div className="container-page py-[var(--section-tight)]">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />

      <Breadcrumbs trail={[{ href: "/sell-to-a-dealer", label: "Sell to a dealership" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl leading-[1.15]">Sell your car to a verified dealership</h1>
        <p className="mt-5 text-lg text-ink-secondary">
          Tell us what you are driving and we pass it to verified dealerships near you that buy that
          kind of car, so they can make you an offer. No strangers at your gate, no waiting for a
          bank transfer that never arrives.
        </p>
      </div>

      {/*
        Rynet has not signed a single dealership yet. Everything on this page describes what
        happens when it has, and a page that quietly assumes that is a page that takes somebody
        details on a promise it cannot currently keep. The agency site has the same problem and
        solves it the same way: say so, in the first thing the reader sees.
      */}
      <div
        role="note"
        className="measure mt-8 rounded-lg border-2 border-warning bg-warning-subtle p-5"
      >
        <p className="font-display text-sm font-bold text-warning">
          We are new, so read this first
        </p>
        <p className="mt-2 text-sm text-ink-secondary">
          Rynet is signing dealerships now, and there may not yet be one in your province that buys
          your kind of car. If we cannot place it, we will email you and tell you rather than sit on
          your details. Nothing here costs you anything and nothing obliges you to sell.
        </p>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-16">
        <div>
          <SellForm provinces={options} />

          {/*
            POPIA section 18 requires the data subject to be told these things BEFORE the
            information is collected, not afterwards and not only behind a link. So it sits
            under the form on the same screen rather than in the privacy notice alone. The
            two easiest items to miss are both here: s18(1)(b) asks for an ADDRESS, not only
            an email, and s18(1)(h)(v) wants the Regulator's own contact details rather than
            a statement that a right to complain exists.
          */}
          <section
            aria-labelledby="popia-heading"
            className="mt-8 rounded-lg border border-line p-6"
          >
            <h2 id="popia-heading" className="text-lg">
              What happens to your details
            </h2>
            <p className="mt-2 text-xs text-ink-muted">
              Required by section 18 of the Protection of Personal Information Act. A draft, not
              reviewed by an attorney.
            </p>

            <dl className="mt-4 space-y-3 text-sm">
              {[
                {
                  term: "Who is asking",
                  detail:
                    "Rynet, of Pretoria, Gauteng. Postal and physical address to be confirmed before launch. Contact privacy@rynet.co.za.",
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
                <div key={item.term}>
                  <dt className="font-semibold">{item.term}</dt>
                  <dd className="mt-0.5 text-ink-secondary">{item.detail}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-sm text-ink-secondary">
              The full notice, including how long we keep things, is in our{" "}
              <Link href="/privacy">privacy notice</Link>.
            </p>
          </section>
        </div>

        <div className="space-y-10">
          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-2xl">
              How it works
            </h2>
            <ol className="mt-5 space-y-4">
              {[
                {
                  title: "You describe the car",
                  body: "Make, model, year, mileage, condition and where it is. It takes about two minutes and the first screen asks nothing personal.",
                },
                {
                  title: `We send it to no more than ${MAX_DEALERSHIPS} dealerships`,
                  body: "Verified, registered dealerships in your province that trade in that kind of vehicle. Nobody else, and never more than five.",
                },
                {
                  title: "They contact you, or we tell you nobody did",
                  body: "Dealerships deal with you directly, not through us, and any offer is subject to them seeing the car, because nobody can price one properly from a form. If none of them takes it up, you hear that from us.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle font-display text-sm font-bold tabular text-accent"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-ink-secondary">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/*
            The section that makes the rest believable, and the one that keeps the platform's
            hard rule intact. A page inviting private individuals to "sell your car" on a site
            that forbids private listings has to be unmistakable about the difference.
          */}
          <section aria-labelledby="not-heading">
            <h2 id="not-heading" className="text-2xl">
              What we do not do
            </h2>
            <ul className="mt-5 space-y-4 rounded-lg border-2 border-line-interactive p-6">
              {[
                {
                  Icon: Ban,
                  title: "We do not list your car on Rynet",
                  body: "Only registered dealerships list here. A private individual cannot, by any route, and that is deliberate: it is the reason a buyer on Rynet knows who they are dealing with. Selling to a dealership is the door that is open to you.",
                },
                {
                  Icon: Wallet,
                  title: "We do not value your car",
                  body: "We hold no valuation licence, so any figure we put on this page would be invented. You will not see an estimate here. The dealerships make the offers, on the car itself.",
                },
                {
                  Icon: ShieldCheck,
                  title: "We do not buy it, and we take no cut",
                  body: "Rynet is not a party to the sale. Nothing you do here costs you anything, and no commission comes out of what you are paid.",
                },
                {
                  Icon: FileText,
                  title: "We do not pass your details to anyone else",
                  body: `Up to ${MAX_DEALERSHIPS} verified dealerships in your province, for this one purpose. Not sold on, not added to a marketing list, not handed to a lead broker.`,
                },
              ].map(({ Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                  <div>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-ink-secondary">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="price-heading">
            <h2 id="price-heading" className="text-2xl">
              An honest word about the price
            </h2>
            <div className="mt-4 space-y-3 text-sm text-ink-secondary">
              <p>
                A dealership will offer you less than you would get selling privately. That is not a
                trick, it is arithmetic: they have to recondition the car, licence it, carry it on
                the floor until somebody buys it, and stand behind it afterwards.
              </p>
              <p>
                What you get for that difference is one conversation instead of twenty, nobody
                unknown coming to your house for a test drive, no risk of a payment reversing after
                the car has gone, and a settlement handled properly if there is still finance on it.
              </p>
              <p>
                If the money matters more than the hassle, sell privately. We would rather say that
                than have you find out afterwards.
              </p>
            </div>
          </section>

          <section aria-labelledby="papers-heading">
            <h2 id="papers-heading" className="text-2xl">
              What to have ready
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-secondary">
              {[
                "Your identity document, and proof of address.",
                "The registration certificate, if the car is paid off. If it is not, the bank holds it and the dealership will get a settlement figure.",
                "The service book, if you have it. It is worth real money at this point.",
                "Both keys, and the spare remote if there is one.",
                "The current licence disc.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-muted">
              Nothing here is legal advice, and the requirements for transferring a vehicle are set
              by your provincial licensing authority rather than by us.
            </p>
          </section>
        </div>
      </div>

      <section aria-labelledby="faq-heading" className="mt-[var(--section-base)]">
        <h2 id="faq-heading" className="text-2xl">
          Questions people actually ask
        </h2>
        <dl className="measure mt-6 divide-y divide-line border-y border-line">
          {FAQS.map((faq) => (
            <div key={faq.question} className="py-5">
              <dt className="font-semibold">{faq.question}</dt>
              <dd className="mt-2 text-sm text-ink-secondary">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="buying-heading"
        className="mt-[var(--section-base)] rounded-lg bg-surface-sunken p-8"
      >
        <h2 id="buying-heading" className="text-2xl">
          Buying rather than selling?
        </h2>
        <p className="measure mt-3 text-ink-secondary">
          Every car on Rynet comes from a dealership we have checked. There are no private sellers
          on the site, which is the whole point of it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/cars"
            className="inline-flex min-h-11 items-center rounded-md bg-accent-solid px-6 font-semibold text-ink-on-accent hover:bg-accent-solid-hover"
          >
            Browse the stock
          </Link>
          <Link
            href="/how-verification-works"
            className="inline-flex min-h-11 items-center rounded-md border-2 border-line-interactive px-6 font-semibold hover:bg-surface-raised"
          >
            How we verify dealerships
          </Link>
        </div>
      </section>
    </div>
  );
}
