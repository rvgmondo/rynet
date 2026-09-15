import { Notice } from "@/components/ui/notice";

/**
 * The one demonstration disclosure on a results page.
 *
 * Every listing on the platform today is seeded example data, and so is every dealership behind
 * one. Each card already carries a quiet "Demo listing" badge; this says what that means, once,
 * above the first car. The fact itself (demo listings, nothing here for sale) is in the title and
 * always visible; the why folds behind a native disclosure, because the full paragraph ran five
 * lines on a phone and read as the page's headline. It disappears on its own for a set with no
 * demonstration listings in it, and it names the share when real and seeded stock are mixed. It is
 * never removed while a demonstration listing is shown.
 *
 * The photograph caveat lives here too, because on a results page it is the same fact: a seeded
 * listing's photographs are of the model, not of a car that exists.
 */
export function DemoNotice({
  total,
  demo,
  className = "",
}: {
  total: number;
  demo: number;
  className?: string;
}) {
  if (demo === 0) return null;

  if (demo === total) {
    return (
      <Notice
        compact
        title="These are demo listings. Nothing here is for sale."
        details="Why these are examples"
        className={className}
      >
        Every car and dealership on this page is example data that shows how Rynet works. Photos
        show the model, not the individual car.
      </Notice>
    );
  }

  return (
    <Notice
      compact
      title={`${demo.toLocaleString("en-ZA")} of these ${total.toLocaleString("en-ZA")} listings are demos, and those are not for sale.`}
      details="What that means"
      className={className}
    >
      Demo listings and their dealerships are example data that shows how Rynet works. Each one
      carries a Demo listing badge, and its photos show the model, not the individual car.
    </Notice>
  );
}
