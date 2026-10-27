import {
  BadgeCheck,
  Check,
  ChevronDown,
  Globe,
  ImageIcon,
  MessageCircle,
  RefreshCw,
  Store,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DealerSignupForm } from "@/components/dealers/dealer-signup-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonClasses } from "@/components/ui/button-classes";
import { DEALER_OFFER } from "@/content/dealer-offer";
import { faqJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "List your stock on Rynet",
  description:
    "Your cars on Rynet, a marketplace where only checked dealerships sell. We load every car ourselves, keep them up to date and make your social ads. Free while we launch.",
  alternates: { canonical: "/list-your-stock" },
};

/**
 * List your stock: the page a dealership lands on from a WhatsApp, an email or the site's own
 * "List your stock" buttons.
 *
 * ONE IDEA. The dealership does nothing. Every objection a dealer principal has to a new
 * marketplace is time (they already list on three, and will not retype their floor for a fourth),
 * so the page says, again and again in different ways, that we do the work. The form is the hero,
 * five questions, and everything below it answers a question the form raises.
 *
 * WHAT IT NEVER SAYS. No buyer numbers, no traffic, no count of dealerships, no logos and no
 * quotes: Rynet has none worth quoting yet and the brief forbids inventing them. No promise about
 * enquiry emails either, while the site has no mail server: buyers reach a dealership by WhatsApp
 * and phone straight from the listing, which works today, and that is what it promises.
 *
 * The offer itself (free while we launch) lives in src/content/dealer-offer.ts, so the terms are
 * one edit away and say the same thing everywhere.
 */

const STEPS = [
  {
    title: "Tell us who you are",
    body: "Five questions, under a minute. We call you back the same day.",
  },
  {
    title: "We load your stock",
    body: "We do it ourselves from your website. If some cars are only on a spreadsheet, send that and we do the rest.",
  },
  {
    title: "You get your showroom and your ads",
    body: "Your own page on Rynet, and ready-to-post ads of your cars for Facebook, Instagram and WhatsApp.",
  },
];

const GETS = [
  {
    icon: Store,
    title: "A showroom of your own",
    body: "Every car you have, under your name, with your address, hours and a map, at rynet.co.za/dealers/your-name.",
  },
  {
    icon: RefreshCw,
    title: "Stock that keeps itself up to date",
    body: "If your website lists your cars, Rynet reads it every few hours: new cars go on, price changes follow, sold cars come off.",
  },
  {
    icon: MessageCircle,
    title: "Buyers straight to you",
    body: "A buyer WhatsApps or calls you from your listing. No middleman, no lead fee, no call centre in between.",
  },
  {
    icon: Globe,
    title: "The same stock on your own website",
    body: "Two lines pasted into your website and it shows every car you have on Rynet, kept up to date by itself. No second list to keep.",
  },
  {
    icon: ImageIcon,
    title: "Your ads, made for you",
    body: "Ready-to-post artwork of your cars, with the price and your name on it, for your own Facebook page and WhatsApp status.",
  },
  {
    icon: BadgeCheck,
    title: "A marketplace with no private sellers",
    body: "Only checked dealerships sell on Rynet, so a buyer here is not comparing you with a stranger on a classifieds site.",
  },
];

const SOURCES = [
  {
    icon: Globe,
    title: "Your website",
    body: "Give us the address. If your cars are on it, we load them from there and keep them in step.",
  },
  {
    icon: Wrench,
    title: "Not on your website?",
    body: "If they're online, we load them by hand, ourselves. If some are only on a spreadsheet, send that and we do the rest. Photos on WhatsApp work too.",
  },
];

const FAQS = [
  { question: "What does it cost?", answer: DEALER_OFFER.later },
  {
    question: "Do I have to type my cars in?",
    answer:
      "No. We load them ourselves, and if your website lists them, Rynet keeps them up to date from there on its own. You never retype a car for us. The one thing we'd ask for is a spreadsheet of any cars that aren't online anywhere.",
  },
  {
    question: "We already use AutoTrader and Cars.co.za.",
    answer:
      "Keep them. Rynet is one more place buyers find you, at no cost to you, and we do the work of getting you there. We never copy your adverts from those sites: we only read your own website, with your permission.",
  },
  {
    question: "How do buyers reach me?",
    answer:
      "By WhatsApp or phone, straight from your listing, to the numbers you give us. Rynet does not sit in between or charge for a lead.",
  },
  {
    question: "Who can list on Rynet?",
    answer:
      "Registered dealerships only, never private sellers. We check every dealership before its cars go live, which is what lets a buyer trust everything on the site.",
  },
  {
    question: "Can I leave?",
    answer: "Any time. There is no contract. Send us one message and your showroom comes down.",
  },
];

