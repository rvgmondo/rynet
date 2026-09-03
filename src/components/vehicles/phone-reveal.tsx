"use client";

import { Phone } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

/**
 * Phone number reveal.
 *
 * The number is held back behind a click for one honest reason: a revealed number is a
 * measurable lead, and a dealership paying for placement is entitled to know how many
 * people actually tried to phone them. It is not obfuscation. The number is in the page,
 * one click away, with no form in between.
 *
 * A `tel:` link the moment it is revealed, because on a phone that is the whole point.
 * On desktop it is selectable text, so it can be copied.
 *
 * `aria-live` on the revealed number: without it, a screen reader user presses the button
 * and nothing announces, so the number appears to have done nothing.
 */
export function PhoneReveal({
  phone,
  vehicleRef,
  compact = false,
}: {
  phone: string | null;
  vehicleRef: string;
  compact?: boolean;
}) {
  const [revealed, setRevealed] = React.useState(false);

  if (!phone) return null;

  const dial = phone.replace(/[^0-9+]/g, "");

  if (revealed) {
    return (
      <a
        href={`tel:${dial}`}
        aria-live="polite"
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-interactive px-4 font-semibold hover:bg-surface-sunken ${
          compact ? "text-sm" : "w-full text-sm"
        }`}
      >
        <Phone aria-hidden="true" className="size-4" />
        <span className="tabular">{phone}</span>
      </a>
    );
  }

  return (
    <Button
      variant="secondary"
      size={compact ? "md" : "lg"}
      block={!compact}
      onClick={() => {
        setRevealed(true);
        // Fire and forget. A failed count must never block a buyer from seeing a number,
        // so there is no await and no error surfaced.
        void fetch("/api/track/phone-reveal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vehicleRef }),
        }).catch(() => {});
      }}
    >
      <Phone aria-hidden="true" />
      {compact ? "Call" : "Show phone number"}
    </Button>
  );
}
