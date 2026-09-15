import { useId } from "react";

/**
 * The Rynet mark and lockup, drawn as vectors from brand/2.png and brand/rynet_logo_1.png.
 *
 * THE MARK is the navy R with its speed dashes, the gauge arc that runs from navy into brand
 * red, and the red needle. Every shape was traced from the 880px master and then rebuilt: the
 * gauge segments and the needle hub are true circular arcs fitted to the artwork, the straight
 * edges are straight, and only the bowl of the R is a smoothed curve. Rendered back at master
 * size it overlaps the raster by 98.9 percent.
 *
 * THE LOCKUP adds the red divider and the RYNET wordmark, which is geometry rather than type:
 * wide, square-shouldered capitals measured off the supplied lockup (98.2 percent overlap). It
 * does not depend on any font loading.
 *
 * Colour comes from tokens, so one drawing serves both themes and the navy footer:
 *   --rn-mark-ink       the R, the dashes and the start of the gauge (navy, or silver on dark)
 *   --rn-mark-mid-1/2   the two stops the gauge passes through on its way to red
 *   --rn-wordmark-ink   the wordmark
 * Brand red is fixed. Inside `.on-navy`, or with tone="on-navy", the light ink is forced.
 *
 * Decorative by default (aria-hidden), because it almost always sits inside a link that has its
 * own name. Pass `title` to make it a named image instead. The <title> is always present so the
 * drawing is never an unnamed image if the hidden state is ever removed.
 *
 * SMALL SIZES. Below about 48px the traced detail turns to noise: the six gauge segments break
 * into dots, the speed dashes and the thin needle vanish, and the mark reads as a smudge beside
 * the wordmark. `detail="compact"` (the lockup's default, since every lockup on the site is under
 * 32px tall) draws the same geometry for that size: the gauge segments get a stroke in their own
 * gradient that closes the gaps into one continuous arc, the needle is thickened, and the speed
 * dashes are dropped. The favicon and share card keep reading MARK_PATHS.
 *
 * If the owner supplies the original vector files, replace the path data below and keep the API.
 */

const GAUGE =
  "M0.8 25.9A45.8 45.8 0 0 1 19.6 6.7L19.8 11.6A51.9 51.9 0 0 0 0.8 25.9ZM22.2 5.2A46.7 46.7 0 0 1 46.8 0.1L42 8.1A42.3 42.3 0 0 0 22.4 10.4ZM50.1 0.5A45.8 45.8 0 0 1 65.3 4.8L57 12.6A37.5 37.5 0 0 0 45.2 8.6ZM68.2 6.2A39.2 39.2 0 0 1 80.2 16.2L67.8 21.2A34.8 34.8 0 0 0 59.8 14.2ZM82 18.9A30.9 30.9 0 0 1 87.5 31.6L73.2 31.4A24.1 24.1 0 0 0 69.7 23.9ZM74 34.1L87.8 34.2A34.9 34.9 0 0 1 61.4 70.5L56.6 64A26.4 26.4 0 0 0 74 34.1Z";
const NEEDLE = "M55 17.1L56 17.1L40.1 34.9A2.5 2.5 0 0 1 37 31.1Z";
const INK =
  "M8.8 26.6L39.4 26.6L36.6 28.6A5.3 5.3 0 0 0 34.4 35.2L6.5 35.2ZM49.6 26.9C49.9 27 50.6 27.1 51.4 27.2C52.1 27.4 53.5 27.9 54.4 28.1C55.2 28.4 55.7 28.7 56.4 29.1C57 29.4 57.7 29.8 58.5 30.4C59.2 30.9 60.2 31.9 60.8 32.5C61.3 33.2 61.6 33.6 62 34.2C62.3 34.9 62.6 35.5 62.9 36.1C63.1 36.8 63.3 37.3 63.5 38.1C63.6 39 63.8 40.2 63.9 41.4C63.9 42.5 63.8 43.8 63.5 45C63.3 46.3 62.7 47.8 62.4 48.6C62 49.5 61.8 49.8 61.5 50.4C61.1 50.9 60.9 51.3 60.2 52C59.6 52.8 58.5 54 57.5 54.8C56.6 55.5 55.8 56 54.8 56.5C53.8 57 52.7 57.5 51.5 57.8C50.4 58 48.5 58.2 48 58.4L61.5 77.2L48.5 77.2L35.8 59.9L25.1 60L21.4 74.8L10.8 74.8L16.9 50.8L44.6 50.8C45 50.7 45.9 50.6 46.5 50.4C47.2 50.1 48 49.7 48.5 49.5C49 49.2 49.2 49.1 49.5 48.8C49.9 48.4 50.4 48.1 50.8 47.5C51.1 47 51.7 46.3 52 45.5C52.2 44.8 52.4 44 52.5 43.2C52.5 42.5 52.4 41.7 52.1 41C51.9 40.4 51.6 39.7 51.1 39.1C50.7 38.6 50.2 38.1 49.6 37.6C49.1 37.2 48.5 36.9 47.9 36.5C47.2 36.2 46.4 36 45.5 35.8C44.7 35.5 43 35.4 42.5 35.4ZM11.6 42L18.9 42L17.2 48.5L9.9 48.5ZM4 51.5L8.4 51.5L7.2 56L3 56Z";
