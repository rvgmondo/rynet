import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The favicon, generated rather than shipped.
 *
 * `brand/favicon.png` is 468 KB, roughly two hundred times what a favicon should weigh, so
 * it is not used. This draws the mark instead: the tachometer arc sweeping silver into red,
 * simplified to what actually survives at 32 pixels.
 *
 * Fixed hex rather than tokens on purpose. This renders outside the document, so there is
 * no stylesheet and no theme to read from, and a var() here would silently resolve to
 * nothing. These are the brand values from tokens.css, and if those change this changes with
 * them by hand.
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
        borderRadius: 6,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
        <title>Rynet</title>
        {/* The gauge sweep: silver through to brand red, the way a tacho runs. */}
        <path
          d="M 10 44 A 24 24 0 0 1 32 10"
          fill="none"
          stroke="#B1B4BB"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 32 10 A 24 24 0 0 1 54 44"
          fill="none"
          stroke="#E32432"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* The needle, resting near the top of the range. */}
        <path d="M 32 40 L 45 20" stroke="#E32432" strokeWidth="5" strokeLinecap="round" />
        <circle cx="32" cy="42" r="5" fill="#B1B4BB" />
      </svg>
    </div>,
    size,
  );
}
