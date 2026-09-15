import { ArrowRight, MapPin, Navigation } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DealershipStatusBadge } from "@/components/ui/badge";
import { populated, relName } from "@/lib/relations";
import { pick } from "@/lib/vehicle-photo";
import type { Branch, Dealer, Media } from "@/payload-types";

function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^[A-Za-z0-9]/.test(word));
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The selling dealership, at the foot of the summary card.
 *
 * Logo (or a monogram), name, status badge, town, and a link to the dealership's page.
 *
 * HONESTY FIRST. `DealershipStatusBadge` decides the badge, and the caller passes `demonstration`
 * as true when either the listing or the dealership is demonstration data, so an example car can
 * never sit under a "Verified dealership" badge. A real dealership only gets the verified badge
 * while its status actually is verified. The sentence under it says how Rynet works, not
 * something about this business.
 *
 * The street address and the directions link are shown only for a real dealership. For a
 * demonstration one they would be a real-looking address for a business that does not exist, and
 * a directions link would send a person to somebody else's property. Trading hours are left to the
 * dealership's own page, which knows about public holidays; a bare "open today" here would be
 * wrong on every one of them.
 */
export function DealerBlock({
  dealer,
  branch,
  demonstration,
  className = "",
}: {
  dealer: Dealer | null;
  branch: Branch | null;
  demonstration: boolean;
  className?: string;
}) {
  if (!dealer) return null;

  const verified = dealer.verificationStatus === "verified";
  const city = branch ? relName(branch.city) : null;
  const province = branch ? relName(branch.province) : null;
  const place = [city, province].filter(Boolean).join(", ");
  const logo = populated(dealer.logo as number | Media | null | undefined);
  const logoImage = logo ? pick(logo, "thumbnail") : null;

  const street =
    !demonstration && branch
      ? [branch.addressLine1, branch.suburb && branch.suburb !== city ? branch.suburb : null]
          .filter(Boolean)
          .join(", ")
      : null;
  const directions =
    !demonstration &&
    branch &&
    typeof branch.latitude === "number" &&
    typeof branch.longitude === "number"
      ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`
      : null;

  return (
    <section aria-labelledby="dealer-heading" className={`border-t border-line pt-5 ${className}`}>
      <p className="text-sm text-muted">Sold by</p>

      <div className="mt-2 flex items-start gap-3">
        {logoImage ? (
          <Image
            src={logoImage.url}
            alt=""
            width={logoImage.width}
            height={logoImage.height}
            sizes="3rem"
            className="size-12 shrink-0 rounded-sm border border-line bg-card object-contain p-1"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-sm bg-secondary text-sm font-bold tracking-normal text-on-secondary"
          >
            {initials(dealer.tradingName)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 id="dealer-heading" className="text-base leading-snug font-semibold text-heading">
            <Link
              href={`/dealers/${dealer.slug}`}
              className="inline-flex min-h-6 items-center rounded-xs no-underline hover:text-accent hover:underline hover:underline-offset-3"
            >
              {dealer.tradingName}
            </Link>
          </h2>
          {place ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              {place}
            </p>
          ) : null}
          {demonstration || verified ? (
            <DealershipStatusBadge isDemonstration={demonstration} className="mt-2" />
          ) : null}
        </div>
      </div>

      {street || directions ? (
        <address className="mt-4 grid gap-2 text-sm text-body not-italic">
          {street ? <span>{street}</span> : null}
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="rn-link inline-flex min-h-6 w-fit items-center gap-1.5"
            >
              <Navigation aria-hidden="true" className="size-4" />
              Get directions
              <span className="sr-only">, opens in a new tab</span>
            </a>
          ) : null}
        </address>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        {demonstration
          ? "Demo dealerships show how Rynet works. Real dealerships are checked before they can list."
          : "Every dealership is checked before it can list on Rynet."}{" "}
        <Link href="/how-verification-works" className="rn-link whitespace-nowrap">
          How we check
        </Link>
      </p>

      <Link href={`/dealers/${dealer.slug}`} className="rn-link-arrow mt-2 min-h-11">
        See all their stock
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
