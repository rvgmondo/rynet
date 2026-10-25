import { TERMS } from "@/components/agency/agency-content";

/*
 * THE WRITTEN QUOTE. The pricing page's opening picture. Rynet Digital does not publish rates,
 * and the page says why; what a dealership does get is a figure in writing, after a free review
 * and a call, before it commits. So the picture is that piece of paper: a quote for "Your
 * Dealership" whose lines write themselves in as the page loads, then the three terms that
 * never change are stamped along the foot.
 *
 * No figure appears on it, on purpose: the total line says where the figure comes from rather
 * than inventing one. CSS only. With reduced motion every line is simply there. Decorative; the
 * same steps are said in words on the page, so it is hidden from assistive technology.
 */

const LINES = [
  { item: "The review of your site, stock feed and advertising", cost: "Free" },
  { item: "A call to agree what matters to you this year", cost: "No charge" },
  { item: "Scope, written against the review", cost: "In writing" },
];

export function QuoteSheet() {
  return (
    <div className="rn-quote" aria-hidden="true">
      <div className="rn-quote__paper">
        <div className="rn-quote__head">
          <span className="rn-quote__brand">Rynet Digital</span>
          <span className="rn-quote__doc">Written quote</span>
        </div>
        <p className="rn-quote__to">
          For <strong>Your Dealership</strong>
        </p>
        <ul className="rn-quote__lines">
          {LINES.map((line, index) => (
            <li
              key={line.item}
              className="rn-quote__line"
              style={{ animationDelay: `${0.3 + index * 0.35}s` }}
            >
              <span>{line.item}</span>
              <span className="rn-quote__cost">{line.cost}</span>
            </li>
          ))}
        </ul>
        <p className="rn-quote__total" style={{ animationDelay: "1.45s" }}>
          <span>Your figure</span>
          <span>On paper, before you commit</span>
        </p>
        <ul className="rn-quote__stamps">
          {TERMS.map((term, index) => (
            <li
              key={term.title}
              className="rn-quote__stamp"
              style={{ animationDelay: `${1.9 + index * 0.2}s` }}
            >
              {term.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
