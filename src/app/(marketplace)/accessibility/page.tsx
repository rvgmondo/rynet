import type { Metadata } from "next";

import { LegalDocument } from "@/components/conversion/legal-document";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How accessible Rynet is, what is tested, what is known to be incomplete, and how to tell us when something does not work.",
  alternates: { canonical: "/accessibility" },
};

/**
 * The accessibility statement.
 *
 * Written to be accurate rather than reassuring, which is the only thing that makes a statement
 * like this worth publishing. Every "tested" line names a check that exists in e2e/ or CI, and it
 * names what has NOT been tested, because claiming conformance without a manual screen reader
 * pass is claiming something nobody has checked.
 *
 * Corrected in September 2026. It said photographs were not on the site yet (they are), that the
 * agency site did not exist (it does), that every touch target was 44 pixels (the standard is 24,
 * with 44 for the main actions), that result counts were announced (they are deliberately not a
 * live region) and that we reply within five working days, which nobody has committed to.
 *
 * Not legal wording, so it carries no legal review marker.
 */
export default function AccessibilityPage() {
  return (
    <LegalDocument
      eyebrow="Accessibility"
      title="Accessibility statement"
      intro="We are building Rynet to WCAG 2.2 Level AA. Here is where it actually stands, including what has not been tested yet."
      updated="14 September 2026"
      path="/accessibility"
    >
      <h2>What is tested automatically</h2>
      <ul>
        <li>
          <strong>axe-core</strong> runs against the main page templates (the home page, search, a
          listing, the sell to a dealership page, the Rynet Digital pages and the two-factor page)
          at a desktop size, and all of them except the two-factor page at a phone size too. Zero
          violations is the pass mark, and a single one fails the build.
        </li>
        <li>
          <strong>Colour contrast</strong> is computed from the design tokens rather than eyeballed.
          The text and control colour pairs in both themes are checked against the WCAG threshold
          that applies to each, and a change that breaks one fails the build.
        </li>
        <li>
          <strong>Layout from 320 to 1920 pixels wide</strong>, checking that nothing forces the
          page to scroll sideways.
        </li>
        <li>
          <strong>Both colour themes</strong>, including with JavaScript switched off, and pages
          with reduced motion requested.
        </li>
      </ul>

      <h2>Built in from the start</h2>
      <ul>
        <li>Semantic HTML first. ARIA only where the HTML genuinely falls short.</li>
        <li>
          Everything operable by keyboard, with one focus ring that stays visible on light and dark
          grounds.
        </li>
        <li>A skip link, so you are not tabbing through the whole header on every page.</li>
        <li>
          Every form field has a visible label that stays put. Placeholders are never used as
          labels, because they vanish the moment you start typing.
        </li>
        <li>Form errors are tied to their field and say what to do about it.</li>
        <li>
          Controls are at least 24 by 24 pixels, and the main actions at least 44 pixels tall.
        </li>
        <li>
          Reduced motion is honoured, and reduced does not mean broken: nothing disappears and no
          state becomes unreachable.
        </li>
        <li>Status is never carried by colour alone. Every coloured state has words or an icon.</li>
        <li>The search filters work with JavaScript switched off.</li>
      </ul>

      <h2>What is not done yet</h2>
      <p>Being straight about this is the point of the page. As at the date above:</p>
      <ul>
        <li>
          <strong>No manual screen reader testing has been carried out.</strong> Automated checks
          catch roughly a third of accessibility problems. A full NVDA and VoiceOver pass over
          search, listings, enquiry, selling and the dealership pages has not happened.
        </li>
        <li>
          <strong>
            Photograph descriptions have not been tested with the people who rely on them.
          </strong>{" "}
          Listing photographs carry a description built from the vehicle details, which a dealership
          can replace per photograph.
        </li>
        <li>
          <strong>Some pages are not covered by the automated checks above</strong>, including the
          dealership directory, the dealership pages and the legal pages.
        </li>
        <li>
          <strong>The admin screens</strong> that dealerships and Rynet staff sign in to have not
          been assessed.
        </li>
        <li>
          There is no formal WCAG-EM conformance report. When there is, it will be published here
          with its date and scope.
        </li>
      </ul>

      <h2>No overlay</h2>
      <p>
        We do not use an accessibility overlay, toolbar or widget, and we will not. They do not fix
        the underlying problems, they frequently make things worse for people using assistive
        technology, and they get in the way of the screen reader someone has already set up the way
        they want it. We fix the site instead.
      </p>

      <h2>Tell us when it does not work</h2>
      <p>
        If something on Rynet is difficult or impossible to use, we want to hear about it, and a
        specific report is far more useful than a general one: which page, what you were trying to
        do, and what you were using.
      </p>
      <p>
        <a href="mailto:accessibility@rynet.co.za">accessibility@rynet.co.za</a>
      </p>
      <p>We will tell you when it is fixed, or why it will take longer.</p>
    </LegalDocument>
  );
}
