"use client";

import { useListRelationships } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { useEffect, useRef } from "react";

import { leadAbout } from "@/lib/admin-list";

/**
 * What an enquiry is about, in the Enquiries list: the car it came from, the car a seller wants
 * to sell, or Rynet Digital.
 *
 * The car's name is read through the list's own relationship loader, which fetches every car on
 * the page in one request as the signed-in person, so access rules apply and nothing is fetched
 * twice when the Car column is also showing.
 */

function vehicleIdOf(value: unknown): number | string | null {
  if (typeof value === "number" || (typeof value === "string" && value.length > 0)) return value;
  if (value && typeof value === "object" && "id" in value) {
    return vehicleIdOf((value as { id?: unknown }).id);
  }
  return null;
}

export function LeadAboutCell({ rowData }: DefaultCellComponentProps) {
  const { documents, getRelationships } = useListRelationships();
  const vehicleId = vehicleIdOf(rowData?.vehicle);
  const needsCar = rowData?.type !== "agency_enquiry" && rowData?.type !== "trade_in";
  const requested = useRef<number | string | null>(null);

  useEffect(() => {
    if (!needsCar || vehicleId === null || requested.current === vehicleId) return;
    requested.current = vehicleId;
    getRelationships([{ relationTo: "vehicles", value: vehicleId }]);
  }, [getRelationships, needsCar, vehicleId]);

  const loaded = vehicleId === null ? undefined : documents?.vehicles?.[vehicleId];
  const title = loaded && typeof loaded === "object" ? (loaded as { title?: unknown }).title : null;
  const carTitle = typeof title === "string" && title.length > 0 ? title : null;

  const text = leadAbout({
    type: rowData?.type,
    vehicle: vehicleId,
    tradeIn: rowData?.tradeIn,
    carTitle,
  });

  if (text) return <span className="rn-admin-cell">{text}</span>;
  if (needsCar && vehicleId !== null && loaded === null) {
    return <span className="rn-admin-cell rn-admin-cell--empty">Loading the car</span>;
  }
  return <span className="rn-admin-cell rn-admin-cell--empty">No car</span>;
}
