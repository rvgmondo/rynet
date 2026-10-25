import config from "@payload-config";
import { ArrowRight, BadgeCheck, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { getPayload } from "payload";

import { DealerMonogram, logoOf } from "@/components/dealers/dealer-monogram";
import { populated, relId, relName } from "@/lib/relations";
import { vehiclePhoto } from "@/lib/vehicle-photo";
import type { Media, Vehicle } from "@/payload-types";

type Shot = { url: string; width: number; height: number };

export type HomeDealer = {
  slug: string;
  name: string;
  town: string | null;
  cars: number;
  logo: string | null;
  shots: Shot[];
};

/**
 * The verified dealerships with live stock, biggest first, each with its logo when it has uploaded
 * one, its primary branch's town, its car count and three photographs from its newest stock.
 *
 * Demonstration dealerships never appear here: this strip is the proof that real businesses sell
 * on Rynet, and a made-up one in it would be a claim. Any failure returns nothing, and the section
 * hides itself: the home page never fails over a strip.
 */
export async function getHomeDealers(): Promise<HomeDealer[]> {
  try {
    const payload = await getPayload({ config });
    const [dealers, stock] = await Promise.all([
      payload.find({
        collection: "dealers",
        where: {
          and: [
            { verificationStatus: { equals: "verified" } },
            { isDemonstration: { not_equals: true } },
          ],
        },
        limit: 24,
        depth: 1,
      }),
      payload.find({
        collection: "vehicles",
        where: { status: { equals: "live" } },
        pagination: false,
        depth: 0,
        select: { dealer: true },
      }),
    ]);

    const counts = new Map<number, number>();
    for (const car of stock.docs) {
      const id = relId(car.dealer);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const live = dealers.docs
      .filter((dealer) => (counts.get(dealer.id) ?? 0) > 0)
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
      .slice(0, 7);

    return await Promise.all(
      live.map(async (dealer) => {
        const [branch, recent] = await Promise.all([
          payload.find({
            collection: "branches",
            where: { dealer: { equals: dealer.id } },
            sort: "-isPrimary",
            limit: 1,
            depth: 1,
          }),
          payload.find({
            collection: "vehicles",
            where: { and: [{ dealer: { equals: dealer.id } }, { status: { equals: "live" } }] },
            sort: "-publishedAt",
            limit: 10,
            depth: 1,
            select: { gallery: true, make: true, model: true },
          }),
        ]);

        const seen = new Set<string>();
        const shots: Shot[] = [];
        for (const doc of recent.docs as unknown as Vehicle[]) {
          const photo = vehiclePhoto(doc, "card");
          if (!photo || seen.has(photo.url)) continue;
          seen.add(photo.url);
          shots.push({ url: photo.url, width: photo.width, height: photo.height });
          if (shots.length === 3) break;
        }

        const logoMedia = populated(dealer.logo as number | Media | null);
        const primary = branch.docs[0];
        return {
          slug: dealer.slug,
          name: dealer.tradingName,
          town: primary ? relName(primary.city) : null,
          cars: counts.get(dealer.id) ?? 0,
          logo: logoOf(logoMedia),
          shots,
        };
      }),
    );
  } catch {
    return [];
  }
}

const cars = (n: number) => `${n.toLocaleString("en-ZA")} ${n === 1 ? "car" : "cars"}`;

/**
 * Who sells on Rynet, as cards a buyer can open: the dealership's name and logo, where it is, how
 * many cars it has, and a strip of three of them. The last card is the door for a dealership
 * reading the page, so the row says "this is growing" without claiming a number.
 */
export function DealerStrip({ dealers }: { dealers: HomeDealer[] }) {
  if (dealers.length === 0) return null;

  return (
    <section
      aria-labelledby="dealers-heading"
      className="rn-defer container-page pt-[var(--section-base)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rn-eyebrow">Who sells here</p>
          <h2 id="dealers-heading" className="rn-h2 mt-2">
            Dealerships on Rynet
          </h2>
          <p className="mt-2 max-w-[44rem] text-body">
            Every one is a registered business we have checked. Open one to see all its cars, its
            address and its trading hours.
          </p>
        </div>
        <Link href="/dealers" className="rn-link-arrow min-h-11">
          Find a dealership
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.map((dealer) => (
          <li key={dealer.slug}>
            <Link
              href={`/dealers/${dealer.slug}`}
              className="rn-card rn-card--interactive group flex h-full flex-col overflow-hidden no-underline"
            >
              {dealer.shots.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 bg-subtle">
                  {[0, 1, 2].map((i) => {
                    const shot = dealer.shots[i];
                    return shot ? (
                      // biome-ignore lint/performance/noImgElement: same-origin renditions already sized on upload, as on the dealer directory.
                      <img
                        key={shot.url}
                        src={shot.url}
                        width={shot.width}
                        height={shot.height}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <span key={i} className="aspect-[4/3] bg-subtle" />
                    );
                  })}
                </div>
              ) : null}
              <div className="flex flex-1 items-center gap-4 p-5">
                <DealerMonogram name={dealer.name} logo={dealer.logo} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <BadgeCheck aria-hidden="true" className="size-4" />
                    Verified dealership
                  </p>
                  <h3 className="rn-h3 mt-0.5 line-clamp-2 text-lg leading-snug group-hover:text-accent">
                    {dealer.name}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                    {dealer.town ? (
                      <>
                        <MapPin aria-hidden="true" className="size-3.5" />
                        {dealer.town},{" "}
                      </>
                    ) : null}
                    <span className="tabular">{cars(dealer.cars)}</span>
                  </p>
                </div>
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-accent" />
              </div>
            </Link>
          </li>
        ))}

        <li>
          <Link
            href="/list-your-stock"
            className="group flex h-full min-h-48 flex-col justify-between rounded-lg border-2 border-dashed border-line p-6 no-underline hover:border-accent"
          >
            <span className="grid size-12 place-items-center rounded-full bg-subtle text-heading group-hover:bg-accent group-hover:text-white">
              <Plus aria-hidden="true" className="size-6" />
            </span>
            <span>
              <span className="rn-h3 block text-lg group-hover:text-accent">
                Your dealership here
              </span>
              <span className="mt-1 block text-sm text-body">
                Free while we launch. Send your website or stock sheet and we load every car.
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
