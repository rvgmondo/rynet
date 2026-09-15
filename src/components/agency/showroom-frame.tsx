import { ArrowRight, ChevronDown, Lock, Search } from "lucide-react";
import Link from "next/link";

import { RynetLockup } from "@/components/brand/rynet-mark";
import { VehicleCard, type VehicleCardData } from "@/components/vehicles/vehicle-card";

/**
 * The Rynet marketplace in a browser window: the agency's working example, shown rather than described.
 *
 * Not a screenshot. The window chrome is drawn, and the cards inside it are the marketplace's own
 * VehicleCard rendering real listings, so the frame is always current, every card keeps its
 * "Demo listing" badge, and the title links really open the listing. The caption says plainly
 * that the listings are demonstration data.
 *
 * The drawn chrome (address bar, mini header, filter chips) is decorative and hidden from
 * assistive technology; the figure is named by its caption.
 *
 * PERFORMANCE. No card is `priority`. The home page renders this frame twice: in the hero from
 * 1024px, and below the fold under 1024px, each copy `display: none` at the other width, so a
 * phone never requests the hero copy's photographs (lazy images that are not rendered are not
 * fetched) and the headline stays the phone's largest paint. Below 560px only the first card
 * shows.
 */
export function ShowroomFrame({
  cards,
  tone = "light",
  className = "",
}: {
  cards: VehicleCardData[];
  /** "navy" when the caption sits on a navy band. */
  tone?: "light" | "navy";
  className?: string;
}) {
  if (cards.length === 0) return null;
  const navy = tone === "navy";

  return (
    <figure className={className}>
      <div
        className={`overflow-hidden rounded-lg border bg-page shadow-overlay ${navy ? "border-line-on-navy" : "border-line"}`}
      >
        <div aria-hidden="true">
          <div className="flex items-center gap-3 border-b border-line bg-card px-3 py-2 sm:px-4">
            <span className="flex shrink-0 gap-1.5">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
            </span>
            <span className="mx-auto flex min-w-0 max-w-[16rem] flex-1 items-center justify-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-xs text-muted">
              <Lock className="size-3 shrink-0" />
              <span className="truncate">rynet.co.za/cars</span>
            </span>
            <span className="w-9 shrink-0" />
          </div>

          <div className="flex items-center gap-4 border-b border-line bg-card px-3 py-2.5 sm:px-4">
            <RynetLockup className="h-4 w-auto" />
            <span className="hidden gap-4 text-xs font-medium text-body xl:flex">
              <span className="text-heading">Buy a car</span>
              <span>Dealerships</span>
              <span>How we verify</span>
            </span>
            <span className="ml-auto flex h-7 min-w-0 items-center gap-1.5 rounded-full border border-line-strong bg-card px-2.5 text-xs text-muted">
              <Search className="size-3 shrink-0" />
              <span className="truncate">Search make or model</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-3 pt-3 sm:px-4">
            <span className="me-1 text-sm font-semibold text-heading">Cars for sale</span>
            <span className="inline-flex h-7 items-center rounded-full border border-line-strong bg-card px-2.5 text-xs text-heading">
              Any body type
              <ChevronDown className="ms-1 size-3" />
            </span>
            <span className="inline-flex h-7 items-center rounded-full border border-line-strong bg-card px-2.5 text-xs text-heading">
              Newest listed
              <ChevronDown className="ms-1 size-3" />
            </span>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 p-3 xs:grid-cols-2 sm:p-4">
          {cards.map((card, index) => (
            <li
              key={card.publicRef}
              className={`min-w-0 ${index === 0 ? "flex" : "hidden xs:flex"}`}
            >
              <VehicleCard vehicle={card} />
            </li>
          ))}
        </ul>
      </div>

      <figcaption
        className={`mt-4 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 ${navy ? "text-on-navy-muted" : "text-muted"}`}
      >
        <span>
          The Rynet marketplace, which we built. Every listing on it today is demonstration data.
        </span>
        <Link
          href="/cars"
          className={
            navy
              ? "inline-flex min-h-6 items-center gap-1.5 font-semibold text-on-navy underline-offset-4 hover:underline focus-visible:outline-[color:var(--rn-focus-ring-on-navy)]"
              : "rn-link-arrow"
          }
        >
          Open the marketplace
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </figcaption>
    </figure>
  );
}
