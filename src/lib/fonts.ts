import { Archivo } from "next/font/google";

/**
 * The one family. Declared once and imported by every root layout (the marketplace, the agency
 * and the global 404), because each owns its own <html> and has to apply the variable itself.
 *
 * Archivo at normal width only. The width axis was the previous design's idea (expanded display
 * type) and is not requested any more, which keeps a second variable dimension out of every font
 * file. Weight stays variable: headings 700, card titles, prices and buttons 600, reading 400.
 *
 * Self-hosted and subset by next/font, with a metric-matched fallback so the swap does not shift
 * the layout. `preload` marks the face next/font considers worth preloading, and
 * src/lib/font-preload.ts reads that marker to write the link on dynamic routes too.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  preload: true,
});
