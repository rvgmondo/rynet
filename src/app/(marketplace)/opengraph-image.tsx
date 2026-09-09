import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rynet Showroom. Verified dealerships only, no private sellers.";

/**
 * The share card, generated rather than shipped.
 *
 * Every route on the marketplace was sharing with no image at all, so a link posted into
 * WhatsApp, which is how most of this market shares anything, rendered as a bare line of
 * text. `twitter:card` was defaulting to the imageless "summary" for the same reason.
 *
 * It is drawn rather than photographed, and that is not a compromise: there is no vehicle
 * photography, and a stock photo of a car that is not on the platform would be the same lie
 * the colour plate exists to avoid. So the card is the design system at poster scale, which
 * is what the site looks like anyway.
 *
 * Fixed hex rather than tokens on purpose. This renders outside the document, so there is no
 * stylesheet and no theme to read from, and a var() here would silently resolve to nothing.
 * These are the values from tokens.css and they change with it by hand.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#EDEDEA",
        padding: 72,
      }}
    >
      {/* The masthead rule: the tachometer sweep unrolled, silver into brand red. */}
      <div
        style={{
          display: "flex",
          height: 6,
          width: "100%",
          background: "linear-gradient(90deg, #B1B4BB 0%, #C2C4CA 44%, #E9505B 78%, #E32432 100%)",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            color: "#545E6A",
            textTransform: "uppercase",
          }}
        >
          Rynet Showroom
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 28,
            fontSize: 128,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: -4,
            color: "#0A1017",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>No private</div>
          <div style={{ display: "flex" }}>sellers. Not one.</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 24,
          color: "#232A33",
        }}
      >
        <div style={{ display: "flex" }}>
          Every car is listed by a registered South African dealership.
        </div>
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: "#545E6A" }}>
          RYNET.CO.ZA
        </div>
      </div>
    </div>,
    size,
  );
}
