import {
  ArrowRight,
  ChevronDown,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  PhoneOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { relName } from "@/lib/relations";
import type { Branch, Dealer } from "@/payload-types";

import { directionsHref, telHref, whatsappHref } from "./contact-links";
import { openingStatus, todaysHours, weekRows } from "./trading-hours";

/**
 * How a buyer reaches a dealership: call, WhatsApp, directions, the address and the hours.
 *
 * HONESTY. A demonstration dealership gets no call, WhatsApp or directions action. Its branches
 * sit on real streets, so a Directions button would send a person to an address where no such
 * business trades, and a Call button invites them to phone a business that does not exist. The
 * panel says so in one plain sentence instead. It shows the area and the example hours so the page
 * demonstrates what a real dealership's page carries, but never the street line: a seeded address
 * on a real street, printed on a page, is an address somebody could drive to. "Open now" is
 * likewise only stated for a real dealership.
 */

export function BranchAddress({
  branch,
  demonstration = false,
  className = "",
}: {
  branch: Branch;
  /** A demonstration dealership shows its area only, never a street line or a postcode. */
  demonstration?: boolean;
  className?: string;
}) {
  const city = relName(branch.city);
  const province = relName(branch.province);
  if (demonstration) {
    return (
      <address className={`flex items-start gap-3 text-sm not-italic text-body ${className}`}>
        <MapPin aria-hidden="true" className="mt-0.5 size-[1.125rem] shrink-0 text-muted" />
        <span>{[branch.suburb, city, province].filter(Boolean).join(", ")}</span>
      </address>
    );
  }
  return (
    <address className={`flex items-start gap-3 text-sm not-italic text-body ${className}`}>
      <MapPin aria-hidden="true" className="mt-0.5 size-[1.125rem] shrink-0 text-muted" />
      <span>
        {branch.addressLine1}
        {branch.addressLine2 ? <>, {branch.addressLine2}</> : null}
        {branch.suburb ? <>, {branch.suburb}</> : null}
        <br />
        {[city, province].filter(Boolean).join(", ")}
        {branch.postalCode ? ` ${branch.postalCode}` : null}
        {branch.directionsNote ? (
          <span className="mt-1 block text-muted">{branch.directionsNote}</span>
        ) : null}
      </span>
    </address>
  );
}

export function OpeningStatusLine({
  branch,
  now,
  className = "",
}: {
  branch: Branch;
  now: Date;
  className?: string;
}) {
  const status = openingStatus(branch, now);
  if (!status) return null;
  return (
    <p className={`flex items-center gap-2 text-sm font-semibold ${className}`}>
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full ${status.open ? "bg-success" : "bg-line-control"}`}
      />
      <span className={status.open ? "text-success" : "text-body"}>{status.text}</span>
    </p>
  );
}

function HoursTable({ branch, now }: { branch: Branch; now: Date }) {
  const rows = weekRows(branch, now);
  return (
    <dl className="grid gap-y-0.5 text-sm">
      {rows.map((row) => (
        <div
          key={row.day}
          className={`flex min-h-7 items-center justify-between gap-4 rounded-sm px-2 ${row.isToday ? "bg-subtle font-semibold text-heading" : "text-body"}`}
        >
          <dt>
            {row.label}
            {row.isToday ? <span className="sr-only"> (today)</span> : null}
          </dt>
          <dd className="tabular">{row.hours}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The week's hours, folded behind a summary that already answers the usual question: what are
 * today's hours. Seven open rows made the contact panel the tallest thing in the header and
 * pushed the first row of stock below the fold on a laptop; a real dealership's "Open now" line
 * sits above this, visible, so nothing a buyer needs first is hidden. No JavaScript: a native
 * disclosure.
 */
export function TradingHours({
  branch,
  now,
  className = "",
}: {
  branch: Branch;
  now: Date;
  className?: string;
}) {
  if (!branch.tradingHours?.length) return null;
  const today = todaysHours(branch, now);
  return (
    <details className={`group ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-sm text-sm [&::-webkit-details-marker]:hidden">
        <Clock aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <span className="font-semibold text-heading">Trading hours</span>
        {today ? <span className="ml-auto truncate text-muted tabular">{today}</span> : null}
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted transition-transform duration-[var(--duration-micro)] group-open:rotate-180 motion-reduce:transition-none ${today ? "" : "ml-auto"}`}
        />
      </summary>
      <div className="pt-1 pb-1">
        <HoursTable branch={branch} now={now} />
      </div>
    </details>
  );
}

/** Call, WhatsApp and directions for a real dealership's branch. */
export function ContactActions({
  dealer,
  branch,
  compact = false,
}: {
  dealer: Dealer;
  branch: Branch;
  /** Smaller outline buttons, for a branch card rather than the main panel. */
  compact?: boolean;
}) {
  const call = branch.phone ? telHref(branch.phone) : null;
  const whatsappNumber = branch.whatsapp ?? dealer.whatsappNumber ?? null;
  const whatsapp = whatsappNumber
    ? whatsappHref(
        whatsappNumber,
        `Hi ${dealer.tradingName}, I found you on Rynet and would like to ask about your stock.`,
      )
    : null;
  const size = compact ? "sm" : "md";

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-2"}>
      {call && branch.phone ? (
        <a
          href={call}
          className={buttonClasses({
            variant: compact ? "outline" : "primary",
            size,
            block: !compact,
          })}
        >
          <Phone aria-hidden="true" />
          <span>
            Call <span className="tabular">{branch.phone}</span>
          </span>
        </a>
      ) : null}

      {whatsapp && !compact ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: "outline", size, block: true })}
        >
          <MessageCircle aria-hidden="true" />
          WhatsApp
          <span className="sr-only">, opens in a new tab</span>
        </a>
      ) : null}

      <a
        href={directionsHref(branch)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses({ variant: "outline", size, block: !compact })}
      >
        <Navigation aria-hidden="true" />
        Directions
        <span className="sr-only"> to {branch.name}, opens Google Maps in a new tab</span>
      </a>
    </div>
  );
}

export function DemoContactNote({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-3 rounded-md bg-subtle p-4 text-sm text-body ${className}`}>
      <PhoneOff aria-hidden="true" className="mt-0.5 size-[1.125rem] shrink-0 text-muted" />
      <span>
        Call, WhatsApp, directions and the street address switch on for real dealerships. This one
        is a demonstration, so there is nobody to call and no showroom to visit. The hours below are
        examples.
      </span>
    </p>
  );
}

