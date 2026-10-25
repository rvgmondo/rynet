/*
 * THE RESTRICTION, SHOWN. The about page's opening picture: the kinds of business an agency
 * usually takes on, struck out one after another as the page loads, until only car dealerships
 * are left, in red. It says the one thing this page is about ("we only take dealerships") before
 * a word of it is read.
 *
 * CSS only: each line draws itself across its word on a delay. With reduced motion the lines are
 * simply there. The words keep their full colour throughout, so contrast never depends on where
 * the animation is. The list is decorative; the sentence it makes is given once to assistive
 * technology instead.
 */

const OTHERS = ["Restaurants", "Law firms", "Dentists", "Estate agents", "Gyms", "Hotels"];

export function OnlyDealers() {
  return (
    <div className="rn-only on-navy">
      <p className="sr-only">We work with car dealerships, and with nobody else.</p>
      <ul className="rn-only__list" aria-hidden="true">
        {OTHERS.map((name, index) => (
          <li key={name} className="rn-only__word">
            <span className="rn-only__text">{name}.</span>
            <span
              className="rn-only__strike"
              style={{ animationDelay: `${0.25 + index * 0.18}s` }}
            />
          </li>
        ))}
        <li className="rn-only__word rn-only__word--us">
          <span className="rn-only__text">Car dealerships.</span>
          <span className="rn-only__tag">The only ones we take</span>
        </li>
      </ul>
    </div>
  );
}