export default function ListYourStockPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other insertion point, and every question below is visible on this page.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <Breadcrumbs
        trail={[
          { href: "/dealers", label: "Dealerships" },
          { href: "/list-your-stock", label: "List your stock" },
        ]}
      />

      {/* The hero is the form: promise, form, then the three steps, in that order on a phone. */}
      <section
        aria-labelledby="list-heading"
        className="border-b border-line bg-[linear-gradient(180deg,var(--rn-card)_0%,var(--rn-page)_22rem)]"
      >
        <div className="container-page grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:gap-x-16 lg:gap-y-10 lg:py-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="rn-eyebrow">For dealerships</p>
            <h1 id="list-heading" className="rn-h1 mt-3 max-w-[15ch]">
              Your cars on Rynet. We do the work.
            </h1>
            <p className="rn-lead mt-4 max-w-xl">{DEALER_OFFER.promise}</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-heading">
              <Check aria-hidden="true" className="size-4 text-success" strokeWidth={3} />
              {DEALER_OFFER.price}
            </p>
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div id="sign-up" className="rn-panel scroll-mt-24 p-5 sm:p-8">
              <DealerSignupForm />
            </div>
          </div>

          <section
            aria-labelledby="steps-heading"
            className="min-w-0 lg:col-start-1 lg:row-start-2"
          >
            <h2 id="steps-heading" className="text-lg font-semibold">
              How it works
            </h2>
            <ol className="mt-4 space-y-5">
              {STEPS.map((step, index) => (
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
        </div>
      </section>

      {/* ---------------------------------------------------------------- what you get */}
      <section aria-labelledby="gets-heading" className="container-page py-[var(--section-base)]">
        <div className="max-w-2xl">
          <p className="rn-eyebrow">What you get</p>
          <h2 id="gets-heading" className="rn-h2 mt-2">
            Everything a buyer needs to choose you, set up for you
          </h2>
        </div>
        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {GETS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span aria-hidden="true" className="rn-icon-tile">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="rn-h3">{title}</h3>
                <p className="mt-1.5 text-body">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------- how stock arrives */}
      <section aria-labelledby="sources-heading" className="border-y border-line bg-card">
        <div className="container-page grid gap-8 py-[var(--section-base)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow">No retyping</p>
            <h2 id="sources-heading" className="rn-h2 mt-2">
              However you keep your stock, we take it from there
            </h2>
            <p className="mt-4 text-body">
              You already list your cars somewhere. Typing them in again for a new site is the
              reason most dealerships never bother. So you do not.
            </p>
          </div>
          <ul className="grid border-t border-line md:grid-cols-2 md:divide-x md:divide-line">
            {SOURCES.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-4 border-b border-line py-5 md:block md:border-b-0 md:px-7 md:pt-7 md:pb-2 md:first:ps-0 md:last:pe-0"
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
        </div>
      </section>

      {/* ------------------------------------------------------------- the step after */}
      <section
        aria-labelledby="digital-heading"
        className="container-page pt-[var(--section-base)]"
      >
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-card p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
            <p className="rn-eyebrow">Want more than a listing?</p>
            <h2 id="digital-heading" className="rn-h3 mt-2">
              See your dealership's new website, free
            </h2>
            <p className="mt-2 text-body">
              Rynet Digital designs a new homepage for your dealership from your own stock and
              photographs, and sends you a private link. No cost, no obligation.
            </p>
          </div>
          <Link
            href="/digital/free-mockup"
            className={buttonClasses({ variant: "outline", size: "lg", block: "mobile" })}
          >
            Get a free mockup
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- questions */}
      <section aria-labelledby="faq-heading" className="container-page py-[var(--section-base)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="rn-eyebrow">Questions</p>
            <h2 id="faq-heading" className="rn-h2 mt-2">
              What dealerships ask us
            </h2>
            <p className="mt-4 text-body">
              Anything else, ask on the phone when we call. Or read{" "}
              <Link href="/how-verification-works" className="rn-link">
                how we check dealerships
              </Link>
              .
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-heading">
                  {faq.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pb-5 text-body">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------------ last ask */}
      <section aria-labelledby="close-heading" className="container-page pb-[var(--section-base)]">
        <div className="on-navy relative isolate overflow-hidden rounded-lg px-6 py-10 sm:px-10 sm:py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:px-14">
          <div className="max-w-2xl">
            <h2 id="close-heading" className="rn-h2">
              Five questions, and your cars are on Rynet
            </h2>
            <p className="mt-3 text-base text-on-navy-muted sm:text-lg">
              {DEALER_OFFER.price}. No contract.
            </p>
          </div>
          <a
            href="#sign-up"
            className={`${buttonClasses({ variant: "primary", size: "lg", block: "mobile" })} mt-8 lg:mt-0`}
          >
            Put my cars on Rynet
          </a>
        </div>
      </section>
    </>
  );
}
