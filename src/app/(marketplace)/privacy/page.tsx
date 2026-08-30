import type { Metadata } from "next";
import Link from "next/link";

import { LegalReviewNotice, Prose } from "@/components/layout/prose";

export const metadata: Metadata = {
  title: "Privacy notice and POPIA",
  description:
    "What personal information Rynet collects, why, who we share it with, how long we keep it, and how to get it back or have it deleted.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy notice, POPIA.
 *
 * A DRAFT. It carries the review banner and must not lose it until a South African attorney
 * has read it. Written in plain language on purpose: partly because POPIA requires that a
 * data subject can understand what they are agreeing to, and partly because a notice nobody
 * can read is a notice nobody has actually consented to.
 *
 * The Information Officer must be registered with the Information Regulator before this
 * goes live. For a company that is the managing director by default unless someone else is
 * formally designated. That is an action for Ruben, tracked in docs/CONTENT-NEEDED.md.
 */
export default function PrivacyPage() {
  return (
    <Prose
      title="Privacy notice"
      intro="What we collect, why, who sees it, and how to get it back. Written under the Protection of Personal Information Act."
      updated="26 August 2026"
    >
      <LegalReviewNotice />

      <h2>Who we are</h2>
      <p>
        Rynet is a vehicle marketplace operating in South Africa. In POPIA terms we are the
        responsible party for the personal information described here.
      </p>
      <p>
        <strong>Information Officer:</strong> to be confirmed and registered with the Information
        Regulator before launch. Contact:{" "}
        <a href="mailto:privacy@rynet.co.za">privacy@rynet.co.za</a>.
      </p>

      <h2>What we collect, and why</h2>

      <h3>When you enquire about a vehicle</h3>
      <p>
        Your name, email address, phone number and whatever you write in the message. We collect it
        for one purpose: to pass it to the dealership selling that vehicle so they can respond.
      </p>
      <p>
        <strong>Our lawful basis is your consent</strong>, which you give by ticking the box on the
        enquiry form. We record what you agreed to, word for word, along with the date and the
        version of this notice that was live at the time. You can withdraw that consent at any time,
        though we cannot take back an enquiry a dealership has already received.
      </p>

      <h3>When you browse</h3>
      <p>
        We keep aggregate counts of how many times a listing was viewed and how many times a phone
        number was revealed, because dealerships are entitled to know whether their stock is being
        seen. These counts are not linked to you.
      </p>
      <p>
        Our analytics does not use cookies and does not collect personal information. We chose it
        for that reason. See the <Link href="/cookies">cookie notice</Link>.
      </p>

      <h3>When you create an account</h3>
      <p>
        Your email address, name, a hashed password, and the province and city you choose. Buyer
        accounts exist so you can save vehicles and searches. A buyer account can never list a
        vehicle, which is a structural property of the platform rather than a setting.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>The dealership selling the vehicle you enquired about.</strong> That is the point
          of the enquiry, and it is what you consented to. We do not pass your details to any other
          dealership.
        </li>
        <li>
          <strong>Our hosting and email providers</strong>, as operators processing on our
          instruction under a written contract, which POPIA requires.
        </li>
        <li>
          <strong>Nobody else.</strong> We do not sell personal information, and we do not share it
          for anyone else's marketing.
        </li>
      </ul>

      <h2>Where it is kept</h2>
      <p>
        On servers in South Africa. Where a provider processes information outside the country, we
        only use one that offers protection comparable to POPIA.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Enquiries:</strong> three years from the date you sent one, so a dealership can
          answer a query about a past deal and so we can resolve a complaint.
        </li>
        <li>
          <strong>Consent records:</strong> for as long as we hold the information they relate to,
          plus three years. A consent record is the evidence of what you agreed to, and deleting it
          would leave us unable to demonstrate that you agreed at all.
        </li>
        <li>
          <strong>Accounts:</strong> until you delete yours, or after three years of no sign-in.
        </li>
      </ul>
      <p>Deletion is automatic when a retention period ends. It is not a manual clean-up.</p>

      <h2>Your rights</h2>
      <p>Under POPIA you can:</p>
      <ul>
        <li>Ask what personal information we hold about you, and get a copy.</li>
        <li>Have anything inaccurate corrected.</li>
        <li>Have your information deleted, where we are not required to keep it.</li>
        <li>Object to processing, and withdraw consent you have given.</li>
        <li>
          Complain to the Information Regulator. You do not have to come to us first, though it is
          usually quicker.
        </li>
      </ul>
      <p>
        Email <a href="mailto:privacy@rynet.co.za">privacy@rynet.co.za</a> and we will respond
        within 30 days. We may ask you to confirm who you are first, because handing someone else's
        information to whoever asks is its own breach.
      </p>

      <h2>Security</h2>
      <p>
        Everything travels over HTTPS. Passwords are hashed with argon2id and are not recoverable,
        by us or by anyone else. Sensitive fields, including a vehicle&apos;s full VIN, are
        encrypted at rest and never returned to a public request. Access to the systems holding
        personal information is limited to staff who need it, with two-factor authentication
        required on privileged accounts.
      </p>
      <p>
        Dealership data is isolated: a dealership can only ever read its own leads and stock,
        enforced in the query rather than in the interface.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        If personal information is accessed by someone who should not have it, we will notify the
        Information Regulator and everyone affected, as POPIA requires, and tell you plainly what
        happened and what to do about it.
      </p>

      <h2>Changes</h2>
      <p>
        If this notice changes materially we will say so on the site. Consent you gave under a
        previous version stays linked to that version, so what you agreed to does not change
        retroactively.
      </p>

      <h2>The Information Regulator</h2>
      <p>
        Information Regulator (South Africa), JD House, 27 Stiemens Street, Braamfontein,
        Johannesburg.{" "}
        <a href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a>
      </p>
    </Prose>
  );
}
