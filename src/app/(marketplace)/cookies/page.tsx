import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "@/components/layout/prose";

export const metadata: Metadata = {
  title: "Cookies",
  description:
    "Rynet uses no tracking cookies and no advertising cookies. Here is the short list of what it does use, and why there is no consent banner.",
  alternates: { canonical: "/cookies" },
};

/**
 * The cookie notice.
 *
 * Short because the answer is short. This is not a draft needing legal review in the way the
 * privacy notice is: it is a factual description of what the site does, and what it does is
 * almost nothing.
 *
 * There is no consent banner because there is nothing to consent to. POPIA requires
 * non-essential scripts to be blocked BEFORE consent, and the honest way to meet that is not
 * to load any. If GA4 or an advertising pixel is ever added, a real gate has to come with
 * it, and this page has to change.
 */
export default function CookiesPage() {
  return (
    <Prose
      title="Cookies"
      intro="There is no cookie banner on this site because there is nothing to ask you about."
      updated="26 August 2026"
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
      </ul>
      <p>
        Both are strictly necessary for the thing you asked for, which is why neither needs your
        consent. Blocking them will sign you out and reset your theme; nothing else will change.
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
    </Prose>
  );
}
