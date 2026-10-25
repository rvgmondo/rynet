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
export const contentType = "image/jpeg";
export const alt = "A car for sale on Rynet";

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "https://rynet.co.za";
const BAND = 150;

/**
 * The share card for one car: its own first photograph, with the car, the price and the
 * dealership on a navy band underneath.
 *
 * A car is shared into WhatsApp more than anything else on the site, and every car was sharing
 * the brand card, so a buyer sending one to a partner sent a picture of a logo.
 *
 * Built in two layers and sent as a JPEG of about 100 KB. The card renderer draws the band (it
 * cannot read the WebP photographs, and a PNG of a photograph is close to a megabyte, past what
 * WhatsApp will preview), and sharp lays the band under the photograph, which is fitted to the
 * space above it so the whole car shows.
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
    const picture = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(size.width, size.height - BAND, { fit: "cover", position: "centre" })
      .toBuffer();

    const name = [vehicle.modelYear, relName(vehicle.make), relName(vehicle.model)]
      .filter(Boolean)
      .join(" ");
    const price = vehicle.priceType === "poa" ? "Price on application" : formatRand(vehicle.price);
    const dealer = populated(vehicle.dealer)?.tradingName ?? null;
    const sold = vehicle.status === "sold";

    const band = new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 40px",
          background: "#001123",
          color: "#F3F6FA",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div style={{ display: "flex", fontSize: 42, letterSpacing: -1 }}>{name}</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "#AEB9C9" }}>
            {[formatKm(vehicle.mileageKm), dealer].filter(Boolean).join(", ")}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 46, color: "#FFFFFF" }}>
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
      </div>,
      { width: size.width, height: BAND },
    );

    const card = await sharp({
      create: { width: size.width, height: size.height, channels: 3, background: "#001123" },
    })
      .composite([
        { input: picture, top: 0, left: 0 },
        { input: Buffer.from(await band.arrayBuffer()), top: size.height - BAND, left: 0 },
      ])
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(card), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return BrandCard();
  }
}
