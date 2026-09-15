import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

import { DealershipStatusBadge } from "@/components/ui/badge";
import { formatRand } from "@/lib/format";

import { DealerMonogram } from "./dealer-monogram";
import { carsCount, makesSummary } from "./names";

export type DirectoryDealer = {
  id: number;
  slug: string;
  tradingName: string;
  isDemonstration: boolean;
  foundedYear: number | null;
  /** "Pretoria, Gauteng", from the primary branch. */
  location: string | null;
  branchCount: number;
  stockCount: number;
  /** Makes in live stock, most listed first. Never the franchise list. */
  makes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  /** Up to three photographs from the newest photographed stock. */
  photos?: { url: string; width: number; height: number }[];
};

type Photo = NonNullable<DirectoryDealer["photos"]>[number];

/**
 * The cover: the dealership's own stock, one large photograph and two beside it, so every card
 * opens on a different forecourt rather than the same monogram. Decorative (alt="", inside a card
 * whose name is the link), lazy, and the 640px card rendition the vehicle cards already load.
 */
function Cover({ photos }: { photos: Photo[] }) {
  const layout =
    photos.length >= 3
      ? "grid-cols-[minmax(0,2fr)_minmax(0,1fr)] grid-rows-2"
      : photos.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";
  return (
    <div
      aria-hidden="true"
      className={`grid aspect-[2/1] gap-0.5 overflow-hidden rounded-t-[calc(var(--rn-radius-md)-1px)] bg-line ${layout}`}
    >
      {photos.slice(0, 3).map((photo, index) => (
        <img
          key={photo.url}
          src={photo.url}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          className={`size-full min-h-0 bg-subtle object-cover object-[50%_60%] ${
            index === 0 && photos.length >= 3 ? "row-span-2" : ""
          }`}
        />
      ))}
    </div>
  );
}

/**
 * One dealership in the directory.
 *
 * It reads like a storefront: a cover taken from the dealership's own stock with its status badge
 * on it, the monogram set into the cover's edge, the name and town, and then the two figures a
 * buyer compares dealerships on, how much stock and at what prices. The name link's ::after
 * covers the card, so the whole card is one target with one accessible name, and nothing else
 * inside it is focusable.
 *
 * What tells two dealerships apart is taken from their live stock (the photographs, the makes, the
 * count and the price range), never from the franchise field: printing "Toyota" from a franchise
 * list would present an invented business as an authorised dealer of a real brand.
 *
 * The status badge reads "Demo dealership" for a demonstration record and "Verified dealership"
 * only for a real one, through DealershipStatusBadge, which is the one place that decides it. It
 * is the one badge on the card. A dealership with no photographed stock has no cover, and the
 * badge moves beside the monogram.
 */
export function DealerDirectoryCard({ dealer }: { dealer: DirectoryDealer }) {
  const makes = makesSummary(dealer.makes);
  const otherBranches = dealer.branchCount - 1;
  const photos = dealer.photos ?? [];
  const hasCover = photos.length > 0;
  const hasRange = dealer.minPrice !== null && dealer.maxPrice !== null;

  return (
    <article className="rn-card h-full">
      {hasCover ? (
        <div className="relative">
          <Cover photos={photos} />
          <DealershipStatusBadge
            isDemonstration={dealer.isDemonstration}
            onPhoto
            className="absolute top-3 left-3 bg-card"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
        <div
          className={`flex items-end justify-between gap-3 ${hasCover ? "-mt-7" : "pt-5 sm:pt-6"}`}
        >
          <DealerMonogram
            name={dealer.tradingName}
            className={hasCover ? "ring-4 ring-[var(--rn-card)]" : ""}
          />
          {hasCover ? null : <DealershipStatusBadge isDemonstration={dealer.isDemonstration} />}
        </div>

        <h3 className="mt-3 text-xl leading-snug font-semibold tracking-tight text-heading">
          <Link
            href={`/dealers/${dealer.slug}`}
            className="inline-flex min-h-6 items-center text-inherit no-underline transition-colors duration-[var(--duration-micro)] after:absolute after:inset-0 after:z-[1] after:rounded-md hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid"
          >
            {dealer.tradingName}
          </Link>
        </h3>

        {dealer.location ? (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {dealer.location}
              {otherBranches > 0
                ? `, and ${otherBranches} more ${otherBranches === 1 ? "branch" : "branches"}`
                : null}
            </span>
          </p>
        ) : null}

        <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] border-y border-line">
          <div className="border-r border-line py-3 pr-5">
            <dt className="text-xs text-muted">In stock</dt>
            <dd className="mt-0.5 text-[0.9375rem] leading-snug font-semibold whitespace-nowrap text-heading tabular">
              {dealer.stockCount === 0 ? "None" : carsCount(dealer.stockCount)}
            </dd>
          </div>
          <div className="py-3 pl-5">
            <dt className="text-xs text-muted">{hasRange ? "Prices" : "Makes"}</dt>
            <dd className="mt-0.5 text-[0.9375rem] leading-snug font-semibold text-heading tabular">
              {hasRange ? (
                dealer.minPrice === dealer.maxPrice ? (
                  formatRand(dealer.minPrice as number)
                ) : (
                  <>
                    {formatRand(dealer.minPrice as number)}{" "}
                    <span className="font-normal text-muted">to</span>{" "}
                    {formatRand(dealer.maxPrice as number)}
                  </>
                )
              ) : (
                (makes ?? "None listed")
              )}
            </dd>
          </div>
        </dl>

        {hasRange && makes ? (
          <p className="mt-3 text-sm text-body">
            <span className="text-muted">Stocks </span>
            {makes}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-4 text-sm">
          {dealer.foundedYear ? (
            <p className="text-muted">
              Trading since <span className="tabular">{dealer.foundedYear}</span>
            </p>
          ) : (
            <span />
          )}
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 font-semibold text-accent"
          >
            {dealer.stockCount > 0 ? `See ${carsCount(dealer.stockCount)}` : "View dealership"}
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