const RED_DASH = "M1.2 42.2L5.7 42.2L4.5 46.9L0.1 46.9Z";
/** The R and its top bar without the two small speed dashes, for the compact drawing. */
const INK_COMPACT = INK.slice(0, INK.indexOf("M11.6 42L"));
const WORDMARK =
  "M0 0H9.3A6.6 6.6 0 0 1 12.2 12.5L16.34 18.4H11.76L8.2 13.3H4.3V18.4H0ZM4.3 3.55V9.65H9.3A2.3 3.05 0 0 0 9.3 3.55ZM18.6 0H23.1L27.95 8.1L32.8 0H37L29.9 12.1V18.4H25.7V12.1ZM40.7 0H44.2L53.3 11.15V0H57.4V18.4H54L44.8 7.1V18.4H40.7ZM63.9 0H77.7V3.3H68V7.4H76.5V10.6H68V15H78V18.4H63.9ZM81.5 0H97.4V3.3H91.5V18.4H87.4V3.3H81.5Z";

/** The raw drawing, for places with no stylesheet (the generated favicon and share card). */
export const MARK_PATHS = { gauge: GAUGE, needle: NEEDLE, ink: INK, redDash: RED_DASH } as const;
export const WORDMARK_PATH = WORDMARK;

type Tone = "auto" | "on-navy";
type Detail = "full" | "compact";

function GaugeGradient({ id }: { id: string }) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1="12.25"
      y1="8.9"
      x2="80.34"
      y2="58.37"
    >
      <stop offset="0" style={{ stopColor: "var(--rn-mark-ink)" }} />
      <stop offset="0.22" style={{ stopColor: "var(--rn-mark-ink)" }} />
      <stop offset="0.5" style={{ stopColor: "var(--rn-mark-mid-1)" }} />
      <stop offset="0.7" style={{ stopColor: "var(--rn-mark-mid-2)" }} />
      <stop offset="0.86" style={{ stopColor: "#e32432" }} />
    </linearGradient>
  );
}

function MarkShapes({ gradientId, detail }: { gradientId: string; detail: Detail }) {
  if (detail === "compact") {
    return (
      <>
        <path
          fill={`url(#${gradientId})`}
          stroke={`url(#${gradientId})`}
          strokeWidth="2.6"
          strokeLinejoin="round"
          d={GAUGE}
        />
        <path style={{ fill: "var(--rn-mark-ink)" }} d={INK_COMPACT} />
        <path fill="#e32432" stroke="#e32432" strokeWidth="1.6" strokeLinejoin="round" d={NEEDLE} />
      </>
    );
  }
  return (
    <>
      <path fill={`url(#${gradientId})`} d={GAUGE} />
      <path style={{ fill: "var(--rn-mark-ink)" }} d={INK} />
      <path fill="#e32432" d={`${RED_DASH}${NEEDLE}`} />
    </>
  );
}

function toneClass(tone: Tone) {
  return tone === "on-navy" ? "rn-mark--on-navy" : "";
}

/** The R-and-gauge mark on its own. 88 by 77.3, so give it a height and `w-auto`. */
export function RynetMark({
  className = "",
  title,
  tone = "auto",
  detail = "full",
}: {
  className?: string;
  title?: string;
  tone?: Tone;
  /** "compact" for anything drawn under about 48px tall. */
  detail?: Detail;
}) {
  const gradientId = `rn-gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 88 77.3"
      className={`rn-mark ${toneClass(tone)} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? "Rynet"}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <title>{title ?? "Rynet"}</title>
      <defs>
        <GaugeGradient id={gradientId} />
      </defs>
      <MarkShapes gradientId={gradientId} detail={detail} />
    </svg>
  );
}

/**
 * Mark, red divider and wordmark. About 5.6 times as wide as it is tall: `h-7` is 157px wide,
 * `h-8` is 180px.
 */
export function RynetLockup({
  className = "",
  title,
  tone = "auto",
  detail = "compact",
}: {
  className?: string;
  title?: string;
  tone?: Tone;
  /** Compact by default: every lockup on the site is drawn under 32px tall. */
  detail?: Detail;
}) {
  const gradientId = `rn-gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="-30.6 -3.5 128.2 22.8"
      className={`rn-mark ${toneClass(tone)} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? "Rynet"}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <title>{title ?? "Rynet"}</title>
      <defs>
        <GaugeGradient id={gradientId} />
      </defs>
      <g transform="translate(-30.5 -3.4) scale(0.2898)">
        <MarkShapes gradientId={gradientId} detail={detail} />
      </g>
      <rect x="-2.9" y="0" width={detail === "compact" ? 1.1 : 0.8} height="18.4" fill="#e32432" />
      <path
        fillRule="evenodd"
        style={{ fill: "var(--rn-wordmark-ink, var(--rn-mark-ink))" }}
        d={WORDMARK}
      />
    </svg>
  );
}
