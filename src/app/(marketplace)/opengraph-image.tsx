import { ImageResponse } from "next/og";

import { MARK_PATHS, WORDMARK_PATH } from "@/components/brand/rynet-mark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rynet. Every dealership is checked before it can list, and no private sellers.";

/**
 * The share card, generated rather than shipped.
 *
 * Every route on the marketplace was sharing with no image, so a link posted into WhatsApp,
 * which is how most of this market shares anything, rendered as a bare line of text.
 *
 * Drawn rather than photographed: a stock photograph of a car that is not on the platform would be
 * a claim about stock. So it is the brand at poster scale: the navy band, the traced lockup, and a
 * sentence about how the platform works, which is true with or without the demonstration data.
 *
 * Fixed hex rather than tokens on purpose. This renders outside the document, so there is no
 * stylesheet and no theme to read from. These are the values from tokens.css and they change with
 * it by hand.
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
        background: "#001123",
        padding: 72,
      }}
    >
      <svg width="420" height="75" viewBox="-30.6 -3.5 128.2 22.8" aria-hidden="true">
        <g transform="translate(-30.5 -3.4) scale(0.2898)">
          <path fill="#B1B4BB" d={MARK_PATHS.gauge} />
          <path fill="#F3F6FA" d={MARK_PATHS.ink} />
          <path fill="#E32432" d={`${MARK_PATHS.redDash}${MARK_PATHS.needle}`} />
        </g>
        <rect x="-2.8" y="0" width="0.8" height="18.4" fill="#E32432" />
        <path fillRule="evenodd" fill="#F3F6FA" d={WORDMARK_PATH} />
      </svg>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 84,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#F3F6FA",
          }}
        >
          <div style={{ display: "flex" }}>Every dealership is checked</div>
          <div style={{ display: "flex" }}>before it can list.</div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#AEB9C9" }}>
          No private sellers can list on Rynet.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          color: "#AEB9C9",
        }}
      >
        <div style={{ display: "flex" }}>Rynet</div>
        <div
          style={{
            display: "flex",
            padding: "14px 28px",
            borderRadius: 10,
            background: "#C81E2B",
            color: "#FFFFFF",
            fontWeight: 600,
          }}
        >
          rynet.co.za
        </div>
      </div>
    </div>,
    size,
  );
}