/**
 * The contact panel in the dealership header. It carries the primary branch; a group with more
 * than one branch lists the rest further down the page.
 */
export function DealerContactPanel({
  dealer,
  branch,
  branchCount,
  now,
}: {
  dealer: Dealer;
  branch: Branch | null;
  branchCount: number;
  now: Date;
}) {
  const isDemonstration = Boolean(dealer.isDemonstration);

  return (
    <div className="rn-panel p-5 sm:p-6">
      <h2 id="contact-heading" className="text-xl font-semibold tracking-tight text-heading">
        {branchCount > 1 && branch ? `Visit ${branch.name}` : "Contact and visit"}
      </h2>

      {branch ? (
        <>
          {isDemonstration ? null : (
            <OpeningStatusLine branch={branch} now={now} className="mt-2" />
          )}

          {isDemonstration ? (
            <DemoContactNote className="mt-5" />
          ) : (
            <div className="mt-5">
              <ContactActions dealer={dealer} branch={branch} />
            </div>
          )}

          <BranchAddress branch={branch} demonstration={isDemonstration} className="mt-5" />
          <TradingHours branch={branch} now={now} className="mt-4 border-t border-line pt-3" />

          {branchCount > 1 ? (
            <a href="#branches-heading" className="rn-link-arrow mt-4">
              All {branchCount} branches
              <ArrowRight aria-hidden="true" />
            </a>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">
          This dealership has not added a branch address yet.
        </p>
      )}
    </div>
  );
}

/** One branch of a group, in the branch list under the stock. */
export function BranchCard({ dealer, branch, now }: { dealer: Dealer; branch: Branch; now: Date }) {
  const isDemonstration = Boolean(dealer.isDemonstration);
  return (
    <article className="rn-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight text-heading">{branch.name}</h3>
        {branch.isPrimary ? <Badge>Main branch</Badge> : null}
      </div>
      {isDemonstration ? null : <OpeningStatusLine branch={branch} now={now} className="mt-1" />}
      <BranchAddress branch={branch} demonstration={isDemonstration} className="mt-4" />
      {isDemonstration ? null : (
        <div className="mt-4">
          <ContactActions dealer={dealer} branch={branch} compact />
        </div>
      )}
      <TradingHours branch={branch} now={now} className="mt-4 border-t border-line pt-3" />
    </article>
  );
}
