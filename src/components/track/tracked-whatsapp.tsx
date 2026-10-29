"use client";

import type * as React from "react";

import { sendTrack } from "@/lib/track/beacon";

/** A WhatsApp link that counts the tap for the dealership's monthly report on its way out. */
export function TrackedWhatsApp({
  vehicleRef,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { vehicleRef: string; href: string }) {
  // A real link with an href: Enter on the keyboard follows it and fires the same click.
  return <a href={href} {...props} onClick={() => sendTrack("/api/track/whatsapp", vehicleRef)} />;
}
