import type { Metadata } from "next";

import { Prose } from "@/components/layout/prose";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How accessible Rynet is, what has been tested, what is known to be incomplete, and how to tell us when something does not work.",
  alternates: { canonical: "/accessibility" },
};

/**
 * The accessibility statement.
 *
 * Written to be accurate rather than reassuring, which is the only thing that makes a
 * statement like this worth publishing. It names what has NOT been tested, because claiming
 * conformance without a manual screen reader pass is claiming something nobody has checked.
 *
 * It gets updated when the Phase 9 audit happens. Until then it says so.
 */
export default function AccessibilityPage() {
  return (
    <Prose
      title="Accessibility"
      intro="We are building Rynet to WCAG 2.2 Level AA. Here is where it actually stands, including what has not been tested yet."
      updated="26 August 2026"
    >
      <h2>What is tested automatically, on every change</h2>
      <ul>
        <li>
          <strong>axe-core</strong> runs against every page template on desktop and mobile. Zero
          violations is the pass mark, and a single one fails the build.
        </li>
        <li>
          <strong>Colour contrast</strong> is computed from the design tokens rather than eyeballed.
          Every foreground and background pair in both themes is checked against the relevant WCAG
          threshold, and a change that breaks one fails the build.
        </li>
        <li>
          <strong>Layout from 320px to 1920px</strong>, checking that nothing ever forces the page
          to scroll sideways.
        </li>
        <li>
          <strong>Both colour themes</strong>, including with JavaScript disabled.
        </li>
      </ul>

      <h2>Built in from the start</h2>
      <ul>
        <li>Semantic HTML first. ARIA only where semantics genuinely fall short.</li>
        <li>
          Everything operable by keyboard, with a focus ring that stays visible on any background.
        </li>
        <li>A skip link, so you are not tabbing through the whole header on every page.</li>
        <li>
          Every form field has a persistent visible label. Placeholders are never used as labels,
          because they vanish the moment you start typing.
        </li>
        <li>Errors are announced, tied to their field, and say what to do about it.</li>
        <li>Touch targets are at least 44 by 44 pixels.</li>
        <li>Result counts are announced when they change.</li>
        <li>
          Reduced motion is honoured, and reduced does not mean broken: nothing disappears and no
          state becomes unreachable.
        </li>
        <li>
          Status is never carried by colour alone. Every coloured state has an icon or a label.
        </li>
      </ul>

      <h2>What is not done yet</h2>
      <p>Being straight about this is the point of the page. As at the date above:</p>
      <ul>
        <li>
          <strong>No manual screen reader testing has been carried out.</strong> Automated checks
          catch roughly a third of accessibility problems. A full NVDA and VoiceOver pass over
          search, listings, enquiry and the dealership pages is scheduled and has not happened.
        </li>
        <li>
          <strong>Vehicle photography is not on the site yet</strong>, so alt text on real images
          has not been tested at scale. Generated alt text from the vehicle details is built, and
          dealerships can override it per image.
        </li>
        <li>
          <strong>Some sections are not built.</strong> The dealership portal and the agency site do
          not exist yet, so nothing is claimed about them.
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
        specific report is far more useful than a general one. Which page, what you were trying to
        do, and what you were using.
      </p>
      <p>
        <a href="mailto:accessibility@rynet.co.za">accessibility@rynet.co.za</a>
      </p>
      <p>
        We aim to respond within five working days, and to tell you either when it is fixed or why
        it will take longer.
      </p>
    </Prose>
  );
}
