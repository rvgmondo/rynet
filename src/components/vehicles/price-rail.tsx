import { MessageCircle, ShieldCheck, TrendingDown } from "lucide-react";

import { EnquiryDialog } from "@/components/vehicles/enquiry-dialog";
import { PhoneReveal } from "@/components/vehicles/phone-reveal";
import { formatRand, priceDrop } from "@/lib/format";
import { populated, relName } from "@/lib/relations";
import type { Vehicle } from "@/payload-types";

/**
 * The price and actions.
 *
 * Sticky on desktop, and it needs care: WCAG 2.2 SC 2.4.11 says a focused element must not
 * end up hidden behind sticky chrome. This sits in a `lg:sticky` column rather than being
 * fixed over the content, so nothing it could obscure is ever focusable behind it.
 *
 * The mobile treatment is a bar pinned to the bottom, rendered separately below, because a
 * buyer on a phone should never have to scroll back up to enquire.
 *
 * Price on application is a real state, not a missing price. Showing "R 0" or an empty
 * space where a number belongs reads as broken, and dealerships use POA deliberately.
 */
export function PriceRail({ vehicle, sold }: { vehicle: Vehicle; sold: boolean }) {
  const poa = vehicle.priceType === "poa";
  const drop = priceDrop(vehicle.price, vehicle.previousPrice);
  const dealer = populated(vehicle.dealer);
  const branch = populated(vehicle.branch);
  const verified = dealer?.verificationStatus === "verified";

  const priceLabel =
    vehicle.priceType === "on_the_road"
      ? "On the road"
      : vehicle.priceType === "poa"
        ? null
        : "Retail";

  return (
    <div className="rounded-lg border border-line bg-surface-raised p-5">
      {drop && !sold ? (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-2xs font-semibold text-success">
          <TrendingDown aria-hidden="true" className="size-3" />
          {drop}
        </p>
      ) : null}

      {poa ? (
        <>
          <p className="font-display text-2xl font-extrabold">Price on application</p>
          <p className="mt-1 text-sm text-ink-secondary">
            This dealership prices this one on enquiry. Ask and they will come back to you.
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-3xl font-extrabold tabular">
            {formatRand(vehicle.price)}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-ink-muted">
            {priceLabel ? <span>{priceLabel}</span> : null}
            {vehicle.vatStatus === "vat_inclusive" ? <span>VAT included</span> : null}
            {vehicle.vatStatus === "vat_exclusive" ? <span>Excluding VAT</span> : null}
            {vehicle.previousPrice ? (
              <span className="line-through tabular">{formatRand(vehicle.previousPrice)}</span>
            ) : null}
          </p>
        </>
      )}

      {verified ? (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-accent-subtle p-3 text-xs text-ink-secondary">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            Sold by a dealership we have verified.{" "}
            <a href="/how-verification-works" className="font-semibold text-accent hover:underline">
              What that means
            </a>
          </span>
        </p>
      ) : null}

      {sold ? (
        <p className="mt-5 rounded-md border border-line-interactive p-3 text-center text-sm text-ink-secondary">
          No longer available
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          <EnquiryDialog
            vehicleRef={vehicle.publicRef ?? ""}
            vehicleTitle={[vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
              .filter(Boolean)
              .join(" ")}
            dealerName={dealer?.tradingName ?? "the dealership"}
          />

          <PhoneReveal
            vehicleRef={vehicle.publicRef ?? ""}
            phone={branch?.phone ?? dealer?.principal?.phone ?? null}
          />

          {dealer?.whatsappNumber ? (
            <a
              href={`https://wa.me/${dealer.whatsappNumber.replace(/[^0-9]/g, "").replace(/^0/, "27")}?text=${encodeURIComponent(
                `Hi, I am interested in the ${vehicle.modelYear} ${relName(vehicle.make) ?? ""} ${relName(vehicle.model) ?? ""} (ref ${vehicle.publicRef}) on Rynet.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-interactive px-4 text-sm font-semibold hover:bg-surface-sunken"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              WhatsApp the dealership
              <span className="sr-only">, opens in a new tab</span>
            </a>
          ) : null}
        </div>
      )}

      <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Reference</dt>
          <dd className="tabular font-medium">{vehicle.publicRef}</dd>
        </div>
        {vehicle.stockNumber ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Dealer stock number</dt>
            <dd className="tabular">{vehicle.stockNumber}</dd>
          </div>
        ) : null}
      </dl>

      {vehicle.isDemonstration ? (
        <p className="mt-4 rounded-md border border-line-interactive p-2.5 text-2xs text-ink-muted">
          <strong className="font-semibold">Demonstration listing.</strong> This is seeded example
          stock. The dealership is not a real business and the vehicle is not for sale.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The mobile action bar.
 *
 * Fixed to the bottom of the viewport, which is the one place a sticky element genuinely
 * earns its keep on a phone. `pb-[env(safe-area-inset-bottom)]` keeps it clear of the home
 * indicator on an iPhone, where otherwise the buttons sit under it and cannot be pressed.
 */
export function MobileActionBar({ vehicle, sold }: { vehicle: Vehicle; sold: boolean }) {
  if (sold) return null;
  const dealer = populated(vehicle.dealer);
  const branch = populated(vehicle.branch);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-extrabold tabular">
            {vehicle.priceType === "poa" ? "POA" : formatRand(vehicle.price)}
          </p>
        </div>
        <PhoneReveal
          compact
          vehicleRef={vehicle.publicRef ?? ""}
          phone={branch?.phone ?? dealer?.principal?.phone ?? null}
        />
        <EnquiryDialog
          compact
          vehicleRef={vehicle.publicRef ?? ""}
          vehicleTitle={[vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
            .filter(Boolean)
            .join(" ")}
          dealerName={dealer?.tradingName ?? "the dealership"}
        />
      </div>
    </div>
  );
}
