import { Clock, MapPin } from "lucide-react";
import Link from "next/link";

import { relName } from "@/lib/relations";
import type { Branch, Dealer } from "@/payload-types";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * The selling dealership.
 *
 * The verified badge links to the page that explains what verification actually involves.
 * A trust badge that links nowhere is decoration, and on a platform whose whole proposition
 * is "only verified dealerships", decoration is the wrong thing to be.
 *
 * Today's hours are computed on the server. A buyer wants to know whether they can phone
 * now, not to read a table of seven rows and work it out.
 */
export function DealerCard({ dealer, branch }: { dealer: Dealer | null; branch: Branch | null }) {
  if (!dealer) return null;

  const verified = dealer.verificationStatus === "verified";
  const city = branch ? relName(branch.city) : null;
  const province = branch ? relName(branch.province) : null;

  const todayKey = DAY_ORDER[(new Date().getDay() + 6) % 7];
  const today = branch?.tradingHours?.find((h) => h.day === todayKey);

  return (
    <div className="border-t-2 border-ink p-5 ps-0">
      <p className="text-xs font-medium uppercase tracking-[var(--tracking-wide)] text-ink-muted">
        Sold by
      </p>

      <h2 className="mt-1 text-lg">
        <Link href={`/dealers/${dealer.slug}`} className="hover:text-accent">
          {dealer.tradingName}
        </Link>
      </h2>

      {/*
        The word in a ruled box, matching every listing card, rather than a red glyph.
        A BadgeCheck next to a dealer name is what every template ships and it persuades
        nobody; the claim is checkable because a dealership cannot publish stock until all
        three checks pass, and this links to what those are.
      */}
      {verified ? (
        <Link
          href="/how-verification-works"
          className="rn-label mt-3 inline-block border border-current px-1.5 py-1 hover:bg-ink hover:text-ink-inverse"
        >
          Verified dealership
        </Link>
      ) : null}

      {branch ? (
        <address className="mt-4 space-y-2 text-sm not-italic text-ink-secondary">
          <span className="flex items-start gap-2">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            <span>
              {branch.name}
              {branch.suburb ? <>, {branch.suburb}</> : null}
              {city ? (
                <>
                  <br />
                  {city}
                  {province ? `, ${province}` : ""}
                </>
              ) : null}
            </span>
          </span>

          {today ? (
            <span className="flex items-start gap-2">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
              <span>
                {today.closed ? (
                  "Closed today"
                ) : (
                  <>
                    Open today, <span className="tabular">{today.opensAt}</span> to{" "}
                    <span className="tabular">{today.closesAt}</span>
                  </>
                )}
              </span>
            </span>
          ) : null}
        </address>
      ) : null}

      <Link
        href={`/dealers/${dealer.slug}`}
        className="rn-label mt-4 inline-flex min-h-11 w-full items-center justify-center border border-line-interactive px-4 hover:bg-ink hover:text-ink-inverse"
      >
        See all their stock
      </Link>
    </div>
  );
}
