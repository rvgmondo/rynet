import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach Rynet, whether you are buying, running a dealership, or reporting a problem.",
  alternates: { canonical: "/contact" },
};

/**
 * Contact.
 *
 * Routed addresses rather than one catch-all, because the four reasons people write are
 * handled by different people, and an "info@" is read by nobody in particular.
 *
 * No general contact form. The enquiry form on a listing exists because it attaches to a
 * vehicle and a dealership; a general one would be a second surface to rate-limit,
 * spam-check and monitor, for no gain over an email address.
 *
 * REDRAWN. This was four bordered boxes in a two-column grid on one flat band, at the default
 * type scale, with an envelope glyph in front of every address. It is the end of the "List your
 * stock" link in the footer and of the verification page's own call to action, so a dealership
 * that has read two pages of argument about why Rynet is careful arrives at the page that was
 * least careful. The four routes are a ruled index now, which is what a list of four things is.
 */
export default function ContactPage() {
  const routes = [
    {
      title: "Buying a car",
      body: "Questions about a specific vehicle go to the dealership directly, using the enquiry button on the listing. They have the car and the paperwork. For anything about the platform itself, write to us.",
      email: "hello@rynet.co.za",
    },
    {
      title: "Listing your dealership",
      body: "If you run a registered dealership and want your stock on Rynet, this is the address. Tell us your trading name, your CIPC registration number and roughly how many units you carry.",
      email: "dealers@rynet.co.za",
    },
    {
      title: "Reporting a listing or a dealership",
      body: "If a listing is wrong, or a dealership did not turn out to be what the listing suggested, tell us. This is the main way we find out, and it is how a dealership ends up suspended.",
      email: "report@rynet.co.za",
    },
    {
      title: "Privacy and your information",
      body: "Access, correction and deletion requests under POPIA, and anything else about how we handle personal information.",
      email: "privacy@rynet.co.za",
    },
  ];

  return (
    <>
      <section className="rn-columns border-b border-line bg-surface-sunken">
        <div className="container-page py-[var(--section-tight)]">
          <Breadcrumbs trail={[{ href: "/contact", label: "Contact" }]} />

          <h1 className="rn-head mt-8 max-w-[10ch]">Contact us</h1>
          <p className="measure mt-6 text-lg text-ink-secondary">
            Four addresses rather than one, so your message reaches whoever can actually deal with
            it.
          </p>
        </div>
      </section>

      {/*
        A ruled index, not four cards.
        ------------------------------
        The address is the only thing on each row anybody is here for, so it is set at the row's
        leading edge in the display face rather than at the end of a paragraph behind an envelope
        glyph. The glyphs are gone: four envelopes beside four email addresses label a thing that
        is already labelled, in the one place on the page where red was being spent.
      */}
      <section className="container-page py-[var(--section-base)]">
        <ul className="border-t border-line">
          {routes.map((route) => (
            <li
              key={route.email}
              className="grid gap-3 border-b border-line py-8 lg:grid-cols-[20rem_1fr] lg:gap-12"
            >
              <div>
                <h2 className="font-display text-xl font-bold leading-snug">{route.title}</h2>
                <a
                  href={`mailto:${route.email}`}
                  className="rn-label mt-3 inline-flex min-h-11 items-center text-ink-muted underline decoration-line-interactive underline-offset-4 hover:text-ink hover:decoration-ink"
                >
                  {route.email}
                </a>
              </div>
              <p className="rn-prose text-ink-secondary">{route.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-8 lg:grid-cols-[20rem_1fr] lg:gap-12">
          <div>
            <p className="rn-label text-ink-muted">Where we are</p>
            <address className="rn-label mt-3 not-italic text-ink">
              Pretoria, Gauteng, South Africa
            </address>
          </div>
          <p className="rn-prose text-ink-secondary">
            If something on the site is difficult to use, there is a separate address on the{" "}
            <Link href="/accessibility">accessibility page</Link>, which goes to the person who can
            change it rather than to a queue.
          </p>
        </div>
      </section>
    </>
  );
}
