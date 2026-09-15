import Link from "next/link";

export type RelatedLink = { href: string; label: string; count: number };
export type RelatedGroup = { title: string; links: RelatedLink[] };

/**
 * Where to go from a landing page: its most-listed models, variants, towns or provinces, each a
 * real indexable path with the number of cars behind it.
 *
 * Every link and every number comes from the set on the page, most-listed first, and a group with
 * nothing in it is not drawn. It sits after the results rather than above them, so on a phone the
 * first photograph stays inside the first screen.
 */
export function RelatedLinks({
  id,
  title,
  groups,
}: {
  id: string;
  title: string;
  groups: RelatedGroup[];
}) {
  const visible = groups.filter((group) => group.links.length > 0);
  if (visible.length === 0) return null;

  return (
    <section
      aria-labelledby={id}
      className="mt-[var(--section-tight)] border-t border-line pt-8 sm:pt-10"
    >
      <h2 id={id} className="rn-h3">
        {title}
      </h2>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {visible.map((group) => (
          <div key={group.title}>
            <h3 className="text-base font-semibold text-heading">{group.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="rn-chip gap-2">
                    <span>{link.label}</span>
                    <span className="text-xs text-muted tabular">
                      <span className="sr-only">, </span>
                      {link.count.toLocaleString("en-ZA")}
                      <span className="sr-only">{link.count === 1 ? " listing" : " listings"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
