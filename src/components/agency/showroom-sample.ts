import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import type { VehicleCardData } from "@/components/vehicles/vehicle-card";
import { toCard } from "@/lib/search";

/**
 * A few real Rynet marketplace listings for the agency home page's browser frame.
 *
 * Real rows through the marketplace's own `toCard`, so the frame shows exactly what a buyer
 * sees, demonstration badges included, and never a mocked-up screenshot. Live listings only,
 * newest first, with a photograph, one per dealership so the frame does not show two cars from
 * the same yard.
 *
 * Cached on the data (five minutes, and the `vehicles` tag clears it), not on the route: a
 * route with `revalidate` is prerendered during `next build`, where there is no database.
 * A failure returns no cards and the page renders without the frame rather than failing.
 */
async function readSample(limit: number): Promise<VehicleCardData[]> {
  const payload = await getPayload({ config });
  const recent = await payload.find({
    collection: "vehicles",
    where: { status: { equals: "live" } },
    sort: "-publishedAt",
    limit: 36,
    depth: 2,
  });

  const seen = new Set<string>();
  const chosen: VehicleCardData[] = [];
  for (const card of recent.docs.map(toCard)) {
    if (!card.photo || seen.has(card.dealerSlug)) continue;
    seen.add(card.dealerSlug);
    chosen.push(card);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

export async function getShowroomSample(limit = 2): Promise<VehicleCardData[]> {
  try {
    return await unstable_cache(
      () => readSample(limit),
      ["agency-showroom-sample", String(limit)],
      {
        revalidate: 300,
        tags: ["vehicles"],
      },
    )();
  } catch (error) {
    console.error("Agency home: could not read the marketplace sample.", error);
    return [];
  }
}
