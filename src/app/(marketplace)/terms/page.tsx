import type { Metadata } from "next";
import Link from "next/link";

import { LegalReviewNotice, Prose } from "@/components/layout/prose";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms you agree to by using Rynet, what we are responsible for, and what we are not.",
  alternates: { canonical: "/terms" },
};

/** A DRAFT. The review banner stays until an attorney has read it. */
export default function TermsPage() {
  return (
    <Prose
      title="Terms of use"
      intro="What you can expect from Rynet, and what we expect from you."
      updated="26 August 2026"
    >
      <LegalReviewNotice />

      <h2>What Rynet is</h2>
      <p>
        Rynet is an advertising platform. Dealerships list vehicles, and buyers find them and get in
        touch. <strong>We are not a party to any sale.</strong> We do not own the vehicles, we do
        not hold the money, and we are not an agent for either side.
      </p>

      <h2>Only dealerships may list</h2>
      <p>
        Only registered dealerships we have verified may advertise on Rynet. There is no private
        seller account and no way to create one. See{" "}
        <Link href="/how-verification-works">how verification works</Link>.
      </p>

      <h2>What we are responsible for</h2>
      <p>
        Running the platform, verifying that a listing dealership is a real registered business, and
        removing listings and dealerships that do not meet the standard.
      </p>

      <h2>What we are not responsible for</h2>
      <ul>
        <li>
          <strong>The accuracy of a listing.</strong> Price, mileage, specification, service history
          and condition come from the dealership. We do not inspect vehicles.
        </li>
        <li>
          <strong>The sale.</strong> Any agreement is between you and the dealership, under their
          terms, and the Consumer Protection Act applies to it in the ordinary way.
        </li>
        <li>
          <strong>Finance figures.</strong> Every instalment on this site is an estimate, not a
          quotation and not an offer of credit. Rynet is not a credit provider and does not arrange
          credit. What you are actually offered depends on a credit assessment by a registered
          credit provider.
        </li>
      </ul>

      <h2>Using the site</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Scrape, copy or republish listings, or use automated tools to harvest data.</li>
        <li>Submit an enquiry you do not mean, or use the forms to send marketing.</li>
        <li>Try to access another user&apos;s or dealership&apos;s information.</li>
        <li>Interfere with the site, or attempt to get around its security.</li>
      </ul>
      <p>We may suspend access for any of these, without notice where the reason is serious.</p>

      <h2>Content and intellectual property</h2>
      <p>
        The site, its design and its code belong to Rynet. Listing content, including photographs,
        belongs to the dealership that supplied it, which grants us a licence to display it.
      </p>

      <h2>Availability</h2>
      <p>
        We aim to keep the site up and do not promise it always will be. We may change or withdraw
        features. Where a change materially affects a paying dealership, we will give notice.
      </p>

      <h2>Limitation</h2>
      <p>
        To the extent the law allows, Rynet is not liable for loss arising from a transaction with a
        dealership, from relying on information in a listing, or from the site being unavailable.
        Nothing here excludes liability that cannot lawfully be excluded, including under the
        Consumer Protection Act.
      </p>

      <h2>Law</h2>
      <p>South African law applies, and the South African courts have jurisdiction.</p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@rynet.co.za">hello@rynet.co.za</a>
      </p>
    </Prose>
  );
}
