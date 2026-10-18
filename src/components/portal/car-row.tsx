import { ExternalLink, MessageSquare } from "lucide-react";

import { changeCarState } from "@/app/actions/portal";
import { formatRand } from "@/lib/format";
import { CAR_ACTION_LABELS, CAR_STATE_LABELS, carActions } from "@/lib/portal/cars";
import type { PortalCar } from "@/lib/portal/data";

import { PriceEditor } from "./price-editor";

/** One car: its photo, what it is, where it stands, and the moves a showroom makes. */
export function CarRow({ car, compact = false }: { car: PortalCar; compact?: boolean }) {
  const actions = carActions(car.status);
  return (
    <li className="rn-portal-car">
      {car.photo ? (
        // A thumbnail from Rynet's own media, already the right size.
        // biome-ignore lint/performance/noImgElement: a 112px thumbnail in a signed-in tool
        <img className="rn-portal-car__photo" src={car.photo} alt="" loading="lazy" />
      ) : (
        <div className="rn-portal-car__photo" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className="rn-portal-car__title">
          {car.url ? (
            <a href={car.url} target="_blank" rel="noreferrer">
              {car.title} <ExternalLink aria-hidden="true" className="inline size-3.5" />
              <span className="sr-only"> (opens the listing)</span>
            </a>
          ) : (
            car.title
          )}
        </p>
        <div className="rn-portal-car__meta">
          <span className={`rn-portal-state rn-portal-state--${car.status}`}>
            {CAR_STATE_LABELS[car.status] ?? car.status}
          </span>
          {car.price ? <span className="rn-portal-car__price">{formatRand(car.price)}</span> : null}
          <span className="inline-flex items-center gap-1">
            <MessageSquare aria-hidden="true" className="size-3.5" />
            {car.enquiries === 1 ? "1 enquiry" : `${car.enquiries} enquiries`}
          </span>
          {car.fromWebsite ? <span>Kept up to date from your website</span> : null}
        </div>
      </div>
      {!compact && (actions.length > 0 || !car.fromWebsite) ? (
        <div className="rn-portal-car__actions">
          {!car.fromWebsite && car.status !== "sold" ? (
            <PriceEditor id={car.id} price={car.price} label={car.title} />
          ) : null}
          {actions.map((action) => (
            <form key={action} action={changeCarState}>
              <input type="hidden" name="id" value={car.id} />
              <input type="hidden" name="action" value={action} />
              <button
                type="submit"
                className={`rn-btn rn-btn--sm ${action === "sold" ? "rn-btn--primary" : "rn-btn--outline"}`}
              >
                {CAR_ACTION_LABELS[action]}
                <span className="sr-only">: {car.title}</span>
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </li>
  );
}
