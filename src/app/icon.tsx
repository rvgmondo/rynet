import { ImageResponse } from "next/og";

import { MARK_PATHS } from "@/components/brand/rynet-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The favicon, generated rather than shipped.
 *
 * `brand/favicon.png` is 468 KB, roughly two hundred times what a favicon should weigh, so it is
 * not used. This draws the traced mark from src/components/brand/rynet-mark.tsx in its light
 * version on a navy tile: silver R and gauge, red needle and dash.
 *
 * Fixed hex rather than tokens on purpose. This renders outside the document, so there is no
 * stylesheet and no theme to read from. These are the brand values from tokens.css.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#001123",
        borderRadius: 7,
      }}
    >
      <svg width="26" height="23" viewBox="0 0 88 77.3" aria-hidden="true">
        <path fill="#B1B4BB" d={MARK_PATHS.gauge} />
        <path fill="#F3F6FA" d={MARK_PATHS.ink} />
        <path fill="#E32432" d={`${MARK_PATHS.redDash}${MARK_PATHS.needle}`} />
      </svg>
    </div>,
    size,
  );
}
