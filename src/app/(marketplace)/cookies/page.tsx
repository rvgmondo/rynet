import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/conversion/legal-document";
import { LEGAL_REVIEWED_AT } from "@/content/legal-review";

export const metadata: Metadata = {
  title: "Cookies",
  description:
    "Rynet uses no tracking cookies and no advertising cookies. Here is the short list of what it does use, and why there is no consent banner.",
  alternates: { canonical: "/cookies" },
};

/**
 * The cookie notice.
 *
 * Short because the answer is short, and it carries the review marker anyway.
 *
 * The earlier reasoning here was that this page is a factual description of what the site
 * does rather than a legal draft, so it did not need the notice. That was wrong on its own
 * terms: "there is no cookie banner because there is nothing to ask you about" is a
 * conclusion about what POPIA requires, not a description of a script tag, and the brief
 * forbids publishing compliance copy as though it had been reviewed. The privacy notice and
 * the terms both carry the marker; this is the same kind of claim.
 *
 * There is no consent banner because there is nothing to consent to. POPIA requires
 * non-essential scripts to be blocked BEFORE consent, and the honest way to meet that is not
 * to load any. If GA4 or an advertising pixel is ever added, a real gate has to come with
 * it, and this page has to change.
 */
export default function CookiesPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Cookies"
      intro="There is no cookie banner on this site because there is nothing to ask you about."
      updated="14 September 2026"
      path="/cookies"
      reviewedAt={LEGAL_REVIEWED_AT.cookies}
    >
      <h2>What we do not use</h2>
      <ul>
        <li>No advertising or retargeting cookies.</li>
        <li>No third-party tracking pixels.</li>
        <li>No cross-site profiling of any kind.</li>
        <li>
          No analytics that identifies you. Ours uses no cookies and collects no personal
          information.
        </li>
      </ul>

      <h2>What we do use</h2>
      <ul>
        <li>
          <strong>A session cookie, if you sign in.</strong> It is what keeps you signed in. It is
          httpOnly, so no script can read it, and it goes when you sign out.
        </li>
        <li>
          <strong>Your theme choice</strong>, stored in your browser so the site does not flash to
          the wrong one on your next visit. It never leaves your device.
        </li>
        <li>
          <strong>A draft of a form you started</strong>, if you begin offering your car to
          dealerships or enquiring with Rynet Digital and leave before sending. What you typed is
          kept in your browser so it is there when you come back. It is not sent anywhere until you
          send the form, and Start again clears it.
        </li>
      </ul>
      <p>
        Each is strictly necessary for the thing you asked for, which is why none needs your
        consent. Blocking them will sign you out, reset your theme and stop a half-filled form
        coming back; nothing else will change.
      </p>

      <h2>If that changes</h2>
      <p>
        If we ever add something that does need consent, a real gate will come with it: the script
        will not load until you agree, rather than a banner appearing over a page that has already
        run it. We will update this page and say so.
      </p>

      <p>
        More on what we collect and why in the <Link href="/privacy">privacy notice</Link>.
      </p>
    </LegalDocument>
  );
}
