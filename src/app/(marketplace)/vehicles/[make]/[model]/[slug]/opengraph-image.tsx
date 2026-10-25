import config from "@payload-config";
import { ImageResponse } from "next/og";
import { getPayload } from "payload";
import sharp from "sharp";

import BrandCard from "@/app/(marketplace)/opengraph-image";
import { MARK_PATHS, WORDMARK_PATH } from "@/components/brand/rynet-mark";
import { carVisibility } from "@/lib/admin-car-state";
import { formatKm, formatRand } from "@/lib/format";
import { populated, relName } from "@/lib/relations";
import { vehiclePhoto } from "@/lib/vehicle-photo";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A car for sale on Rynet";

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za";

/**
 * The share card for one car: its own first photograph, with the car, the price and the
 * dealership on a navy band.
 *
 * A car is shared into WhatsApp more than anything else on the site, and every car was sharing
 * the brand card, so a buyer sending one to a partner sent a picture of a logo. The dealership's
 * photographs are stored as WebP, which the card renderer cannot draw, so the photograph is
 * re-encoded as JPEG in memory first.
 *
 * Anything missing (no photograph, a demonstration listing, a car no longer on the site, a fetch
 * that fails) falls back to the brand card rather than to an error: a share card is never a reason
 * for a link to preview badly.
 */
export default async function VehicleShareCard({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ref = slug.match(/(rn[0-9a-hjkmnp-tv-z]{6})$/i)?.[1]?.toUpperCase();
    if (!ref) return BrandCard();

    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "vehicles",
      where: { publicRef: { equals: ref } },
      limit: 1,
      depth: 2,
    });
    const vehicle = docs[0];
    if (!vehicle || vehicle.isDemonstration) return BrandCard();
    if (!carVisibility(vehicle.status, vehicle.soldAt).onSite) return BrandCard();

    const photo = vehiclePhoto(vehicle, "gallery");
    if (!photo) return BrandCard();
    const response = await fetch(new URL(photo.url, SITE), { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return BrandCard();
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(1200, 630, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();

    const name = [vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
      .filter(Boolean)
      .join(" ");
    const price = vehicle.priceType === "poa" ? "Price on application" : formatRand(vehicle.price);
    const dealer = populated(vehicle.dealer)?.tradingName ?? null;
    const sold = vehicle.status === "sold";

    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${jpeg.toString("base64")}`}
          width={1200}
          height={630}
          alt=""
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "28px 40px 30px",
            background: "#001123",
            color: "#F3F6FA",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
              {name}
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "#AEB9C9" }}>
              {[formatKm(vehicle.mileageKm), dealer].filter(Boolean).join(", ")}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#FFFFFF" }}>
              {sold ? "Sold" : price}
            </div>
            <svg
              width="150"
              height="27"
              viewBox="-30.6 -3.5 128.2 22.8"
              style={{ marginTop: 8 }}
              aria-hidden="true"
            >
              <g transform="translate(-30.5 -3.4) scale(0.2898)">
                <path fill="#B1B4BB" d={MARK_PATHS.gauge} />
                <path fill="#F3F6FA" d={MARK_PATHS.ink} />
                <path fill="#E32432" d={`${MARK_PATHS.redDash}${MARK_PATHS.needle}`} />
              </g>
              <rect x="-2.8" y="0" width="0.8" height="18.4" fill="#E32432" />
              <path fillRule="evenodd" fill="#F3F6FA" d={WORDMARK_PATH} />
            </svg>
          </div>
        </div>
      </div>,
      size,
    );
  } catch {
    return BrandCard();
  }
}
