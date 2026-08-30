import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon. Same mark, more room, so the sweep can carry more detail. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#001123",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 64 64" aria-hidden="true">
        <title>Rynet</title>
        <path
          d="M 10 44 A 24 24 0 0 1 32 10"
          fill="none"
          stroke="#B1B4BB"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 32 10 A 24 24 0 0 1 54 44"
          fill="none"
          stroke="#E32432"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="M 32 40 L 46 19" stroke="#E32432" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="42" r="4.5" fill="#B1B4BB" />
      </svg>
    </div>,
    size,
  );
}
