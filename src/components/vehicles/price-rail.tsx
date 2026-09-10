import { MessageCircle, TrendingDown } from "lucide-react";

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
    <div className="border-t-2 border-ink bg-surface-sunken p-5">
      {drop && !sold ? (
        <p className="rn-label mb-3 inline-flex items-center gap-1.5 border border-current px-2 py-1 text-success">
          <TrendingDown aria-hidden="true" className="size-3" />
          {drop}
        </p>
      ) : null}

      {poa ? (
        <>
          <p className="rn-figure">Price on application</p>
          <p className="mt-1 text-sm text-ink-secondary">
            This dealership prices this one on enquiry. Ask and they will come back to you.
          </p>
        </>
      ) : (
        <>
          <p className="rn-figure">{formatRand(vehicle.price)}</p>
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
        <p className="mt-4 border-y border-line py-3 text-xs text-ink-secondary">
          {/* No shield glyph. The one red object in this viewport is the enquiry button,
              which is the action; a red icon three lines above it competes with that. */}
          Sold by a dealership we have verified.{" "}
          <a href="/how-verification-works" className="font-semibold underline">
            What that means
          </a>
        </p>
      ) : null}

      {sold ? (
        <p className="mt-5 border border-line-interactive p-3 text-center text-sm text-ink-secondary">
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
              className="rn-label inline-flex min-h-11 items-center justify-center gap-2 border border-line-interactive px-4 hover:bg-ink hover:text-ink-inverse"
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
        <p className="mt-4 border border-line-interactive p-2.5 text-2xs text-ink-muted">
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
    // Solid, never a backdrop blur: the page scrolls under this bar by definition, and a
    // blur there is a full-viewport readback on every frame on a mid-range Android.
    <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t-2 border-ink bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      {/*
        The price on its own line, and the two buttons under it.

        All three were on one row, and the price was the only flexible item on it, with
        `flex-1` and `truncate`. So at 320, 360 and 390 wide it rendered as "R 5..." while
        the two buttons kept their full labels. A price truncated to its first digit is worse
        than no price: it is the number the whole bar exists to show, and R 584 000 and
        R 5 840 000 truncate identically.

        Making the price rigid instead only moves the problem, because the arithmetic does
        not close at 320: a full rand figure and two labelled buttons do not fit across a
        screen that narrow, at any distribution of the slack. The choice is therefore between
        cutting the buttons down to bare icons and giving the price its own line, and the
        line wins twice over. Nothing is abbreviated, and the buttons go full width, which
        makes both of them a thumb-sized target instead of two small ones sharing an edge.

        Roughly 28px more bar. Paid for in globals.css, where scroll-padding-bottom already
        keeps anchored content clear of this thing.
      */}
      <p className="font-display text-lg font-extrabold tabular [font-variation-settings:'wdth'_112]">
        {vehicle.priceType === "poa" ? "POA" : formatRand(vehicle.price)}
      </p>

      <div className="mt-2 flex gap-2 [&>*]:flex-1">
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
