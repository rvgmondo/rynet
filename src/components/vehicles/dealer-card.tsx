import { BadgeCheck, Clock, MapPin } from "lucide-react";
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
    <div className="rounded-lg border border-line p-5">
      <p className="text-xs font-medium uppercase tracking-[var(--tracking-wide)] text-ink-muted">
        Sold by
      </p>

      <h2 className="mt-1 text-lg">
        <Link href={`/dealers/${dealer.slug}`} className="hover:text-accent">
          {dealer.tradingName}
        </Link>
      </h2>

      {verified ? (
        <Link
          href="/how-verification-works"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          <BadgeCheck aria-hidden="true" className="size-4" />
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
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line-interactive px-4 text-sm font-semibold hover:bg-surface-sunken"
      >
        See all their stock
      </Link>
    </div>
  );
}
