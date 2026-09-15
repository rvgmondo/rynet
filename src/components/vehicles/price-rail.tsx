import { ArrowRight, MessageCircle, PhoneOff } from "lucide-react";
import Link from "next/link";

import { DealerBlock } from "@/components/listing/dealer-block";
import type { FinanceAssumptions } from "@/components/listing/finance-estimate";
import { ShareButton } from "@/components/listing/share-button";
import { StickyActionBar } from "@/components/listing/sticky-action-bar";
import { Badge, DemoListingBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { Notice } from "@/components/ui/notice";
import { PriceTag } from "@/components/ui/price-tag";
import { EnquiryDialog } from "@/components/vehicles/enquiry-dialog";
import { FinanceTeaser } from "@/components/vehicles/finance-panel";
import { PhoneReveal } from "@/components/vehicles/phone-reveal";
import { formatRand } from "@/lib/format";
import { populated, relName, relSlug } from "@/lib/relations";
import { vehicleUrl } from "@/lib/urls";
import type { Vehicle } from "@/payload-types";

/** The id the phone action bar watches: while these buttons are on screen, the bar stays away. */
export const LISTING_ACTIONS_ID = "listing-actions";

function shortTitle(vehicle: Vehicle): string {
  return [vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
    .filter(Boolean)
    .join(" ");
}

/** The wa.me address for a South African number written the way people write it. */
function whatsappHref(number: string, vehicle: Vehicle): string {
  const digits = number.replace(/[^0-9]/g, "").replace(/^0/, "27");
  const message = `Hi, I am interested in the ${shortTitle(vehicle)} (ref ${vehicle.publicRef}) on Rynet.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function priceQualifier(vehicle: Vehicle): string | null {
  const kind =
    vehicle.priceType === "on_the_road"
      ? "On-the-road price"
      : vehicle.priceType === "retail"
        ? "Retail price"
        : null;
  const vat =
    vehicle.vatStatus === "vat_inclusive"
      ? "VAT included"
      : vehicle.vatStatus === "vat_exclusive"
        ? "excluding VAT"
        : null;
  if (kind && vat) return `${kind}, ${vat}`;
  if (vat) return vat.charAt(0).toUpperCase() + vat.slice(1);
  return kind;
}

/**
 * The summary card: everything a buyer needs to decide whether to get in touch.
 *
 * In reading order: the title, the price (with the Demo listing badge beside it), the contact
 * actions, the one-line finance estimate, the demonstration notice and the selling dealership. On
 * a phone it follows the photograph directly, so Enquire is on the first screen rather than below
 * a finance box and a notice. From 1024px it sits beside the gallery and sticks (the page supplies
 * the panel and the sticky wrapper, so the card's shadow is never clipped by the scroll that keeps
 * it on screen). On a tablet, where the card runs the full width of the page, a container query
 * sets it in two columns, the facts on the left and the actions and the dealership on the right,
 * so no button stretches to 700px.
 *
 * THE TITLE is one h1 in two parts: year, make and model at heading size, and the variant on its
 * own line in muted body type.
 *
 * HONESTY. A demonstration listing says so before the first button: the Demo listing badge sits
 * beside the price, and the enquiry dialog repeats that the car is not for sale. The card still
 * carries the page's one calm Notice. A demonstration dealership has no phone and no WhatsApp:
 * its numbers belong to no business, so there is no Show number, no WhatsApp link and no `tel:`
 * anywhere on the page (e2e/enquiry.spec.ts asserts it), only a line saying those switch on for
 * real dealerships, which is what the dealership's own page says too. The notice title is the
 * exact phrase `e2e/enquiry.spec.ts` looks for to decide whether a listing is a demonstration.
 *
 * RED is spent once: the Enquire button. Phone and WhatsApp, for a real dealership, are equal
 * outline buttons side by side (they stack when the card is too narrow for both).
 *
 * Price on application is a real state, not a missing price, and a sold car keeps its page with
 * the actions replaced by a plain statement and a way on to similar stock.
 */
export function ListingSummary({
  vehicle,
  sold,
  assumptions,
}: {
  vehicle: Vehicle;
  sold: boolean;
  assumptions: FinanceAssumptions;
}) {
  const poa = vehicle.priceType === "poa";
  const dealer = populated(vehicle.dealer);
  const branch = populated(vehicle.branch);
  // The same test the structured data uses: a listing or its dealership being example data.
  const demonstration = Boolean(vehicle.isDemonstration || dealer?.isDemonstration);
  // A demonstration dealership's numbers ring no business, so they are never offered.
  const phone = demonstration ? null : (branch?.phone ?? dealer?.principal?.phone ?? null);
  const whatsapp = demonstration ? null : dealer?.whatsappNumber?.trim() || null;
  const variant = relName(vehicle.variant);
  const title = shortTitle(vehicle);
  const qualifier = priceQualifier(vehicle);
  const dropAmount =
    !poa && typeof vehicle.previousPrice === "number" && vehicle.previousPrice > vehicle.price
      ? vehicle.previousPrice - vehicle.price
      : null;
  const path = vehicleUrl({
    makeSlug: relSlug(vehicle.make),
    modelSlug: relSlug(vehicle.model),
    modelYear: vehicle.modelYear,
    variantName: variant,
    publicRef: vehicle.publicRef ?? "",
  });

  // Two columns on a wide card: the facts, the estimate and the notice on the left, the actions
  // and the dealership on the right. One column, in DOM order, everywhere else.
  const left = "@min-[42rem]:col-start-1";
  const right = "@min-[42rem]:col-start-2";

  return (
    <div className="grid content-start gap-x-10 p-5 sm:p-6 @min-[42rem]:grid-cols-2">
      <div className={`min-w-0 ${left} @min-[42rem]:row-start-1`}>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-[1.75rem] leading-[1.15] font-bold tracking-[-0.018em] text-heading lg:text-2xl">
            <span className="block">{title}</span>
            {variant ? (
              <span className="mt-1 block text-base leading-snug font-medium tracking-normal text-muted">
                {variant}
              </span>
            ) : null}
          </h1>
          <ShareButton path={path} title={[title, variant].filter(Boolean).join(" ")} />
        </div>
        {vehicle.derivative ? (
          <p className="mt-1 text-sm text-muted">{vehicle.derivative}</p>
        ) : null}

        <div className="mt-4">
          {poa ? (
            <>
              <p className="text-2xl font-bold text-heading">Price on application</p>
              <p className="mt-1 text-sm text-muted">
                The dealership gives the price when you ask. Enquire and they will come back to you.
              </p>
              {demonstration ? <DemoListingBadge className="mt-2.5" /> : null}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <PriceTag value={vehicle.price} size="xl" />
                {demonstration ? <DemoListingBadge /> : null}
              </div>
              {(dropAmount && !sold) || qualifier ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {dropAmount && !sold ? (
                    <Badge tone="drop">
                      Reduced by {formatRand(dropAmount)}
                      <span className="sr-only">
                        , from {formatRand(vehicle.previousPrice ?? 0)}
                      </span>
                    </Badge>
                  ) : null}
                  {qualifier ? <p className="text-sm text-muted">{qualifier}</p> : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className={`min-w-0 ${right} @min-[42rem]:row-start-1`}>
        {sold ? (
          <div role="status" className="mt-5 rounded-md bg-subtle p-4 @min-[42rem]:mt-0">
            <p className="text-base font-semibold text-heading">This car has been sold</p>
            <p className="mt-1 text-sm text-body">
              The listing stays up for reference, and there are similar cars further down this page.
            </p>
            <Link
              href={`/cars/${relSlug(vehicle.make)}/${relSlug(vehicle.model)}`}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-heading underline underline-offset-3 hover:text-accent"
            >
              All {relName(vehicle.model)} listings
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        ) : (
          <div id={LISTING_ACTIONS_ID} className="mt-5 grid gap-2 @min-[42rem]:mt-0">
            <EnquiryDialog
              vehicleRef={vehicle.publicRef ?? ""}
              vehicleTitle={title}
              dealerName={dealer?.tradingName ?? "the dealership"}
              isDemonstration={demonstration}
            />

            {phone || whatsapp ? (
              <div className={`grid gap-2 ${phone && whatsapp ? "@min-[19rem]:grid-cols-2" : ""}`}>
                <PhoneReveal
                  vehicleRef={vehicle.publicRef ?? ""}
                  phone={phone}
                  isDemonstration={demonstration}
                  className="w-full"
                />
                {whatsapp ? (
                  <a
                    href={whatsappHref(whatsapp, vehicle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ variant: "outline", className: "w-full px-3" })}
                  >
                    <MessageCircle aria-hidden="true" />
                    WhatsApp
                    <span className="sr-only">, opens in a new tab</span>
                  </a>
                ) : null}
              </div>
            ) : null}

            {demonstration ? (
              <p className="mt-1 flex items-start gap-2 text-sm text-muted">
                <PhoneOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Calling and WhatsApp switch on for real dealerships.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className={`min-w-0 ${left} @min-[42rem]:row-start-2`}>
        {!poa && !sold ? (
          <FinanceTeaser price={vehicle.price} assumptions={assumptions} className="mt-5" />
        ) : null}

        {demonstration ? (
          <Notice title="Demonstration listing" className="mt-4">
            This car and its dealership are examples that show how Rynet works. The car is not for
            sale.
          </Notice>
        ) : null}
      </div>

      <div className={`min-w-0 ${right} @min-[42rem]:row-start-2`}>
        <DealerBlock
          dealer={dealer}
          branch={branch}
          demonstration={demonstration}
          className="mt-6"
        />
      </div>
    </div>
  );
}

/**
 * The phone action bar: the price, Call and Enquire, on one slim row pinned to the bottom.
 *
 * Only below 1024px, and only while it is useful. StickyActionBar shows it whenever the summary
 * card's own buttons are off screen, above or below, so a buyer who lands on a long page always
 * has Enquire under a thumb, and hides it while those buttons or the footer are on screen, so the
 * price and Enquire never show twice.
 *
 * One row of 44px targets, about 64px of bar. Call is a direct `tel:` link (see PhoneReveal), and
 * below 375px it drops its word and keeps its icon and full accessible name so a long price still
 * fits at 320px. A demonstration listing has no Call at all (its number rings no business), and
 * says Demo listing under the price, so the bar is honest on its own when the notice is far away.
 *
 * Solid, never a backdrop blur: the page scrolls under this bar by definition, and a blur there
 * is a full-viewport readback on every frame on a mid-range Android.
 */
export function MobileActionBar({ vehicle, sold }: { vehicle: Vehicle; sold: boolean }) {
  if (sold) return null;
  const dealer = populated(vehicle.dealer);
  const branch = populated(vehicle.branch);
  const title = shortTitle(vehicle);
  const demonstration = Boolean(vehicle.isDemonstration || dealer?.isDemonstration);

  return (
    <StickyActionBar watchId={LISTING_ACTIONS_ID}>
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <div className="min-w-0 flex-1">
          {vehicle.priceType === "poa" ? (
            <p className="text-sm leading-tight font-semibold text-heading">Price on application</p>
          ) : (
            <PriceTag value={vehicle.price} size="sm" />
          )}
          <p className="truncate text-xs text-muted">
            {demonstration ? (
              <>
                <span className="font-semibold text-heading">Demo listing</span>, {title}
              </>
            ) : (
              title
            )}
          </p>
        </div>
        {demonstration ? null : (
          <PhoneReveal
            compact
            vehicleRef={vehicle.publicRef ?? ""}
            phone={branch?.phone ?? dealer?.principal?.phone ?? null}
          />
        )}
        <EnquiryDialog
          compact
          vehicleRef={vehicle.publicRef ?? ""}
          vehicleTitle={title}
          dealerName={dealer?.tradingName ?? "the dealership"}
          isDemonstration={demonstration}
        />
      </div>
    </StickyActionBar>
  );
}
