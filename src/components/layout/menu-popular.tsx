import Link from "next/link";

import { formatRand } from "@/lib/format";

/*
 * Quick routes in the phone menu: body types, makes and price ceilings, the way the South African
 * marketplaces open their menus.
 *
 * A fixed list, for the footer's reason: the header renders on every route, including the ones
 * prerendered at build time where there is no database, so live counts are not available to it.
 * Every URL is a real page whatever the stock (a facet landing page, or `/cars?maxPrice=`), and
 * each is an ordinary GET link that works before hydration. Headed "Quick searches", never
 * "Popular": nobody has measured what is popular.
 */
const GROUPS = [
  {
    id: "menu-quick-body",
    label: "Body type",
    links: [
      { href: "/cars/body/bakkie", label: "Bakkies" },
      { href: "/cars/body/suv", label: "SUVs" },
      { href: "/cars/body/hatchback", label: "Hatchbacks" },
      { href: "/cars/body/sedan", label: "Sedans" },
    ],
  },
  {
    id: "menu-quick-make",
    label: "Make",
    links: [
      { href: "/cars/toyota", label: "Toyota" },
      { href: "/cars/volkswagen", label: "Volkswagen" },
      { href: "/cars/ford", label: "Ford" },
      { href: "/cars/suzuki", label: "Suzuki" },
      { href: "/cars/hyundai", label: "Hyundai" },
      { href: "/cars/isuzu", label: "Isuzu" },
    ],
  },
  {
    id: "menu-quick-price",
    label: "Price",
    links: [150_000, 250_000, 400_000].map((ceiling) => ({
      href: `/cars?maxPrice=${ceiling}`,
      label: `Under ${formatRand(ceiling)}`,
    })),
  },
] as const;

/**
 * Plain links in their own labelled navigation, never a disclosure: the header's one `<details>`
 * is the menu itself. The lists are not labelled by their eyebrows on purpose: a list named "Make"
 * would sit in the accessibility tree beside every form field of that name on the page behind it.
 */
export function MenuPopular() {
  return (
    <nav aria-label="Quick searches" className="border-t border-line px-4 pt-4 pb-3">
      {GROUPS.map((group, index) => (
        <div key={group.id} className={index > 0 ? "mt-4" : ""}>
          <p className="rn-eyebrow">{group.label}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rn-chip min-h-11 whitespace-nowrap">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
