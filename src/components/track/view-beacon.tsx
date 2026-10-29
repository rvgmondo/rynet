"use client";

import * as React from "react";

import { sendTrack } from "@/lib/track/beacon";

/**
 * Counts one view of a car for its dealership's monthly report. Renders nothing. Demonstration
 * cars belong to no business, so they are never counted.
 */
export function ViewBeacon({
  vehicleRef,
  isDemonstration = false,
}: {
  vehicleRef: string;
  isDemonstration?: boolean;
}) {
  React.useEffect(() => {
    if (!isDemonstration) sendTrack("/api/track/view", vehicleRef);
  }, [vehicleRef, isDemonstration]);
  return null;
}
