import { Mail, MapPin } from "lucide-react";
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
    <div className="container-page py-[var(--section-tight)]">
      <Breadcrumbs trail={[{ href: "/contact", label: "Contact" }]} />

      <div className="measure mt-6">
        <h1 className="text-4xl">Contact us</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          Four addresses rather than one, so your message reaches whoever can actually deal with it.
        </p>
      </div>

      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {routes.map((route) => (
          <li key={route.email} className="rounded-lg border border-line p-6">
            <h2 className="text-lg">{route.title}</h2>
            <p className="mt-2 text-sm text-ink-secondary">{route.body}</p>
            <a
              href={`mailto:${route.email}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-accent hover:underline"
            >
              <Mail aria-hidden="true" className="size-4" />
              {route.email}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-start gap-2 text-sm text-ink-secondary">
        <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <address className="not-italic">Pretoria, Gauteng, South Africa</address>
      </div>

      <p className="mt-8 text-sm text-ink-secondary">
        If something on the site is difficult to use, there is a separate address on the{" "}
        <Link href="/accessibility" className="font-semibold text-accent hover:underline">
          accessibility page
        </Link>
        .
      </p>
    </div>
  );
}
