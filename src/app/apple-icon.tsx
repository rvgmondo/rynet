import { ImageResponse } from "next/og";

import { MARK_PATHS } from "@/components/brand/rynet-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon. The traced mark in its light version on navy, with room to breathe. */
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
      <svg width="124" height="109" viewBox="0 0 88 77.3" aria-hidden="true">
        <path fill="#B1B4BB" d={MARK_PATHS.gauge} />
        <path fill="#F3F6FA" d={MARK_PATHS.ink} />
        <path fill="#E32432" d={`${MARK_PATHS.redDash}${MARK_PATHS.needle}`} />
      </svg>
    </div>,
    size,
  );
}
