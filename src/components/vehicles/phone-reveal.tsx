"use client";

import { Phone } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";

/**
 * The dealership's phone number, in two shapes.
 *
 * In the summary card it is held behind one press, for one honest reason: a revealed number is a
 * measurable lead, and a dealership is entitled to know how many people tried to phone. It is not
 * obfuscation. The number is one press away with no form in between, and once shown it is a
 * `tel:` link that is also selectable, so it can be copied on a desktop. Focus moves onto the
 * number, which is what announces it: a screen reader user presses the button and hears the number
 * rather than nothing. (An `aria-live` on the new link could not do that, because a live region
 * only speaks for changes inside a region that already existed.)
 *
 * In the phone action bar (`compact`) it is a plain `tel:` link that opens the dialler straight
 * away, because a reveal-in-place has no room in a slim bar and a buyer who presses Call wants to
 * call. The lead is recorded with a beacon on the way out, which survives the page handing over to
 * the dialler. With scripting off it is still a working `tel:` link; only the count is lost. Below
 * 375px the word "Call" is kept for screen readers only and the icon carries the button, so the bar
 * still fits a long price at 320px.
 *
 * Counting is fire and forget in both shapes. A failed count must never stand between a buyer and
 * a phone number.
 */
function recordReveal(vehicleRef: string) {
  const body = JSON.stringify({ vehicleRef });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/track/phone-reveal", blob)) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch("/api/track/phone-reveal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function PhoneReveal({
  phone,
  vehicleRef,
  compact = false,
  className = "",
}: {
  phone: string | null;
  vehicleRef: string;
  compact?: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = React.useState(false);
  const revealedLink = React.useRef<HTMLAnchorElement>(null);

  // The button a keyboard user pressed no longer exists once the number shows, so focus moves to
  // the number that replaced it rather than falling back to the top of the page.
  React.useEffect(() => {
    if (revealed) revealedLink.current?.focus();
  }, [revealed]);

  if (!phone) return null;

  const dial = phone.replace(/[^0-9+]/g, "");

  if (compact) {
    return (
      <a
        href={`tel:${dial}`}
        onClick={() => recordReveal(vehicleRef)}
        className={buttonClasses({
          variant: "outline",
          size: "sm",
          className: `max-[23.4375rem]:w-11 max-[23.4375rem]:px-0 ${className}`,
        })}
      >
        <Phone aria-hidden="true" />
        <span className="max-[23.4375rem]:sr-only">Call</span>
        <span className="sr-only"> the dealership on {phone}</span>
      </a>
    );
  }

  if (revealed) {
    return (
      <a
        ref={revealedLink}
        href={`tel:${dial}`}
        className={buttonClasses({ variant: "outline", className: `px-3 ${className}` })}
      >
        <Phone aria-hidden="true" />
        <span className="tabular">{phone}</span>
      </a>
    );
  }

  return (
    <Button
      variant="outline"
      className={`px-3 ${className}`}
      onClick={() => {
        setRevealed(true);
        recordReveal(vehicleRef);
      }}
    >
      <Phone aria-hidden="true" />
      Show number
    </Button>
  );
}
